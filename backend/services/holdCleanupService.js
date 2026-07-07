/**
 * Servicio de limpieza de reservas temporales expiradas.
 * Similar al sistema de cines/aerolíneas: si el usuario no paga
 * dentro del tiempo límite, la reserva se libera automáticamente.
 * 
 * Ejecuta cada 30 segundos para verificar y expirar holds vencidos.
 */
const { prisma } = require('../lib/prisma')
const emailService = require('./emailService')
const { emitToSalon } = require('./socketService')
const { format } = require('date-fns')
const { es } = require('date-fns/locale')

class HoldCleanupService {
  constructor() {
    this.intervalId = null
    this.CHECK_INTERVAL_MS = 30 * 1000 // Cada 30 segundos
    this.isRunning = false
  }

  start() {
    if (this.intervalId) {
      console.log('⚠️ HoldCleanupService ya está corriendo')
      return
    }

    console.log('🧹 Iniciando servicio de limpieza de reservas temporales (cada 30s)')
    
    // Ejecutar inmediatamente y luego cada intervalo
    this.cleanup()
    this.intervalId = setInterval(() => this.cleanup(), this.CHECK_INTERVAL_MS)
  }

  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId)
      this.intervalId = null
      console.log('🛑 Servicio de limpieza de reservas detenido')
    }
  }

  async cleanup() {
    if (this.isRunning) return // Evitar ejecuciones simultáneas
    this.isRunning = true

    try {
      const now = new Date()

      // Buscar citas en ESPERANDO_PAGO cuyo hold ha expirado
      const expiredAppointments = await prisma.appointment.findMany({
        where: {
          status: 'ESPERANDO_PAGO',
          holdExpiresAt: {
            lte: now // holdExpiresAt <= ahora = expirado
          }
        },
        include: {
          service: { select: { name: true, duration: true, price: true } },
          user: { select: { salonName: true, username: true, phone: true, address: true } }
        }
      })

      if (expiredAppointments.length === 0) {
        this.isRunning = false
        return
      }

      // Agrupar por groupId para no enviar múltiples emails por la misma reserva
      const processed = new Set()
      const toExpire = []

      for (const apt of expiredAppointments) {
        const key = apt.groupId || apt.id
        if (processed.has(key)) continue
        processed.add(key)
        toExpire.push(apt)
      }

      // Expirar todas de una vez
      const expiredIds = expiredAppointments.map(a => a.id)
      await prisma.appointment.updateMany({
        where: { id: { in: expiredIds } },
        data: {
          status: 'EXPIRADA',
          holdExpiresAt: null,
          paymentToken: null
        }
      })

      console.log(`🧹 ${expiredIds.length} cita(s) expirada(s) - ${toExpire.length} reserva(s) liberada(s)`)

      // Emitir evento real-time para cada salón afectado
      const ownerIds = [...new Set(expiredAppointments.map(a => a.userId))]
      for (const ownerId of ownerIds) {
        const ownerExpired = expiredAppointments.filter(a => a.userId === ownerId)
        emitToSalon(ownerId, 'appointment:holdExpired', {
          expiredIds: ownerExpired.map(a => a.id),
          count: ownerExpired.length,
          message: `${ownerExpired.length} reserva(s) expirada(s) por falta de pago`
        })
      }

      // Enviar emails de expiración (uno por reserva, no por cita individual)
      for (const apt of toExpire) {
        try {
          let serviceName = apt.service?.name || 'Servicio'

          // Si es multi-servicio, obtener todos los nombres
          if (apt.groupId) {
            const groupAppts = await prisma.appointment.findMany({
              where: { groupId: apt.groupId },
              include: { service: { select: { name: true } } }
            })
            const names = groupAppts.map(a => a.service?.name).filter(Boolean)
            if (names.length > 1) serviceName = names.join(' + ')
          }

          emailService.sendHoldExpired({
            clientName: apt.clientName,
            clientEmail: apt.clientEmail,
            salonName: apt.user?.salonName || apt.user?.username || 'Salón',
            serviceName,
            date: format(apt.date, 'PPP', { locale: es }),
            time: apt.time,
            price: apt.totalAmount,
            salonPhone: apt.user?.phone || 'Teléfono no especificado',
            salonAddress: apt.user?.address || 'Dirección no especificada',
            bookingId: apt.id.toString()
          }).catch(e => console.error('Error email expiración:', e))

        } catch (emailError) {
          console.error('Error preparando email de expiración:', emailError)
        }
      }
    } catch (error) {
      console.error('Error en cleanup de holds:', error)
    } finally {
      this.isRunning = false
    }
  }
}

module.exports = new HoldCleanupService()
