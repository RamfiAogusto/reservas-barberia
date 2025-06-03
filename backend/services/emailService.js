const { Resend } = require('resend');

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
      date, 
      time, 
      price, 
      depositAmount, 
      salonAddress, 
      salonPhone, 
      bookingId 
    } = bookingData;

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
              <p><strong>Servicio:</strong> ${serviceName}</p>
              <p><strong>Fecha:</strong> ${date}</p>
              <p><strong>Hora:</strong> ${time}</p>
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
              <p><strong>Precio Total:</strong> <span class="price">$${price}</span></p>
              ${depositAmount > 0 ? `
                <p><strong>Depósito Pagado:</strong> <span class="price">$${depositAmount}</span></p>
                <p><strong>Saldo Pendiente:</strong> <span class="price">$${price - depositAmount}</span></p>
                <p><em>Paga el saldo restante al llegar al salón.</em></p>
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
              <p><strong>Hora:</strong> ${time}</p>
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
        subject: `✅ Cita Confirmada - ${bookingData.salonName} | ${bookingData.date} ${bookingData.time}`,
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
                <p><strong>Hora:</strong> ${bookingData.time}</p>
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
}

module.exports = new EmailService(); 