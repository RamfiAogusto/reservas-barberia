const express = require('express')
const { authenticateToken } = require('../middleware/auth')
const { prisma } = require('../lib/prisma')
const paymentGateway = require('../services/paymentGatewayService')
const emailService = require('../services/emailService')
const { emitToSalon } = require('../services/socketService')
const { format } = require('date-fns')
const { es } = require('date-fns/locale')
const router = express.Router()

// POST /api/payments/create-session - Crear sesión de pago (público, no requiere auth)
// Usado cuando el cliente accede al link de pago
router.post('/create-session', async (req, res) => {
  try {
    const { paymentToken } = req.body

    if (!paymentToken) {
      return res.status(400).json({ success: false, message: 'Token de pago requerido' })
    }

    // Buscar la cita por paymentToken
    const appointment = await prisma.appointment.findFirst({
      where: { paymentToken },
      include: {
        service: { select: { name: true, duration: true, price: true } },
        user: { select: { salonName: true, username: true, depositAmount: true, bookingMode: true } }
      }
    })

    if (!appointment) {
      return res.status(404).json({ success: false, message: 'Reserva no encontrada' })
    }

    if (appointment.status !== 'ESPERANDO_PAGO') {
      return res.status(400).json({
        success: false,
        message: appointment.status === 'EXPIRADA'
          ? 'Esta reserva ha expirado.'
          : `Estado actual: ${appointment.status}. No requiere pago.`
      })
    }

    // Verificar si no expiró
    if (appointment.holdExpiresAt && new Date() > new Date(appointment.holdExpiresAt)) {
      return res.status(410).json({ success: false, message: 'El tiempo para pagar ha expirado.' })
    }

    const owner = appointment.user
    const depositAmount = owner.depositAmount || 0

    if (!paymentGateway.isConfigured()) {
      // Pasarela no configurada — retornar info para pago manual/placeholder
      return res.json({
        success: true,
        message: 'Pasarela de pago no configurada. Use confirmar pago manual.',
        data: {
          appointmentId: appointment.id,
          amount: depositAmount,
          currency: 'usd',
          serviceName: appointment.service?.name || 'Servicio',
          salonName: owner.salonName,
          holdExpiresAt: appointment.holdExpiresAt?.toISOString(),
          gatewayConfigured: false
        }
      })
    }

    // Crear sesión de pago real
    const session = await paymentGateway.createPaymentSession({
      appointmentId: appointment.id,
      groupId: appointment.groupId,
      amount: Math.round(depositAmount * 100),
      currency: 'usd',
      customerEmail: appointment.clientEmail,
      customerName: appointment.clientName,
      description: `Depósito - ${appointment.service?.name} en ${owner.salonName}`,
      successUrl: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/pay/${paymentToken}?status=success`,
      cancelUrl: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/pay/${paymentToken}?status=cancelled`,
      metadata: { paymentToken, appointmentId: appointment.id }
    })

    res.json({
      success: true,
      data: {
        sessionId: session.sessionId,
        paymentUrl: session.paymentUrl,
        amount: depositAmount,
        gatewayConfigured: true
      }
    })
  } catch (error) {
    console.error('Error creando sesión de pago:', error)
    res.status(500).json({
      success: false,
      message: 'Error creando sesión de pago',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Error interno'
    })
  }
})

// POST /api/payments/webhook - Webhook de la pasarela (Stripe/Polar)
router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  try {
    const signature = req.headers['stripe-signature'] || req.headers['x-polar-signature'] || ''

    const result = await paymentGateway.handleWebhook({
      rawBody: req.body,
      signature
    })

    if (!result) {
      return res.status(200).json({ received: true, processed: false })
    }

    // TODO: Procesar el evento del webhook cuando la pasarela esté configurada
    // Por ejemplo: si event === 'checkout.session.completed', confirmar el pago
    console.log('[Webhook] Evento recibido:', result.event)

    res.status(200).json({ received: true, processed: true })
  } catch (error) {
    console.error('Error procesando webhook:', error)
    res.status(400).json({ success: false, message: 'Error procesando webhook' })
  }
})

// GET /api/payments/appointment/:token - Info de pago por token (público)
router.get('/appointment/:token', async (req, res) => {
  try {
    const { token } = req.params

    const appointment = await prisma.appointment.findFirst({
      where: { paymentToken: token },
      include: {
        service: { select: { name: true, duration: true, price: true } },
        barber: { select: { name: true } },
        user: { select: { salonName: true, username: true, depositAmount: true, address: true, phone: true, bookingMode: true } }
      }
    })

    if (!appointment) {
      return res.status(404).json({ success: false, message: 'Reserva no encontrada' })
    }

    const owner = appointment.user

    // Obtener todos los servicios si es multi-servicio
    let services = [{ name: appointment.service?.name, price: appointment.service?.price, duration: appointment.service?.duration }]
    let totalAmount = appointment.totalAmount
    if (appointment.groupId) {
      const groupAppts = await prisma.appointment.findMany({
        where: { groupId: appointment.groupId },
        include: { service: { select: { name: true, price: true, duration: true } } },
        orderBy: { time: 'asc' }
      })
      services = groupAppts.map(a => ({ name: a.service?.name, price: a.service?.price, duration: a.service?.duration }))
      totalAmount = groupAppts.reduce((sum, a) => sum + (a.totalAmount || 0), 0)
    }

    res.json({
      success: true,
      data: {
        appointmentId: appointment.id,
        status: appointment.status,
        clientName: appointment.clientName,
        date: appointment.date,
        time: appointment.time,
        services,
        totalServiceAmount: totalAmount,
        depositAmount: owner.depositAmount || 0,
        holdExpiresAt: appointment.holdExpiresAt?.toISOString() || null,
        salonName: owner.salonName,
        salonAddress: owner.address,
        salonPhone: owner.phone,
        barberName: appointment.barber?.name || null,
        bookingMode: owner.bookingMode || 'LIBRE'
      }
    })
  } catch (error) {
    console.error('Error obteniendo info de pago:', error)
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    })
  }
})

// POST /api/payments/confirm - Confirmar el depósito de una reserva (público, por token)
//
// El cliente que paga es anónimo: la autorización para esta acción es el
// paymentToken (secreto por reserva, tipo magic-link), no un JWT de dueño.
// La transición de estado es atómica y condicional para no chocar con el
// holdCleanupService (que expira holds cada 30s en paralelo).
//
// IMPORTANTE: mientras paymentGatewayService sea un mock, esto es una
// confirmación simulada/manual. Cuando exista una pasarela real, el ÚNICO
// escritor autoritativo del estado de pago debe ser el webhook firmado.
router.post('/confirm', async (req, res) => {
  try {
    const { paymentToken } = req.body

    if (!paymentToken) {
      return res.status(400).json({ success: false, message: 'Token de pago requerido' })
    }

    const appointment = await prisma.appointment.findFirst({
      where: { paymentToken },
      include: {
        service: { select: { name: true, duration: true, price: true } },
        barber: { select: { name: true } },
        user: { select: {
          salonName: true, username: true, email: true, address: true, phone: true,
          depositAmount: true, bookingMode: true
        } }
      }
    })

    if (!appointment) {
      return res.status(404).json({ success: false, message: 'Reserva no encontrada' })
    }

    if (appointment.status !== 'ESPERANDO_PAGO') {
      const msg = appointment.status === 'EXPIRADA'
        ? 'Esta reserva ha expirado. El tiempo para pagar ha finalizado.'
        : 'Esta reserva ya no está en espera de pago. Estado: ' + appointment.status
      return res.status(400).json({ success: false, message: msg })
    }

    const owner = appointment.user
    const bookingMode = owner.bookingMode || 'LIBRE'
    const deposit = owner.depositAmount || 0

    // Total real de la reserva (suma del grupo si es multi-servicio).
    let allServices = [appointment.service].filter(Boolean)
    let totalDuration = appointment.service?.duration || 0
    let groupTotal = appointment.totalAmount || 0

    if (appointment.groupId) {
      const groupAppts = await prisma.appointment.findMany({
        where: { groupId: appointment.groupId },
        include: { service: { select: { name: true, duration: true, price: true } } },
        orderBy: { time: 'asc' }
      })
      allServices = groupAppts.map(a => a.service).filter(Boolean)
      totalDuration = allServices.reduce((sum, s) => sum + (s.duration || 0), 0)
      groupTotal = groupAppts.reduce((sum, a) => sum + (a.totalAmount || 0), 0)
    }

    // El depósito casi siempre es parcial respecto al total del servicio.
    const paymentStatus = deposit > 0 && deposit < groupTotal ? 'PARCIAL' : 'COMPLETO'

    // Reclamo atómico: solo transiciona si sigue en ESPERANDO_PAGO y el hold
    // no venció. Si el cleanup lo expiró en paralelo, count === 0 → conflicto.
    const now = new Date()
    const claimWhere = {
      ...(appointment.groupId ? { groupId: appointment.groupId } : { id: appointment.id }),
      status: 'ESPERANDO_PAGO',
      OR: [{ holdExpiresAt: null }, { holdExpiresAt: { gt: now } }]
    }

    let confirmed = null
    await prisma.$transaction(async (tx) => {
      const claim = await tx.appointment.updateMany({
        where: claimWhere,
        data: {
          status: 'CONFIRMADA',
          paymentStatus,
          holdExpiresAt: null,
          paymentToken: null
        }
      })

      if (claim.count === 0) {
        const err = new Error('CONFLICT')
        err.code = 'CONFLICT'
        throw err
      }

      // El depósito se registra UNA sola vez (en la cita del token), no en
      // cada fila del grupo, para no inflar los ingresos en las estadísticas.
      confirmed = await tx.appointment.update({
        where: { id: appointment.id },
        data: { paidAmount: deposit || groupTotal },
        include: { service: { select: { name: true, duration: true, price: true, category: true } } }
      })
    }).catch((err) => {
      if (err.code === 'CONFLICT') return
      throw err
    })

    if (!confirmed) {
      // El hold venció (o fue liberado) entre la lectura y el reclamo.
      return res.status(410).json({
        success: false,
        message: 'El tiempo para pagar ha expirado. La reserva fue liberada.'
      })
    }

    const serviceName = allServices.length > 1
      ? allServices.map(s => s.name).join(' + ')
      : (appointment.service?.name || 'Servicio')

    emailService.sendBookingConfirmation({
      clientName: appointment.clientName,
      clientEmail: appointment.clientEmail,
      salonName: owner.salonName || owner.username,
      serviceName,
      services: allServices,
      totalDuration,
      barberName: appointment.barber?.name || null,
      date: format(appointment.date, 'PPP', { locale: es }),
      time: appointment.time,
      price: groupTotal,
      depositAmount: deposit,
      salonAddress: owner.address || 'Dirección no especificada',
      salonPhone: owner.phone || 'Teléfono no especificado',
      bookingId: appointment.id.toString()
    }).catch(e => console.error('Error email confirmación post-pago:', e))

    console.log(`✅ Pago confirmado para cita: ${appointment.id} → CONFIRMADA (${paymentStatus})`)

    emitToSalon(appointment.userId, 'appointment:paymentConfirmed', {
      appointment: confirmed,
      bookingMode,
      nextStatus: 'CONFIRMADA',
      message: `💳 ${appointment.clientName} completó el pago`
    })

    res.json({
      success: true,
      message: '¡Pago confirmado! Tu reserva está asegurada.',
      data: confirmed,
      bookingMode,
      status: 'CONFIRMADA'
    })
  } catch (error) {
    console.error('Error confirmando pago:', error)
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Error interno'
    })
  }
})

// ─── Rutas autenticadas ───
router.use(authenticateToken)

// GET /api/payments - Historial de pagos del salón
router.get('/', async (req, res) => {
  try {
    const payments = await prisma.appointment.findMany({
      where: {
        userId: req.user.id,
        paymentStatus: { in: ['COMPLETO', 'PARCIAL'] }
      },
      select: {
        id: true,
        clientName: true,
        clientEmail: true,
        date: true,
        time: true,
        totalAmount: true,
        paidAmount: true,
        paymentStatus: true,
        paymentMethod: true,
        status: true,
        createdAt: true,
        service: { select: { name: true } }
      },
      orderBy: { createdAt: 'desc' },
      take: 50
    })

    res.json({
      success: true,
      data: payments
    })
  } catch (error) {
    console.error('Error obteniendo pagos:', error)
    res.status(500).json({
      success: false,
      message: 'Error obteniendo pagos',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Error interno'
    })
  }
})

module.exports = router