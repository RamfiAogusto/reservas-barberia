/**
 * Prueba completa del nuevo flujo de emails
 */

require('dotenv').config()
const { prisma } = require('./lib/prisma')
const emailService = require('./services/emailService')

async function testNewEmailFlow() {
  console.log('🎯 PRUEBA DEL NUEVO FLUJO DE EMAILS')
  console.log('==================================')

  try {
    // Buscar el usuario ramfi_aog
    const user = await prisma.user.findFirst({
      where: { username: 'ramfi_aog' }
    })

    if (!user) {
      console.log('❌ No se encontró el usuario ramfi_aog')
      return
    }

    console.log('✅ Usuario encontrado:', user.username, '-', user.salonName)

    // Buscar un servicio
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

    // Crear una cita PENDIENTE (como cuando se hace una reserva pública)
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    tomorrow.setHours(0, 0, 0, 0)

    const testAppointment = await prisma.appointment.create({
      data: {
        userId: user.id,
        serviceId: service.id,
        clientName: 'Cliente Nuevo Flujo',
        clientEmail: 'whosmirj105@gmail.com',
        clientPhone: '809-555-9999',
        date: tomorrow,
        time: '11:00',
        notes: 'Prueba del nuevo flujo de emails',
        totalAmount: service.price,
        status: 'PENDIENTE', // Estado inicial
        paymentStatus: 'PENDIENTE'
      }
    })

    console.log('✅ Cita PENDIENTE creada:', testAppointment.id)

    // Datos para emails
    const baseEmailData = {
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

    console.log('\n📧 PRUEBA 1: Email de solicitud enviada (PENDIENTE)')
    console.log('   Destinatario:', baseEmailData.clientEmail)

    const requestEmailResult = await emailService.sendBookingRequest(baseEmailData)
    
    if (requestEmailResult.success) {
      console.log('✅ Email de solicitud enviado exitosamente')
    } else {
      console.log('❌ Error enviando email de solicitud:', requestEmailResult.error)
    }

    console.log('\n📧 PRUEBA 2: Notificación al dueño (PENDIENTE)')
    console.log('   Destinatario:', user.email)

    const ownerNotificationData = {
      ...baseEmailData,
      ownerEmail: user.email,
      clientPhone: testAppointment.clientPhone,
      notes: testAppointment.notes || ''
    }

    const ownerEmailResult = await emailService.sendOwnerNotification(ownerNotificationData)
    
    if (ownerEmailResult.success) {
      console.log('✅ Notificación al dueño enviada exitosamente')
    } else {
      console.log('❌ Error enviando notificación al dueño:', ownerEmailResult.error)
    }

    console.log('\n📧 PRUEBA 3: Email de confirmación (PENDIENTE → CONFIRMADA)')
    console.log('   Destinatario:', baseEmailData.clientEmail)

    const confirmationEmailResult = await emailService.sendBookingConfirmation(baseEmailData)
    
    if (confirmationEmailResult.success) {
      console.log('✅ Email de confirmación enviado exitosamente')
    } else {
      console.log('❌ Error enviando email de confirmación:', confirmationEmailResult.error)
    }

    console.log('\n📧 PRUEBA 4: Email de modificación (cambio de horario)')
    console.log('   Destinatario:', baseEmailData.clientEmail)

    const modificationData = {
      ...baseEmailData,
      changes: [
        {
          field: 'Hora',
          old: '11:00',
          new: '15:30'
        },
        {
          field: 'Fecha',
          old: tomorrow.toLocaleDateString('es-ES', { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
          }),
          new: tomorrow.toLocaleDateString('es-ES', { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
          })
        }
      ]
    }

    const modificationEmailResult = await emailService.sendBookingModification(modificationData)
    
    if (modificationEmailResult.success) {
      console.log('✅ Email de modificación enviado exitosamente')
    } else {
      console.log('❌ Error enviando email de modificación:', modificationEmailResult.error)
    }

    // Limpiar la cita de prueba
    await prisma.appointment.delete({
      where: { id: testAppointment.id }
    })
    console.log('\n✅ Cita de prueba eliminada')

    console.log('\n🎯 RESUMEN DE PRUEBAS:')
    console.log('   📋 Solicitud enviada:', requestEmailResult.success ? '✅' : '❌')
    console.log('   📧 Notificación al dueño:', ownerEmailResult.success ? '✅' : '❌')
    console.log('   ✅ Confirmación:', confirmationEmailResult.success ? '✅' : '❌')
    console.log('   ✏️ Modificación:', modificationEmailResult.success ? '✅' : '❌')
    
    if (requestEmailResult.success && ownerEmailResult.success && confirmationEmailResult.success && modificationEmailResult.success) {
      console.log('\n🎉 ¡NUEVO FLUJO DE EMAILS FUNCIONANDO PERFECTAMENTE!')
      console.log('   📬 Revisa todos los emails para confirmar la entrega')
    }

  } catch (error) {
    console.error('❌ Error en la prueba:', error)
  } finally {
    await prisma.$disconnect()
  }
}

testNewEmailFlow()
