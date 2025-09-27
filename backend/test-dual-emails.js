/**
 * Script para probar el envío de emails tanto al cliente como al dueño
 */

require('dotenv').config()
const { prisma } = require('./lib/prisma')
const emailService = require('./services/emailService')

async function testDualEmailSystem() {
  console.log('🧪 PRUEBA DE SISTEMA DUAL DE EMAILS')
  console.log('===================================')

  try {
    // Buscar el usuario ramfi_aog (dueño del negocio)
    const user = await prisma.user.findFirst({
      where: { username: 'ramfi_aog' }
    })

    if (!user) {
      console.log('❌ No se encontró el usuario ramfi_aog')
      return
    }

    console.log('✅ Usuario encontrado:', user.username, '-', user.salonName)
    console.log('   Email del dueño:', user.email)

    // Buscar un servicio del usuario
    const service = await prisma.service.findFirst({
      where: { 
        userId: user.id,
        isActive: true 
      }
    })

    if (!service) {
      console.log('❌ No se encontró ningún servicio activo')
      return
    }

    console.log('✅ Servicio encontrado:', service.name, '- $' + service.price)

    // Crear una cita de prueba para mañana
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    tomorrow.setHours(0, 0, 0, 0)

    const testAppointment = await prisma.appointment.create({
      data: {
        userId: user.id,
        serviceId: service.id,
        clientName: 'Cliente de Prueba Dual',
        clientEmail: 'whosmirj105@gmail.com', // Email del cliente
        clientPhone: '809-987-6543',
        date: tomorrow,
        time: '14:00',
        notes: 'Prueba de sistema dual de emails',
        totalAmount: service.price,
        status: 'CONFIRMADA',
        paymentStatus: 'COMPLETO'
      }
    })

    console.log('✅ Cita creada:', testAppointment.id)
    console.log('   Cliente:', testAppointment.clientName)
    console.log('   Email del cliente:', testAppointment.clientEmail)
    console.log('   Fecha:', tomorrow.toLocaleDateString('es-ES'))
    console.log('   Hora:', testAppointment.time)

    // Datos para el email del cliente
    const clientEmailData = {
      clientName: testAppointment.clientName,
      clientEmail: testAppointment.clientEmail,
      salonName: user.salonName || user.username,
      serviceName: service.name,
      date: tomorrow.toLocaleDateString('es-ES', { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      }),
      time: testAppointment.time,
      price: service.price,
      depositAmount: service.depositAmount || 0,
      salonAddress: user.address || 'Dirección no especificada',
      salonPhone: user.phone || 'Teléfono no especificado',
      bookingId: testAppointment.id.toString()
    }

    // Datos para el email del dueño
    const ownerEmailData = {
      ...clientEmailData,
      ownerEmail: user.email,
      clientPhone: testAppointment.clientPhone,
      notes: testAppointment.notes || ''
    }

    console.log('\n📧 ENVIANDO EMAIL AL CLIENTE...')
    console.log('   Destinatario:', clientEmailData.clientEmail)
    console.log('   Servicio:', clientEmailData.serviceName)

    const clientEmailResult = await emailService.sendBookingConfirmation(clientEmailData)
    
    if (clientEmailResult.success) {
      console.log('✅ Email al cliente enviado exitosamente')
      console.log('   Message ID:', clientEmailResult.messageId)
    } else {
      console.log('❌ Error enviando email al cliente:', clientEmailResult.error)
    }

    console.log('\n📧 ENVIANDO NOTIFICACIÓN AL DUEÑO...')
    console.log('   Destinatario:', ownerEmailData.ownerEmail)
    console.log('   Salón:', ownerEmailData.salonName)

    const ownerEmailResult = await emailService.sendOwnerNotification(ownerEmailData)
    
    if (ownerEmailResult.success) {
      console.log('✅ Notificación al dueño enviada exitosamente')
      console.log('   Message ID:', ownerEmailResult.messageId)
    } else {
      console.log('❌ Error enviando notificación al dueño:', ownerEmailResult.error)
    }

    // Limpiar la cita de prueba
    await prisma.appointment.delete({
      where: { id: testAppointment.id }
    })
    console.log('\n✅ Cita de prueba eliminada')

    console.log('\n📬 RESUMEN DE EMAILS ENVIADOS:')
    console.log('   Cliente (whosmirj105@gmail.com):', clientEmailResult.success ? '✅ Enviado' : '❌ Error')
    console.log('   Dueño (ramfiaogusto@gmail.com):', ownerEmailResult.success ? '✅ Enviado' : '❌ Error')

  } catch (error) {
    console.error('❌ Error en la prueba:', error)
  } finally {
    await prisma.$disconnect()
  }
}

testDualEmailSystem()
