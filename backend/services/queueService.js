const { Queue, Worker } = require('bullmq');
const Redis = require('ioredis');
const emailService = require('./emailService');
const { prisma } = require('../lib/prisma');
const { format } = require('date-fns');
const { es } = require('date-fns/locale');

// Configuración de Redis
const redisConfig = {
  host: process.env.REDIS_HOST || 'localhost',
  port: process.env.REDIS_PORT || 6379,
  password: process.env.REDIS_PASSWORD || undefined,
  retryDelayOnFailure: 1000,
  maxRetriesPerRequest: 1, // Reducir reintentos para evitar spam
  lazyConnect: true,
  enableReadyCheck: false,
  maxRetriesPerRequest: null, // Desactivar reintentos automáticos
  retryConnectOnFailure: false // No reconectar automáticamente
};

let connection;
let reminderQueue;
let worker;

class QueueService {
  constructor() {
    this.isInitialized = false;
    this.isRedisAvailable = false;
    this.errorShown = false;
  }

  async initialize() {
    try {
      console.log('🚀 Inicializando sistema de colas...');
      
      // Probar conexión a Redis de forma más silenciosa
      connection = new Redis(redisConfig);
      
      // Agregar manejo de errores silencioso
      connection.on('error', (err) => {
        // Solo mostrar el primer error, luego silenciar
        if (!this.errorShown) {
          console.warn('⚠️ No se pudo conectar a Redis. Los recordatorios automáticos no funcionarán.');
          console.warn('💡 Para habilitar recordatorios, instala Redis: https://redis.io/docs/getting-started/');
          this.errorShown = true;
        }
        // Silenciar errores adicionales
      });

      // Intentar ping con timeout
      const pingPromise = connection.ping();
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Timeout')), 2000)
      );

      await Promise.race([pingPromise, timeoutPromise]);
      
      this.isRedisAvailable = true;
      console.log('✅ Conectado a Redis');

      // Crear la cola de recordatorios
      reminderQueue = new Queue('appointment-reminders', { connection });
      console.log('✅ Cola de recordatorios creada');

      // Crear el worker para procesar los jobs
      worker = new Worker('appointment-reminders', this.processReminderJob, { connection });

      // Event listeners para el worker
      worker.on('completed', (job) => {
        console.log(`✅ Recordatorio enviado exitosamente: ${job.id}`);
      });

      worker.on('failed', (job, err) => {
        console.error(`❌ Error en recordatorio ${job.id}:`, err.message);
      });

      this.isInitialized = true;
      console.log('🎉 Sistema de colas inicializado exitosamente');

    } catch (error) {
      if (!this.errorShown) {
        console.warn('⚠️ No se pudo conectar a Redis. Los recordatorios automáticos no funcionarán.');
        console.warn('💡 Para habilitar recordatorios, instala Redis: https://redis.io/docs/getting-started/');
        this.errorShown = true;
      }
      this.isRedisAvailable = false;
      
      // Cerrar conexión para evitar más errores
      if (connection) {
        connection.disconnect();
      }
    }
  }

  // Procesar job de recordatorio
  async processReminderJob(job) {
    const { appointmentId, clientEmail, clientName } = job.data;

    try {
      console.log(`📧 Procesando recordatorio para cita: ${appointmentId}`);

      // Buscar la cita en la base de datos
      const appointment = await prisma.appointment.findUnique({
        where: { id: appointmentId },
        include: {
          service: {
            select: {
              name: true,
              duration: true,
              price: true
            }
          },
          user: {
            select: {
              salonName: true,
              username: true,
              address: true,
              phone: true
            }
          }
        }
      });

      if (!appointment) {
        console.log(`⚠️ Cita ${appointmentId} no encontrada`);
        return;
      }

      // Verificar que la cita no esté cancelada
      if (appointment.status === 'CANCELADA') {
        console.log(`⚠️ Cita ${appointmentId} está cancelada, no se envía recordatorio`);
        return;
      }

      // Verificar que no se haya enviado ya el recordatorio
      if (appointment.reminderSent) {
        console.log(`⚠️ Recordatorio ya enviado para cita ${appointmentId}`);
        return;
      }

      // Preparar datos para el email
      // El recordatorio se envía 2 horas antes de la cita (ver scheduleReminder más abajo),
      // por lo que el texto debe reflejar "hoy"/"en 2 horas" y no asumir "mañana".
      const salonOwner = appointment.user;
      const bookingData = {
        clientName: appointment.clientName,
        clientEmail: appointment.clientEmail,
        salonName: salonOwner.salonName || salonOwner.username,
        serviceName: appointment.service.name,
        date: format(appointment.date, 'PPP', { locale: es }),
        time: appointment.time,
        salonAddress: salonOwner.address || 'Dirección no especificada',
        salonPhone: salonOwner.phone || 'Teléfono no especificado',
        timeframeLabel: 'en 2 horas'
      };

      // Enviar el recordatorio
      const result = await emailService.sendBookingReminder(bookingData);

      if (result.success) {
        // Marcar como enviado en la base de datos
        await prisma.appointment.update({
          where: { id: appointmentId },
          data: { reminderSent: true }
        });
        
        console.log(`✅ Recordatorio enviado exitosamente para ${clientName} (${clientEmail})`);
      } else {
        console.error(`❌ Error enviando recordatorio:`, result.error);
        throw new Error(`Error enviando email: ${result.error}`);
      }

    } catch (error) {
      console.error(`❌ Error procesando recordatorio para cita ${appointmentId}:`, error);
      throw error;
    }
  }

  // Programar recordatorio para una cita
  async scheduleReminder(appointmentData) {
    if (!this.isRedisAvailable) {
      console.log('⚠️ Redis no disponible. Recordatorio no programado.');
      return { success: false, message: 'Redis no disponible' };
    }

    try {
      const { appointmentId, appointmentDate, appointmentTime, clientEmail, clientName } = appointmentData;

      // Calcular cuándo enviar el recordatorio (2 horas antes)
      const appointmentDateTime = new Date(appointmentDate);
      const [hours, minutes] = appointmentTime.split(':');
      appointmentDateTime.setHours(parseInt(hours), parseInt(minutes), 0, 0);

      // Restar 2 horas para el recordatorio
      const reminderTime = new Date(appointmentDateTime.getTime() - (2 * 60 * 60 * 1000));
      
      // Verificar que el recordatorio sea en el futuro
      const now = new Date();
      if (reminderTime <= now) {
        console.log(`⚠️ La cita es muy pronto, no se programa recordatorio para ${appointmentId}`);
        return { success: false, message: 'Cita muy próxima para recordatorio' };
      }

      // Crear el job con delay
      const delay = reminderTime.getTime() - now.getTime();
      
      const job = await reminderQueue.add(
        'send-reminder',
        {
          appointmentId,
          clientEmail,
          clientName,
          appointmentDateTime: appointmentDateTime.toISOString(),
          reminderTime: reminderTime.toISOString()
        },
        {
          delay,
          jobId: `reminder-${appointmentId}`, // ID único para evitar duplicados
          removeOnComplete: 10, // Mantener solo los últimos 10 jobs completados
          removeOnFail: 10 // Mantener solo los últimos 10 jobs fallidos
        }
      );

      console.log(`📅 Recordatorio programado para ${clientName}:`);
      console.log(`   Cita: ${appointmentDateTime.toLocaleString('es-ES')}`);
      console.log(`   Recordatorio: ${reminderTime.toLocaleString('es-ES')}`);
      console.log(`   Job ID: ${job.id}`);

      return { 
        success: true, 
        jobId: job.id,
        reminderTime: reminderTime.toISOString()
      };

    } catch (error) {
      console.error('❌ Error programando recordatorio:', error);
      return { success: false, error: error.message };
    }
  }

  // Cancelar recordatorio para una cita
  async cancelReminder(appointmentId) {
    if (!this.isRedisAvailable) {
      return { success: false, message: 'Redis no disponible' };
    }

    try {
      const jobId = `reminder-${appointmentId}`;
      const job = await reminderQueue.getJob(jobId);
      
      if (job) {
        await job.remove();
        console.log(`🗑️ Recordatorio cancelado para cita: ${appointmentId}`);
        return { success: true };
      } else {
        console.log(`⚠️ No se encontró recordatorio para cita: ${appointmentId}`);
        return { success: false, message: 'Recordatorio no encontrado' };
      }

    } catch (error) {
      console.error('❌ Error cancelando recordatorio:', error);
      return { success: false, error: error.message };
    }
  }

  // Verificar estado del sistema
  getStatus() {
    return {
      initialized: this.isInitialized,
      redisAvailable: this.isRedisAvailable,
      queueActive: !!reminderQueue,
      workerActive: !!worker && !worker.closing
    };
  }

  // Cerrar conexiones
  async close() {
    if (worker) {
      await worker.close();
    }
    if (connection) {
      await connection.quit();
    }
    console.log('🔌 Sistema de colas cerrado');
  }
}

module.exports = new QueueService(); 