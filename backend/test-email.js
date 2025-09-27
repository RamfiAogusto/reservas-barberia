/**
 * Script de prueba para verificar el envío de emails
 */

require('dotenv').config()
const emailService = require('./services/emailService')

console.log('🧪 PRUEBA DE SISTEMA DE EMAILS')
console.log('==============================')

// Verificar configuración
console.log('\n1. Verificando configuración:')
console.log('   RESEND_API_KEY:', process.env.RESEND_API_KEY ? '✅ Configurada' : '❌ No configurada')
console.log('   FROM_EMAIL:', process.env.FROM_EMAIL || '❌ No configurada')
console.log('   Servicio configurado:', emailService.isConfigured ? '✅ Sí' : '❌ No')

if (!emailService.isConfigured) {
  console.log('\n❌ ERROR: El servicio de email no está configurado correctamente')
  console.log('💡 Verifica que RESEND_API_KEY esté en el archivo .env')
  process.exit(1)
}

// Datos de prueba
const testBookingData = {
  clientName: 'Juan Pérez',
  clientEmail: 'ramfiaogusto@gmail.com', // Tu email para pruebas
  salonName: 'Barbería Test',
  serviceName: 'Corte de Cabello',
  date: '27 de septiembre de 2025',
  time: '15:30',
  price: 150,
  depositAmount: 0,
  salonAddress: 'Calle Principal 123, Santo Domingo',
  salonPhone: '809-123-4567',
  bookingId: 'TEST-' + Date.now()
}

console.log('\n2. Enviando email de prueba...')
console.log('   Destinatario:', testBookingData.clientEmail)
console.log('   Servicio:', testBookingData.serviceName)
console.log('   Fecha:', testBookingData.date, testBookingData.time)

// Enviar email de prueba
emailService.sendBookingConfirmation(testBookingData)
  .then(result => {
    console.log('\n3. Resultado del envío:')
    if (result.success) {
      console.log('   ✅ Email enviado exitosamente')
      console.log('   📧 Message ID:', result.messageId)
      console.log('   📬 Revisa tu bandeja de entrada:', testBookingData.clientEmail)
    } else {
      console.log('   ❌ Error enviando email:', result.error)
    }
  })
  .catch(error => {
    console.log('\n❌ Error en la prueba:', error.message)
  })
  .finally(() => {
    console.log('\n✅ Prueba completada')
    process.exit(0)
  })
