// Configuración manual para la prueba
process.env.RESEND_API_KEY = 're_BM7CX92n_FfzX6zbHosaL35uNFSsPhSZm';
process.env.FROM_EMAIL = 'ramfiaogusto@gmail.com';

const emailService = require('./services/emailService');

async function testNewEmailTemplate() {
  console.log('🧪 Probando nuevo template de email de confirmación...\n');

  // Datos de prueba con formato mejorado
  const bookingData = {
    clientName: 'Ramiro Figueroa',
    clientEmail: 'ramfiaogusto@gmail.com',
    salonName: 'Barbería Elite Style',
    serviceName: 'Corte Premium + Barba Clásica',
    date: 'viernes, 10 de enero de 2025',
    time: '15:30',
    price: 450,
    depositAmount: 150,
    salonAddress: 'Av. Revolución 1425, Col. Mixcoac, CDMX',
    salonPhone: '55 8765 4321',
    bookingId: 'RB2025010005'
  };

  console.log('📋 Datos de la prueba:');
  console.log('👤 Cliente:', bookingData.clientName);
  console.log('🏪 Salón:', bookingData.salonName);
  console.log('✂️ Servicio:', bookingData.serviceName);
  console.log('📧 Destino:', bookingData.clientEmail);
  console.log('📞 Tel. Salón:', bookingData.salonPhone);
  console.log('');

  console.log('📧 Enviando email con nuevo template...');
  
  try {
    const result = await emailService.sendBookingConfirmation(bookingData);
    
    if (result.success) {
      console.log('✅ Email enviado exitosamente!');
      console.log('📨 Message ID:', result.messageId);
      console.log('');
      console.log('🎉 REVISA TU EMAIL para ver el nuevo formato con:');
      console.log('   📅 Detalles de tu Cita (SOLO datos de la reserva)');
      console.log('   🏪 Información del Salón (datos de contacto separados)');
      console.log('   💰 Información de Pago');
      console.log('   ⚠️ Política de Inasistencia');
      console.log('   📞 Información de contacto');
      console.log('');
      console.log('🔍 Verificar que:');
      console.log('   ✓ "Detalles de tu Cita" NO incluye teléfono');
      console.log('   ✓ Teléfono aparece SOLO en "Información del Salón"');
      console.log('   ✓ Secciones están visualmente separadas');
    } else {
      console.error('❌ Error enviando email:', result.error);
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

// Ejecutar la prueba
testNewEmailTemplate()
  .then(() => {
    console.log('\n🏁 Prueba completada!');
    process.exit(0);
  })
  .catch(error => {
    console.error('❌ Error en la prueba:', error);
    process.exit(1);
  }); 