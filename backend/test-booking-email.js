/**
 * Script para probar una reserva completa y verificar el envío de emails
 */

require('dotenv').config()
const { prisma } = require('./lib/prisma')

async function testCompleteBooking() {
  console.log('🧪 PRUEBA DE RESERVA COMPLETA')
  console.log('=============================')

  try {
    // Buscar un usuario de prueba
    const user = await prisma.user.findFirst({
      where: { isActive: true }
    })

    if (!user) {
      console.log('❌ No se encontró ningún usuario activo')
      return
    }

    console.log('✅ Usuario encontrado:', user.username)

    // Buscar un servicio de prueba
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

    console.log('✅ Servicio encontrado:', service.name)

    // Crear una cita de prueba
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    tomorrow.setHours(0, 0, 0, 0)

    const testAppointment = await prisma.appointment.create({
      data: {
        userId: user.id,
        serviceId: service.id,
        clientName: 'Cliente de Prueba',
        clientEmail: 'ramfiaogusto@gmail.com',
        clientPhone: '809-123-4567',
        date: tomorrow,
        time: '10:00',
        notes: 'Prueba de email',
        totalAmount: service.price,
        status: 'CONFIRMADA',
        paymentStatus: 'COMPLETO'
      }
    })

    console.log('✅ Cita creada:', testAppointment.id)

    // Simular el envío de email como en la ruta pública
    const emailService = require('./services/emailService')
    
    const bookingData = {
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

    console.log('\n📧 Enviando email de confirmación...')
    console.log('   Destinatario:', bookingData.clientEmail)
    console.log('   Salón:', bookingData.salonName)
    console.log('   Servicio:', bookingData.serviceName)

    const emailResult = await emailService.sendBookingConfirmation(bookingData)
    
    if (emailResult.success) {
      console.log('✅ Email enviado exitosamente')
      console.log('   Message ID:', emailResult.messageId)
    } else {
      console.log('❌ Error enviando email:', emailResult.error)
    }

    // Limpiar la cita de prueba
    await prisma.appointment.delete({
      where: { id: testAppointment.id }
    })
    console.log('✅ Cita de prueba eliminada')

  } catch (error) {
    console.error('❌ Error en la prueba:', error)
  } finally {
    await prisma.$disconnect()
  }
}

testCompleteBooking()
