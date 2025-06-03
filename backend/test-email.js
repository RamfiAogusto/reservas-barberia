require('dotenv').config();
const emailService = require('./services/emailService');

async function testEmailSystem() {
  console.log('🧪 Iniciando prueba del sistema de emails...\n');

  // Datos de prueba para booking
  const testBookingData = {
    clientName: 'Juan Pérez',
    clientEmail: 'ramfiaogusto@gmail.com', // Tu email para recibir la prueba
    salonName: 'Barbería Elite',
    serviceName: 'Corte Clásico + Barba',
    date: 'viernes, 10 de enero de 2025',
    time: '14:30',
    price: 350,
    depositAmount: 100,
    salonAddress: 'Av. Principal 123, Col. Centro',
    salonPhone: '55 1234 5678',
    bookingId: 'TEST123456'
  };

  try {
    console.log('📧 Enviando email de confirmación de cita...');
    const confirmationResult = await emailService.sendBookingConfirmation(testBookingData);
    
    if (confirmationResult.success) {
      console.log('✅ Email de confirmación enviado exitosamente!');
      console.log('📨 Message ID:', confirmationResult.messageId);
    } else {
      console.log('❌ Error enviando email de confirmación:', confirmationResult.error);
    }

    console.log('\n📧 Enviando email de recordatorio...');
    const reminderResult = await emailService.sendBookingReminder(testBookingData);
    
    if (reminderResult.success) {
      console.log('✅ Email de recordatorio enviado exitosamente!');
      console.log('📨 Message ID:', reminderResult.messageId);
    } else {
      console.log('❌ Error enviando email de recordatorio:', reminderResult.error);
    }

    console.log('\n📧 Enviando email de cancelación...');
    const cancellationResult = await emailService.sendCancellationEmail(testBookingData);
    
    if (cancellationResult.success) {
      console.log('✅ Email de cancelación enviado exitosamente!');
      console.log('📨 Message ID:', cancellationResult.messageId);
    } else {
      console.log('❌ Error enviando email de cancelación:', cancellationResult.error);
    }

  } catch (error) {
    console.log('💥 Error general en las pruebas:', error.message);
  }

  console.log('\n🏁 Pruebas completadas!');
  console.log('📬 Revisa tu email (ramfiaogusto@gmail.com) para ver los resultados.');
}

// Ejecutar las pruebas
testEmailSystem(); 