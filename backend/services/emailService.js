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

  // Template para solicitud de reserva enviada (pendiente de confirmación)
  generateBookingRequestTemplate(bookingData) {
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
              <p><strong>Servicio:</strong> ${serviceName}</p>
              <p><strong>Fecha:</strong> ${date}</p>
              <p><strong>Hora:</strong> ${time}</p>
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
              <p><strong>Precio Total:</strong> <span class="price">$${price}</span></p>
              ${depositAmount > 0 ? `
                <p><strong>Depósito Requerido:</strong> <span class="price">$${depositAmount}</span></p>
                <p><strong>Saldo Pendiente:</strong> <span class="price">$${price - depositAmount}</span></p>
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
        subject: `📋 Solicitud Enviada - ${bookingData.salonName} | ${bookingData.date} ${bookingData.time}`,
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
      date, 
      time, 
      price, 
      depositAmount, 
      bookingId,
      notes
    } = bookingData;

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
              <p><strong>Servicio:</strong> ${serviceName}</p>
              <p><strong>Fecha:</strong> ${date}</p>
              <p><strong>Hora:</strong> ${time}</p>
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
              <p><strong>Precio Total:</strong> <span class="price">$${price}</span></p>
              ${depositAmount > 0 ? `
                <p><strong>Depósito Requerido:</strong> <span class="price">$${depositAmount}</span></p>
                <p><strong>Saldo Pendiente:</strong> <span class="price">$${price - depositAmount}</span></p>
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
        subject: `📅 Nueva Reserva - ${bookingData.salonName} | ${bookingData.date} ${bookingData.time}`,
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
                <p><strong>Depósito Requerido:</strong> <span class="price">$${depositAmount}</span></p>
                <p><strong>Saldo Pendiente:</strong> <span class="price">$${price - depositAmount}</span></p>
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
        subject: `✏️ Reserva Modificada - ${bookingData.salonName} | ${bookingData.date} ${bookingData.time}`,
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