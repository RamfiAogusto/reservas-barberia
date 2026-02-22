const { Resend } = require('resend');
const { formatTime12h } = require('../utils/timeUtils');

// Manejo seguro de la API key
const RESEND_API_KEY = process.env.RESEND_API_KEY;
const resend = RESEND_API_KEY ? new Resend(RESEND_API_KEY) : null;

class EmailService {
  constructor() {
    this.fromEmail = process.env.FROM_EMAIL || 'onboarding@resend.dev';
    this.isConfigured = !!RESEND_API_KEY;
    
    if (!this.isConfigured) {
      console.warn('⚠️ ADVERTENCIA: Resend API key no configurada. Los emails no se enviarán.');
      console.warn('💡 Para habilitar emails, configura RESEND_API_KEY en el archivo .env');
    }
  }

  // Método para verificar si el servicio está configurado
  checkConfiguration() {
    if (!this.isConfigured) {
      console.log('📧 Servicio de email no configurado - Email simulado');
      return false;
    }
    return true;
  }

  // Template para confirmación de cita
  generateBookingConfirmationTemplate(bookingData) {
    const { 
      clientName, 
      salonName, 
      serviceName, 
      services = [],
      totalDuration,
      barberName,
      date, 
      time, 
      price, 
      depositAmount, 
      salonAddress, 
      salonPhone, 
      bookingId 
    } = bookingData;
    const isMultiService = services.length > 1;
    const time12h = formatTime12h(time || '');

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Confirmación de Cita - ${salonName}</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #059669; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: white; padding: 30px; border: 1px solid #ddd; }
          .footer { background: #f8f9fa; padding: 20px; text-align: center; border-radius: 0 0 8px 8px; }
          .highlight { background: #f3f4f6; padding: 15px; border-radius: 6px; margin: 15px 0; }
          .salon-info { background: #e0f2fe; padding: 15px; border-radius: 6px; margin: 15px 0; border-left: 4px solid #0284c7; }
          .no-show-policy { background: #fef3c7; padding: 15px; border-radius: 6px; margin: 15px 0; border-left: 4px solid #f59e0b; }
          .important { background: #fee2e2; padding: 15px; border-radius: 6px; margin: 15px 0; border-left: 4px solid #dc2626; }
          .price { color: #059669; font-weight: bold; font-size: 1.1em; }
          ul { margin: 10px 0; padding-left: 20px; }
          li { margin: 5px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>✅ ¡Cita Confirmada!</h1>
            <h2>${salonName}</h2>
          </div>
          
          <div class="content">
            <p>Hola <strong>${clientName}</strong>,</p>
            
            <p>Tu cita ha sido confirmada exitosamente. Aquí están los detalles:</p>
            
            <div class="highlight">
              <h3>📅 Detalles de tu Cita</h3>
              ${isMultiService ? `
                <p><strong>Servicios:</strong></p>
                <ul>
                  ${services.map(s => `<li>${s.name} — $${s.price} (${s.duration} min)</li>`).join('')}
                </ul>
                <p><strong>Duración total:</strong> ${totalDuration} minutos</p>
              ` : `
                <p><strong>Servicio:</strong> ${serviceName}</p>
              `}
              ${barberName ? `<p><strong>Barbero:</strong> ${barberName}</p>` : ''}
              <p><strong>Fecha:</strong> ${date}</p>
              <p><strong>Hora:</strong> ${time12h}</p>
              <p><strong>ID de Reserva:</strong> ${bookingId}</p>
            </div>

            <div class="salon-info">
              <h3>🏪 Información del Salón</h3>
              <p><strong>Salón:</strong> ${salonName}</p>
              <p><strong>Dirección:</strong> ${salonAddress}</p>
              <p><strong>Teléfono:</strong> ${salonPhone}</p>
            </div>

            <div class="highlight">
              <h3>💰 Información de Pago</h3>
              ${isMultiService ? `
                <p><strong>Desglose:</strong></p>
                <ul>
                  ${services.map(s => `<li>${s.name}: $${s.price}</li>`).join('')}
                </ul>
                <p><strong>Total (se paga al llegar):</strong> <span class="price">$${price}</span></p>
              ` : `
                <p><strong>Precio del servicio (se paga al llegar):</strong> <span class="price">$${price}</span></p>
              `}
              ${depositAmount > 0 ? `
                <p><strong>Depósito para confirmar reserva:</strong> <span class="price">$${depositAmount}</span></p>
                <p><em>El depósito asegura tu cita. El precio completo del servicio se paga al recibir el servicio.</em></p>
              ` : ''}
            </div>

            <div class="no-show-policy">
              <h3>⚠️ Política de Inasistencia</h3>
              <p><strong>IMPORTANTE:</strong> Si no asistes a tu cita confirmada:</p>
              <ul>
                <li>El depósito pagado <strong>NO será reembolsado</strong></li>
                <li>Deberás pagar nuevamente para reservar otra cita</li>
                <li>Para cancelar, contacta al salón con al menos 24 horas de anticipación</li>
              </ul>
            </div>

            <div class="important">
              <h3>📞 ¿Necesitas cancelar o reprogramar?</h3>
              <p>Contacta directamente al salón:</p>
              <p><strong>Teléfono:</strong> ${salonPhone}</p>
              <p><strong>Con al menos 24 horas de anticipación</strong></p>
            </div>

            <p>¡Esperamos verte pronto!</p>
            <p>Equipo de ${salonName}</p>
          </div>
          
          <div class="footer">
            <p>Este email fue enviado automáticamente. Por favor no respondas a este correo.</p>
            <p>ReservaBarber - Sistema de Gestión de Citas</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  // Template para recordatorio de cita
  generateReminderTemplate(bookingData) {
    const { 
      clientName, 
      salonName, 
      serviceName, 
      date, 
      time, 
      salonAddress,
      salonPhone 
    } = bookingData;
    const time12h = formatTime12h(time || '');

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Recordatorio de Cita - ${salonName}</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #059669; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: white; padding: 30px; border: 1px solid #ddd; }
          .footer { background: #f8f9fa; padding: 20px; text-align: center; border-radius: 0 0 8px 8px; }
          .highlight { background: #f3f4f6; padding: 15px; border-radius: 6px; margin: 15px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>⏰ Recordatorio de Cita</h1>
            <h2>${salonName}</h2>
          </div>
          
          <div class="content">
            <p>Hola <strong>${clientName}</strong>,</p>
            
            <p>Te recordamos que tienes una cita programada para mañana:</p>
            
            <div class="highlight">
              <h3>📅 Detalles de tu Cita</h3>
              <p><strong>Servicio:</strong> ${serviceName}</p>
              <p><strong>Fecha:</strong> ${date}</p>
              <p><strong>Hora:</strong> ${time12h}</p>
              <p><strong>Lugar:</strong> ${salonAddress}</p>
            </div>

            <p><strong>¡Te esperamos puntual!</strong></p>
            
            <p>Si necesitas cancelar o reprogramar, por favor contactanos:</p>
            <p><strong>Teléfono:</strong> ${salonPhone}</p>
            
            <p>Saludos,<br>Equipo de ${salonName}</p>
          </div>
          
          <div class="footer">
            <p>ReservaBarber - Sistema de Gestión de Citas</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  // Enviar email de confirmación de cita
  async sendBookingConfirmation(bookingData) {
    try {
      // Verificar configuración
      if (!this.checkConfiguration()) {
        return { 
          success: true, 
          messageId: 'simulated-email-' + Date.now(),
          message: 'Email simulado - configuración no disponible'
        };
      }

      const emailContent = this.generateBookingConfirmationTemplate(bookingData);
      
      const result = await resend.emails.send({
        from: this.fromEmail,
        to: bookingData.clientEmail,
        subject: `✅ Cita Confirmada - ${bookingData.salonName} | ${bookingData.date} ${formatTime12h(bookingData.time || '')}`,
        html: emailContent
      });

      console.log('Email de confirmación enviado:', result);
      return { success: true, messageId: result.id };
    } catch (error) {
      console.error('Error enviando email de confirmación:', error);
      return { success: false, error: error.message };
    }
  }

  // Enviar recordatorio de cita
  async sendBookingReminder(bookingData) {
    try {
      // Verificar configuración
      if (!this.checkConfiguration()) {
        return { 
          success: true, 
          messageId: 'simulated-email-' + Date.now(),
          message: 'Email simulado - configuración no disponible'
        };
      }

      const emailContent = this.generateReminderTemplate(bookingData);
      
      const result = await resend.emails.send({
        from: this.fromEmail,
        to: bookingData.clientEmail,
        subject: `⏰ Recordatorio: Tu cita mañana en ${bookingData.salonName}`,
        html: emailContent
      });

      console.log('Email de recordatorio enviado:', result);
      return { success: true, messageId: result.id };
    } catch (error) {
      console.error('Error enviando recordatorio:', error);
      return { success: false, error: error.message };
    }
  }

  // Template para solicitud de reserva enviada (pendiente de confirmación)
  generateBookingRequestTemplate(bookingData) {
    const { 
      clientName, 
      salonName, 
      serviceName, 
      services = [],
      totalDuration,
      barberName,
      date, 
      time, 
      price, 
      depositAmount, 
      salonAddress, 
      salonPhone, 
      bookingId 
    } = bookingData;
    const isMultiService = services.length > 1;
    const time12h = formatTime12h(time || '');

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Solicitud de Reserva Enviada - ${salonName}</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #f59e0b; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: white; padding: 30px; border: 1px solid #ddd; }
          .footer { background: #f8f9fa; padding: 20px; text-align: center; border-radius: 0 0 8px 8px; }
          .highlight { background: #f3f4f6; padding: 15px; border-radius: 6px; margin: 15px 0; }
          .pending { background: #fef3c7; padding: 15px; border-radius: 6px; margin: 15px 0; border-left: 4px solid #f59e0b; }
          .salon-info { background: #e0f2fe; padding: 15px; border-radius: 6px; margin: 15px 0; border-left: 4px solid #0284c7; }
          .price { color: #059669; font-weight: bold; font-size: 1.1em; }
          .status { background: #fef2f2; padding: 15px; border-radius: 6px; margin: 15px 0; border-left: 4px solid #dc2626; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>📋 Solicitud Enviada</h1>
            <h2>${salonName}</h2>
          </div>
          
          <div class="content">
            <p>Hola <strong>${clientName}</strong>,</p>
            
            <p>Tu solicitud de reserva ha sido enviada exitosamente. Está siendo revisada por el salón.</p>
            
            <div class="highlight">
              <h3>📅 Detalles de tu Solicitud</h3>
              ${isMultiService ? `
                <p><strong>Servicios:</strong></p>
                <ul>
                  ${services.map(s => `<li>${s.name} — $${s.price} (${s.duration} min)</li>`).join('')}
                </ul>
                <p><strong>Duración total:</strong> ${totalDuration} minutos</p>
              ` : `
                <p><strong>Servicio:</strong> ${serviceName}</p>
              `}
              ${barberName ? `<p><strong>Barbero:</strong> ${barberName}</p>` : ''}
              <p><strong>Fecha:</strong> ${date}</p>
              <p><strong>Hora:</strong> ${time12h}</p>
              <p><strong>ID de Solicitud:</strong> ${bookingId}</p>
            </div>

            <div class="status">
              <h3>⏳ Estado: Pendiente de Confirmación</h3>
              <p><strong>Tu solicitud está siendo revisada por el salón.</strong></p>
              <p>Recibirás un email de confirmación una vez que el salón confirme tu cita.</p>
            </div>

            <div class="salon-info">
              <h3>🏪 Información del Salón</h3>
              <p><strong>Salón:</strong> ${salonName}</p>
              <p><strong>Dirección:</strong> ${salonAddress}</p>
              <p><strong>Teléfono:</strong> ${salonPhone}</p>
            </div>

            <div class="highlight">
              <h3>💰 Información de Pago</h3>
              ${isMultiService ? `
                <p><strong>Desglose:</strong></p>
                <ul>
                  ${services.map(s => `<li>${s.name}: $${s.price}</li>`).join('')}
                </ul>
                <p><strong>Total (se paga al llegar):</strong> <span class="price">$${price}</span></p>
              ` : `
                <p><strong>Precio del servicio (se paga al llegar):</strong> <span class="price">$${price}</span></p>
              `}
              ${depositAmount > 0 ? `
                <p><strong>Depósito para confirmar reserva:</strong> <span class="price">$${depositAmount}</span></p>
                <p><em>El depósito asegura tu cita. El precio completo del servicio se paga al recibir el servicio.</em></p>
              ` : `
                <p><strong>Pago:</strong> Al llegar al salón</p>
              `}
            </div>

            <div class="pending">
              <h3>📞 ¿Necesitas contactar al salón?</h3>
              <p>Si tienes alguna pregunta o necesitas hacer cambios:</p>
              <p><strong>Teléfono:</strong> ${salonPhone}</p>
              <p><em>El salón se pondrá en contacto contigo para confirmar tu cita.</em></p>
            </div>

            <p>¡Gracias por elegir ${salonName}!</p>
          </div>
          
          <div class="footer">
            <p>Este email fue enviado automáticamente. Por favor no respondas a este correo.</p>
            <p>ReservaBarber - Sistema de Gestión de Citas</p>
          </div>
        </div>
      </body>
    </html>
    `;
  }

  // Enviar email de solicitud de reserva (pendiente)
  async sendBookingRequest(bookingData) {
    try {
      // Verificar configuración
      if (!this.checkConfiguration()) {
        return { 
          success: true, 
          messageId: 'simulated-email-' + Date.now(),
          message: 'Email simulado - configuración no disponible'
        };
      }

      const emailContent = this.generateBookingRequestTemplate(bookingData);
      
      const result = await resend.emails.send({
        from: this.fromEmail,
        to: bookingData.clientEmail,
        subject: `📋 Solicitud Enviada - ${bookingData.salonName} | ${bookingData.date} ${formatTime12h(bookingData.time || '')}`,
        html: emailContent
      });

      console.log('Email de solicitud enviado:', result);
      return { success: true, messageId: result.id };
    } catch (error) {
      console.error('Error enviando email de solicitud:', error);
      return { success: false, error: error.message };
    }
  }

  // Template para notificación al dueño del negocio
  generateOwnerNotificationTemplate(bookingData) {
    const { 
      clientName, 
      clientEmail,
      clientPhone,
      salonName, 
      serviceName, 
      services = [],
      totalDuration,
      barberName,
      date, 
      time, 
      price, 
      depositAmount, 
      bookingId,
      notes
    } = bookingData;
    const isMultiService = services.length > 1;
    const time12h = formatTime12h(time || '');

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Nueva Reserva - ${salonName}</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #2563eb; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: white; padding: 30px; border: 1px solid #ddd; }
          .footer { background: #f8f9fa; padding: 20px; text-align: center; border-radius: 0 0 8px 8px; }
          .highlight { background: #f3f4f6; padding: 15px; border-radius: 6px; margin: 15px 0; }
          .client-info { background: #e0f2fe; padding: 15px; border-radius: 6px; margin: 15px 0; border-left: 4px solid #0284c7; }
          .appointment-details { background: #f0fdf4; padding: 15px; border-radius: 6px; margin: 15px 0; border-left: 4px solid #16a34a; }
          .price { color: #059669; font-weight: bold; font-size: 1.1em; }
          .urgent { background: #fef3c7; padding: 15px; border-radius: 6px; margin: 15px 0; border-left: 4px solid #f59e0b; }
          ul { margin: 10px 0; padding-left: 20px; }
          li { margin: 5px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>📅 ¡Nueva Reserva!</h1>
            <h2>${salonName}</h2>
          </div>
          
          <div class="content">
            <p>Hola,</p>
            
            <p>Has recibido una nueva reserva en tu negocio. Aquí están los detalles:</p>
            
            <div class="appointment-details">
              <h3>📅 Detalles de la Cita</h3>
              ${isMultiService ? `
                <p><strong>Servicios (${services.length}):</strong></p>
                <ul>
                  ${services.map(s => `<li>${s.name} — $${s.price} (${s.duration} min)</li>`).join('')}
                </ul>
                <p><strong>Duración total:</strong> ${totalDuration} minutos</p>
              ` : `
                <p><strong>Servicio:</strong> ${serviceName}</p>
              `}
              ${barberName ? `<p><strong>Barbero:</strong> ${barberName}</p>` : ''}
              <p><strong>Fecha:</strong> ${date}</p>
              <p><strong>Hora:</strong> ${time12h}</p>
              <p><strong>ID de Reserva:</strong> ${bookingId}</p>
              ${notes ? `<p><strong>Notas:</strong> ${notes}</p>` : ''}
            </div>

            <div class="client-info">
              <h3>👤 Información del Cliente</h3>
              <p><strong>Nombre:</strong> ${clientName}</p>
              <p><strong>Email:</strong> ${clientEmail}</p>
              <p><strong>Teléfono:</strong> ${clientPhone}</p>
            </div>

            <div class="highlight">
              <h3>💰 Información de Pago</h3>
              ${isMultiService ? `
                <p><strong>Desglose:</strong></p>
                <ul>
                  ${services.map(s => `<li>${s.name}: $${s.price}</li>`).join('')}
                </ul>
                <p><strong>Total (se paga al llegar):</strong> <span class="price">$${price}</span></p>
              ` : `
                <p><strong>Precio del servicio (se paga al llegar):</strong> <span class="price">$${price}</span></p>
              `}
              ${depositAmount > 0 ? `
                <p><strong>Depósito para confirmar reserva:</strong> <span class="price">$${depositAmount}</span></p>
                <p><em>El depósito asegura la cita. El cliente paga el precio completo del servicio al recibirlo.</em></p>
              ` : `
                <p><strong>Pago:</strong> Al llegar al salón</p>
              `}
            </div>

            <div class="urgent">
              <h3>⚠️ Acciones Recomendadas</h3>
              <ul>
                <li>Confirma la disponibilidad del horario</li>
                <li>Prepara el servicio solicitado</li>
                <li>Contacta al cliente si hay algún problema</li>
                <li>Actualiza el estado en tu dashboard</li>
              </ul>
            </div>

            <p><strong>¡Que tengas un excelente día de trabajo!</strong></p>
          </div>
          
          <div class="footer">
            <p>Este email fue enviado automáticamente por tu sistema de reservas.</p>
            <p>ReservaBarber - Sistema de Gestión de Citas</p>
          </div>
        </div>
      </body>
    </html>
    `;
  }

  // Enviar notificación al dueño del negocio
  async sendOwnerNotification(bookingData) {
    try {
      // Verificar configuración
      if (!this.checkConfiguration()) {
        return { 
          success: true, 
          messageId: 'simulated-email-' + Date.now(),
          message: 'Email simulado - configuración no disponible'
        };
      }

      const emailContent = this.generateOwnerNotificationTemplate(bookingData);
      
      const result = await resend.emails.send({
        from: this.fromEmail,
        to: bookingData.ownerEmail,
        subject: `📅 Nueva Reserva - ${bookingData.salonName} | ${bookingData.date} ${formatTime12h(bookingData.time || '')}`,
        html: emailContent
      });

      console.log('Email de notificación al dueño enviado:', result);
      return { success: true, messageId: result.id };
    } catch (error) {
      console.error('Error enviando notificación al dueño:', error);
      return { success: false, error: error.message };
    }
  }

  // Template para modificación de reserva
  generateBookingModificationTemplate(bookingData) {
    const { 
      clientName, 
      salonName, 
      serviceName, 
      date, 
      time, 
      price, 
      depositAmount, 
      salonAddress, 
      salonPhone, 
      bookingId,
      changes,
      oldDate,
      oldTime
    } = bookingData;
    const time12h = formatTime12h(time || '');

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Reserva Modificada - ${salonName}</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #7c3aed; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: white; padding: 30px; border: 1px solid #ddd; }
          .footer { background: #f8f9fa; padding: 20px; text-align: center; border-radius: 0 0 8px 8px; }
          .highlight { background: #f3f4f6; padding: 15px; border-radius: 6px; margin: 15px 0; }
          .changes { background: #fef3c7; padding: 15px; border-radius: 6px; margin: 15px 0; border-left: 4px solid #f59e0b; }
          .current { background: #f0fdf4; padding: 15px; border-radius: 6px; margin: 15px 0; border-left: 4px solid #16a34a; }
          .salon-info { background: #e0f2fe; padding: 15px; border-radius: 6px; margin: 15px 0; border-left: 4px solid #0284c7; }
          .price { color: #059669; font-weight: bold; font-size: 1.1em; }
          .old { text-decoration: line-through; color: #6b7280; }
          .new { color: #059669; font-weight: bold; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>✏️ Reserva Modificada</h1>
            <h2>${salonName}</h2>
          </div>
          
          <div class="content">
            <p>Hola <strong>${clientName}</strong>,</p>
            
            <p>Tu reserva ha sido modificada por el salón. Aquí están los cambios realizados:</p>
            
            <div class="changes">
              <h3>🔄 Cambios Realizados</h3>
              ${changes.map(change => `<p><strong>${change.field}:</strong> <span class="old">${change.old}</span> → <span class="new">${change.new}</span></p>`).join('')}
            </div>

            <div class="current">
              <h3>📅 Detalles Actualizados de tu Cita</h3>
              <p><strong>Servicio:</strong> ${serviceName}</p>
              <p><strong>Fecha:</strong> ${date}</p>
              <p><strong>Hora:</strong> ${time12h}</p>
              <p><strong>ID de Reserva:</strong> ${bookingId}</p>
            </div>

            <div class="salon-info">
              <h3>🏪 Información del Salón</h3>
              <p><strong>Salón:</strong> ${salonName}</p>
              <p><strong>Dirección:</strong> ${salonAddress}</p>
              <p><strong>Teléfono:</strong> ${salonPhone}</p>
            </div>

            <div class="highlight">
              <h3>💰 Información de Pago</h3>
              <p><strong>Precio del servicio (se paga al llegar):</strong> <span class="price">$${price}</span></p>
              ${depositAmount > 0 ? `
                <p><strong>Depósito para confirmar reserva:</strong> <span class="price">$${depositAmount}</span></p>
                <p><em>El depósito asegura tu cita. El precio completo del servicio se paga al recibir el servicio.</em></p>
              ` : `
                <p><strong>Pago:</strong> Al llegar al salón</p>
              `}
            </div>

            <div class="changes">
              <h3>📞 ¿Tienes alguna pregunta?</h3>
              <p>Si los cambios no te funcionan o necesitas hacer ajustes:</p>
              <p><strong>Teléfono:</strong> ${salonPhone}</p>
              <p><em>Contacta al salón lo antes posible para coordinar.</em></p>
            </div>

            <p>¡Esperamos verte pronto!</p>
            <p>Equipo de ${salonName}</p>
          </div>
          
          <div class="footer">
            <p>Este email fue enviado automáticamente. Por favor no respondas a este correo.</p>
            <p>ReservaBarber - Sistema de Gestión de Citas</p>
          </div>
        </div>
      </body>
    </html>
    `;
  }

  // Enviar email de modificación de reserva
  async sendBookingModification(bookingData) {
    try {
      // Verificar configuración
      if (!this.checkConfiguration()) {
        return { 
          success: true, 
          messageId: 'simulated-email-' + Date.now(),
          message: 'Email simulado - configuración no disponible'
        };
      }

      const emailContent = this.generateBookingModificationTemplate(bookingData);
      
      const result = await resend.emails.send({
        from: this.fromEmail,
        to: bookingData.clientEmail,
        subject: `✏️ Reserva Modificada - ${bookingData.salonName} | ${bookingData.date} ${formatTime12h(bookingData.time || '')}`,
        html: emailContent
      });

      console.log('Email de modificación enviado:', result);
      return { success: true, messageId: result.id };
    } catch (error) {
      console.error('Error enviando email de modificación:', error);
      return { success: false, error: error.message };
    }
  }

  // Enviar email de cancelación
  async sendCancellationEmail(bookingData) {
    try {
      // Verificar configuración
      if (!this.checkConfiguration()) {
        return { 
          success: true, 
          messageId: 'simulated-email-' + Date.now(),
          message: 'Email simulado - configuración no disponible'
        };
      }

      const emailContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <title>Cita Cancelada - ${bookingData.salonName}</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
          <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: #dc2626; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
              <h1>Cita Cancelada</h1>
              <h2>${bookingData.salonName}</h2>
            </div>
            
            <div style="background: white; padding: 30px; border: 1px solid #ddd; border-radius: 0 0 8px 8px;">
              <p>Hola <strong>${bookingData.clientName}</strong>,</p>
              
              <p>Tu cita ha sido cancelada:</p>
              
              <div style="background: #f3f4f6; padding: 15px; border-radius: 6px; margin: 15px 0;">
                <p><strong>Servicio:</strong> ${bookingData.serviceName}</p>
                <p><strong>Fecha:</strong> ${bookingData.date}</p>
                <p><strong>Hora:</strong> ${formatTime12h(bookingData.time || '')}</p>
              </div>

              <p>Para más información, contacta al salón:</p>
              <p><strong>Teléfono:</strong> ${bookingData.salonPhone}</p>
              
              <p>Saludos,<br>Equipo de ${bookingData.salonName}</p>
            </div>
          </div>
        </body>
        </html>
      `;
      
      const result = await resend.emails.send({
        from: this.fromEmail,
        to: bookingData.clientEmail,
        subject: `❌ Cita Cancelada - ${bookingData.salonName}`,
        html: emailContent
      });

      console.log('Email de cancelación enviado:', result);
      return { success: true, messageId: result.id };
    } catch (error) {
      console.error('Error enviando email de cancelación:', error);
      return { success: false, error: error.message };
    }
  }

  // === EMAILS DEL SISTEMA DE PAGO ONLINE ===

  // Template: Se requiere pago para confirmar la reserva
  generatePaymentRequiredTemplate(bookingData) {
    const {
      clientName,
      salonName,
      serviceName,
      services = [],
      totalDuration,
      barberName,
      date,
      time,
      price,
      holdMinutes,
      depositAmount,
      paymentUrl,
      paymentToken,
      salonAddress,
      salonPhone,
      bookingId
    } = bookingData;
    const isMultiService = services.length > 1;
    const time12h = formatTime12h(time || '');
    const displayDeposit = depositAmount || price;

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Pago Requerido - ${salonName}</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #dc2626; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: white; padding: 30px; border: 1px solid #ddd; }
          .footer { background: #f8f9fa; padding: 20px; text-align: center; border-radius: 0 0 8px 8px; }
          .highlight { background: #f3f4f6; padding: 15px; border-radius: 6px; margin: 15px 0; }
          .urgent { background: #fef2f2; padding: 15px; border-radius: 6px; margin: 15px 0; border-left: 4px solid #dc2626; }
          .timer { background: #fef3c7; padding: 20px; border-radius: 6px; margin: 15px 0; border-left: 4px solid #f59e0b; text-align: center; }
          .price { color: #059669; font-weight: bold; font-size: 1.3em; }
          .btn { display: inline-block; background: #059669; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 1.1em; }
          ul { margin: 10px 0; padding-left: 20px; }
          li { margin: 5px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>💳 Pago Requerido</h1>
            <h2>${salonName}</h2>
          </div>
          
          <div class="content">
            <p>Hola <strong>${clientName}</strong>,</p>
            
            <p>El salón ha revisado tu solicitud de reserva y requiere que realices el pago para <strong>confirmar tu cita</strong>.</p>

            <div class="timer">
              <h3>⏰ ¡Tienes ${holdMinutes} minutos para pagar!</h3>
              <p>Tu horario está reservado temporalmente. Si no completas el pago a tiempo, la reserva será liberada y otra persona podrá tomar ese horario.</p>
            </div>
            
            <div class="highlight">
              <h3>📅 Detalles de tu Reserva</h3>
              ${isMultiService ? `
                <p><strong>Servicios:</strong></p>
                <ul>
                  ${services.map(s => '<li>' + s.name + ' — $' + s.price + ' (' + s.duration + ' min)</li>').join('')}
                </ul>
                <p><strong>Duración total:</strong> ${totalDuration} minutos</p>
              ` : `
                <p><strong>Servicio:</strong> ${serviceName}</p>
              `}
              ${barberName ? '<p><strong>Barbero:</strong> ' + barberName + '</p>' : ''}
              <p><strong>Fecha:</strong> ${date}</p>
              <p><strong>Hora:</strong> ${time12h}</p>
              <p><strong>ID de Reserva:</strong> ${bookingId}</p>
            </div>

            <div class="highlight" style="text-align: center;">
              <h3>💰 Depósito para Confirmar</h3>
              <p class="price">$${displayDeposit}</p>
              ${price > displayDeposit ? '<p style="color: #6b7280; font-size: 0.9em;">El resto ($' + (price - displayDeposit).toFixed(2) + ') se paga al llegar al salón</p>' : ''}
              <br>
              ${paymentUrl 
                ? '<a href="' + paymentUrl + '" class="btn">Pagar Depósito Ahora</a><br><br><p style="font-size: 0.85em; color: #6b7280;">O copia este enlace: ' + paymentUrl + '</p>'
                : (paymentToken
                  ? '<a href="' + (process.env.FRONTEND_URL || 'http://localhost:3000') + '/pay/' + paymentToken + '" class="btn">Pagar Depósito Ahora</a>'
                  : '<p><em>Contacta al salón para coordinar el pago.</em></p>')
              }
            </div>

            <div class="urgent">
              <h3>⚠️ Importante</h3>
              <ul>
                <li>Tu horario está <strong>reservado temporalmente</strong> por ${holdMinutes} minutos</li>
                <li>Si no realizas el pago a tiempo, <strong>la reserva será cancelada automáticamente</strong></li>
                <li>El horario quedará disponible para otros clientes</li>
              </ul>
            </div>

            <div class="highlight">
              <h3>📞 ¿Necesitas ayuda?</h3>
              <p>Contacta directamente al salón:</p>
              <p><strong>Teléfono:</strong> ${salonPhone}</p>
              <p><strong>Dirección:</strong> ${salonAddress}</p>
            </div>

            <p>¡Esperamos tu pago para confirmar tu cita!</p>
            <p>Equipo de ${salonName}</p>
          </div>
          
          <div class="footer">
            <p>Este email fue enviado automáticamente. Por favor no respondas a este correo.</p>
            <p>ReservaBarber - Sistema de Gestión de Citas</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  // Enviar email de pago requerido
  async sendPaymentRequired(bookingData) {
    try {
      if (!this.checkConfiguration()) {
        return {
          success: true,
          messageId: 'simulated-email-' + Date.now(),
          message: 'Email simulado - configuración no disponible'
        };
      }

      const emailContent = this.generatePaymentRequiredTemplate(bookingData);

      const result = await resend.emails.send({
        from: this.fromEmail,
        to: bookingData.clientEmail,
        subject: `💳 Pago Requerido - ${bookingData.salonName} | Tienes ${bookingData.holdMinutes} min para confirmar`,
        html: emailContent
      });

      console.log('Email de pago requerido enviado:', result);
      return { success: true, messageId: result.id };
    } catch (error) {
      console.error('Error enviando email de pago requerido:', error);
      return { success: false, error: error.message };
    }
  }

  // Template: Reserva expirada (no se pagó a tiempo)
  generateHoldExpiredTemplate(bookingData) {
    const {
      clientName,
      salonName,
      serviceName,
      date,
      time,
      price,
      salonPhone,
      salonAddress,
      bookingId
    } = bookingData;
    const time12h = formatTime12h(time || '');

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Reserva Expirada - ${salonName}</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #6b7280; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: white; padding: 30px; border: 1px solid #ddd; }
          .footer { background: #f8f9fa; padding: 20px; text-align: center; border-radius: 0 0 8px 8px; }
          .highlight { background: #f3f4f6; padding: 15px; border-radius: 6px; margin: 15px 0; }
          .expired { background: #fef2f2; padding: 15px; border-radius: 6px; margin: 15px 0; border-left: 4px solid #dc2626; }
          .retry { background: #f0fdf4; padding: 15px; border-radius: 6px; margin: 15px 0; border-left: 4px solid #16a34a; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>⏰ Reserva Expirada</h1>
            <h2>${salonName}</h2>
          </div>
          
          <div class="content">
            <p>Hola <strong>${clientName}</strong>,</p>
            
            <p>Lamentamos informarte que tu reserva ha expirado porque no se completó el pago dentro del tiempo establecido.</p>

            <div class="expired">
              <h3>❌ Reserva No Confirmada</h3>
              <p><strong>Servicio:</strong> ${serviceName}</p>
              <p><strong>Fecha:</strong> ${date}</p>
              <p><strong>Hora:</strong> ${time12h}</p>
              <p><strong>Monto:</strong> $${price}</p>
              <p><strong>ID:</strong> ${bookingId}</p>
              <p><em>El horario ha sido liberado y ya está disponible para otros clientes.</em></p>
            </div>

            <div class="retry">
              <h3>🔄 ¿Todavía quieres reservar?</h3>
              <p>Puedes realizar una nueva reserva visitando la página del salón. Si el horario sigue disponible, podrás reservarlo nuevamente.</p>
            </div>

            <div class="highlight">
              <h3>📞 Contacto</h3>
              <p><strong>Salón:</strong> ${salonName}</p>
              <p><strong>Teléfono:</strong> ${salonPhone}</p>
              <p><strong>Dirección:</strong> ${salonAddress}</p>
            </div>

            <p>Disculpa las molestias.</p>
            <p>Equipo de ${salonName}</p>
          </div>
          
          <div class="footer">
            <p>ReservaBarber - Sistema de Gestión de Citas</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  // Enviar email de reserva expirada
  async sendHoldExpired(bookingData) {
    try {
      if (!this.checkConfiguration()) {
        return {
          success: true,
          messageId: 'simulated-email-' + Date.now(),
          message: 'Email simulado - configuración no disponible'
        };
      }

      const emailContent = this.generateHoldExpiredTemplate(bookingData);

      const result = await resend.emails.send({
        from: this.fromEmail,
        to: bookingData.clientEmail,
        subject: `⏰ Reserva Expirada - ${bookingData.salonName} | Pago no completado`,
        html: emailContent
      });

      console.log('Email de reserva expirada enviado:', result);
      return { success: true, messageId: result.id };
    } catch (error) {
      console.error('Error enviando email de reserva expirada:', error);
      return { success: false, error: error.message };
    }
  }

  // Template: Reserva rechazada por el salón
  generateBookingRejectionTemplate(bookingData) {
    const {
      clientName,
      salonName,
      serviceName,
      date,
      time,
      price,
      salonPhone,
      salonAddress,
      bookingId
    } = bookingData;
    const time12h = formatTime12h(time || '');

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Reserva No Aprobada - ${salonName}</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #dc2626; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: white; padding: 30px; border: 1px solid #ddd; }
          .footer { background: #f8f9fa; padding: 20px; text-align: center; border-radius: 0 0 8px 8px; }
          .highlight { background: #f3f4f6; padding: 15px; border-radius: 6px; margin: 15px 0; }
          .rejected { background: #fef2f2; padding: 15px; border-radius: 6px; margin: 15px 0; border-left: 4px solid #dc2626; }
          .retry { background: #f0fdf4; padding: 15px; border-radius: 6px; margin: 15px 0; border-left: 4px solid #16a34a; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>❌ Reserva No Aprobada</h1>
            <h2>${salonName}</h2>
          </div>
          
          <div class="content">
            <p>Hola <strong>${clientName}</strong>,</p>
            
            <p>Lamentamos informarte que tu solicitud de reserva no fue aprobada por el salón.</p>

            <div class="rejected">
              <h3>Detalles de la Reserva</h3>
              <p><strong>Servicio:</strong> ${serviceName}</p>
              <p><strong>Fecha:</strong> ${date}</p>
              <p><strong>Hora:</strong> ${time12h}</p>
              <p><strong>ID:</strong> ${bookingId}</p>
            </div>

            <div class="retry">
              <h3>🔄 ¿Quieres intentar otro horario?</h3>
              <p>Puedes realizar una nueva reserva visitando la página del salón y seleccionando otro horario disponible.</p>
            </div>

            <div class="highlight">
              <h3>📞 ¿Tienes preguntas?</h3>
              <p><strong>Teléfono:</strong> ${salonPhone}</p>
              <p><strong>Dirección:</strong> ${salonAddress}</p>
            </div>

            <p>Disculpa las molestias.</p>
            <p>Equipo de ${salonName}</p>
          </div>
          
          <div class="footer">
            <p>ReservaBarber - Sistema de Gestión de Citas</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  // Enviar email de rechazo de reserva
  async sendBookingRejection(bookingData) {
    try {
      if (!this.checkConfiguration()) {
        return {
          success: true,
          messageId: 'simulated-email-' + Date.now(),
          message: 'Email simulado - configuración no disponible'
        };
      }

      const emailContent = this.generateBookingRejectionTemplate(bookingData);

      const result = await resend.emails.send({
        from: this.fromEmail,
        to: bookingData.clientEmail,
        subject: `❌ Reserva No Aprobada - ${bookingData.salonName}`,
        html: emailContent
      });

      console.log('Email de rechazo enviado:', result);
      return { success: true, messageId: result.id };
    } catch (error) {
      console.error('Error enviando email de rechazo:', error);
      return { success: false, error: error.message };
    }
  }
}

module.exports = new EmailService(); 