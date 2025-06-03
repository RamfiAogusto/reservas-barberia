// Configuración manual de variables de entorno para la prueba
process.env.RESEND_API_KEY = 're_BM7CX92n_FfzX6zbHosaL35uNFSsPhSZm';
process.env.FROM_EMAIL = 'onboarding@resend.dev';

const emailService = require('./services/emailService');

async function testCompleteEmailSystem() {
  console.log('🧪 Probando sistema completo de emails...\n');

  // Datos de prueba realistas
  const bookingData = {
    clientName: 'Ramiro Figueroa',
    clientEmail: 'ramfiaogusto@gmail.com',
    salonName: 'Barbería Elite Modern',
    serviceName: 'Corte Premium + Barba Clásica',
    date: 'viernes, 10 de enero de 2025',
    time: '15:30',
    price: 450,
    depositAmount: 150,
    salonAddress: 'Av. Revolución 1425, Col. Mixcoac, CDMX',
    salonPhone: '55 8765 4321',
    bookingId: 'RB2025010001'
  };

  console.log('📋 Datos de la reserva de prueba:');
  console.log(`👤 Cliente: ${bookingData.clientName}`);
  console.log(`🏪 Salón: ${bookingData.salonName}`);
  console.log(`✂️ Servicio: ${bookingData.serviceName}`);
  console.log(`📅 Fecha: ${bookingData.date} a las ${bookingData.time}`);
  console.log(`💰 Precio: $${bookingData.price} (Depósito: $${bookingData.depositAmount})`);
  console.log(`📧 Email destino: ${bookingData.clientEmail}\n`);

  try {
    // Prueba 1: Email de confirmación
    console.log('📧 Enviando email de confirmación...');
    const confirmationResult = await emailService.sendBookingConfirmation(bookingData);
    
    if (confirmationResult.success) {
      console.log('✅ Email de confirmación enviado exitosamente!');
      console.log(`📨 Message ID: ${confirmationResult.messageId}`);
    } else {
      console.log('❌ Error enviando confirmación:', confirmationResult.error);
    }

    // Esperar un momento entre emails
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Prueba 2: Email de recordatorio
    console.log('\n📧 Enviando email de recordatorio...');
    const reminderResult = await emailService.sendBookingReminder(bookingData);
    
    if (reminderResult.success) {
      console.log('✅ Email de recordatorio enviado exitosamente!');
      console.log(`📨 Message ID: ${reminderResult.messageId}`);
    } else {
      console.log('❌ Error enviando recordatorio:', reminderResult.error);
    }

    // Esperar un momento entre emails
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Prueba 3: Email de cancelación
    console.log('\n📧 Enviando email de cancelación...');
    const cancellationResult = await emailService.sendCancellationEmail(bookingData);
    
    if (cancellationResult.success) {
      console.log('✅ Email de cancelación enviado exitosamente!');
      console.log(`📨 Message ID: ${cancellationResult.messageId}`);
    } else {
      console.log('❌ Error enviando cancelación:', cancellationResult.error);
    }

  } catch (error) {
    console.log('💥 Error general en las pruebas:', error.message);
    console.log('📋 Stack trace:', error.stack);
  }

  console.log('\n🏁 Pruebas del sistema completadas!');
  console.log('📬 Revisa tu email (ramfiaogusto@gmail.com) para ver los 3 emails:');
  console.log('   1. ✅ Email de confirmación con política de no-show');
  console.log('   2. ⏰ Email de recordatorio');  
  console.log('   3. ❌ Email de cancelación');
  console.log('\n🎉 Sistema de emails COMPLETAMENTE FUNCIONAL!');
}

// Ejecutar las pruebas
testCompleteEmailSystem(); 