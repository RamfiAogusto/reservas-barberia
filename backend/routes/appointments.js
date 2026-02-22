const express = require('express')
const { body, validationResult, query } = require('express-validator')
const { prisma } = require('../lib/prisma')
const { authenticateToken } = require('../middleware/auth')
const emailService = require('../services/emailService')
const queueService = require('../services/queueService')
const { format } = require('date-fns')
const { es } = require('date-fns/locale')
const { checkTimeOverlap } = require('../utils/availabilityUtils')
const router = express.Router()

/**
 * Agrupa citas con el mismo groupId en una sola entrada.
 * Las citas sin groupId se devuelven individualmente.
 * La entrada agrupada usa los datos de la primera cita del grupo
 * y agrega: services[], totalAmount, totalDuration, appointmentCount.
 */
function groupAppointmentsByGroupId(appointments) {
  const groups = new Map()
  const singles = []

  for (const apt of appointments) {
    if (apt.groupId) {
      if (!groups.has(apt.groupId)) {
        groups.set(apt.groupId, [])
      }
      groups.get(apt.groupId).push(apt)
    } else {
      // Cita individual: agregar campo services para consistencia
      singles.push({
        ...apt,
        services: apt.service ? [apt.service] : [],
        totalAmount: apt.totalAmount,
        totalDuration: apt.service?.duration || 0,
        appointmentCount: 1
      })
    }
  }

  const grouped = []
  for (const [groupId, groupApts] of groups) {
    const main = groupApts[0] // primera cita del grupo (la más temprana)
    const allServices = groupApts.map(a => a.service).filter(Boolean)
    const totalAmount = groupApts.reduce((sum, a) => sum + (a.totalAmount || 0), 0)
    const totalDuration = allServices.reduce((sum, s) => sum + (s.duration || 0), 0)

    grouped.push({
      ...main,
      service: { 
        name: allServices.map(s => s.name).join(' + '), 
        duration: totalDuration,
        price: totalAmount,
        category: main.service?.category 
      },
      services: allServices,
      totalAmount,
      totalDuration,
      appointmentCount: groupApts.length,
      // IDs de todas las citas del grupo (para acciones masivas)
      groupAppointmentIds: groupApts.map(a => a.id)
    })
  }

  // Combinar y ordenar por fecha + hora
  return [...grouped, ...singles].sort((a, b) => {
    const dateA = new Date(a.date)
    const dateB = new Date(b.date)
    if (dateA.getTime() !== dateB.getTime()) return dateA - dateB
    return (a.time || '').localeCompare(b.time || '')
  })
}

// Middleware de autenticación para todas las rutas
router.use(authenticateToken)

// GET /api/appointments - Obtener citas del usuario con filtros
router.get('/', [
  query('date').optional().isISO8601().withMessage('Formato de fecha inválido'),
  query('status').optional().isIn(['PENDIENTE', 'CONFIRMADA', 'COMPLETADA', 'CANCELADA', 'NO_ASISTIO']).withMessage('Status inválido'),
  query('startDate').optional().isISO8601().withMessage('Formato de fecha de inicio inválido'),
  query('endDate').optional().isISO8601().withMessage('Formato de fecha de fin inválido')
], async (req, res) => {
  try {
    // Verificar errores de validación
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Parámetros inválidos',
        errors: errors.array()
      })
    }

    const { date, status, startDate, endDate } = req.query
    let where = { userId: req.user.id }

    // Filtrar por fecha específica
    if (date) {
      const filterDate = new Date(date)
      filterDate.setHours(0, 0, 0, 0)
      const nextDay = new Date(filterDate)
      nextDay.setDate(nextDay.getDate() + 1)
      
      where.date = {
        gte: filterDate,
        lt: nextDay
      }
    }

    // Filtrar por rango de fechas
    if (startDate && endDate) {
      where.date = {
        gte: new Date(startDate),
        lte: new Date(endDate)
      }
    }

    // Filtrar por status
    if (status) {
      where.status = status
    }

    const appointments = await prisma.appointment.findMany({
      where,
      include: {
        service: {
          select: {
            name: true,
            duration: true,
            price: true,
            category: true
          }
        },
        barber: {
          select: {
            id: true,
            name: true
          }
        }
      },
      orderBy: [
        { date: 'asc' },
        { time: 'asc' }
      ]
    })

    // Agrupar citas multi-servicio por groupId
    const grouped = groupAppointmentsByGroupId(appointments)

    res.json({
      success: true,
      count: grouped.length,
      data: grouped
    })
  } catch (error) {
    console.error('Error obteniendo citas:', error)
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Error interno'
    })
  }
})

// GET /api/appointments/today - Obtener citas de hoy
router.get('/today', async (req, res) => {
  try {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)
    
    const appointments = await prisma.appointment.findMany({
      where: {
        userId: req.user.id,
        date: {
          gte: today,
          lt: tomorrow
        }
      },
      include: {
        service: {
          select: {
            name: true,
            duration: true,
            price: true,
            category: true
          }
        },
        barber: {
          select: {
            id: true,
            name: true
          }
        }
      },
      orderBy: {
        time: 'asc'
      }
    })

    // Agrupar citas multi-servicio por groupId
    const grouped = groupAppointmentsByGroupId(appointments)
    
    res.json({
      success: true,
      count: grouped.length,
      data: grouped
    })
  } catch (error) {
    console.error('Error obteniendo citas de hoy:', error)
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Error interno'
    })
  }
})

// GET /api/appointments/:id - Obtener una cita específica
router.get('/:id', async (req, res) => {
  try {
    const appointment = await prisma.appointment.findFirst({
      where: {
        id: req.params.id,
        userId: req.user.id
      },
      include: {
        service: {
          select: {
            name: true,
            duration: true,
            price: true,
            category: true
          }
        }
      }
    })

    if (!appointment) {
      return res.status(404).json({
        success: false,
        message: 'Cita no encontrada'
      })
    }

    res.json({
      success: true,
      data: appointment
    })
  } catch (error) {
    console.error('Error obteniendo cita:', error)
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Error interno'
    })
  }
})

// POST /api/appointments - Crear nueva cita
router.post('/', [
  body('serviceId')
    .notEmpty()
    .withMessage('El ID del servicio es requerido')
    .isLength({ min: 1, max: 50 })
    .withMessage('ID de servicio inválido'),
  body('clientName')
    .trim()
    .notEmpty()
    .withMessage('El nombre del cliente es requerido')
    .isLength({ max: 100 })
    .withMessage('El nombre no puede tener más de 100 caracteres'),
  body('clientEmail')
    .isEmail()
    .normalizeEmail()
    .withMessage('Email inválido'),
  body('clientPhone')
    .trim()
    .notEmpty()
    .withMessage('El teléfono es requerido'),
  body('date')
    .isISO8601()
    .withMessage('Formato de fecha inválido'),
  body('time')
    .matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/)
    .withMessage('Formato de hora inválido (HH:MM)'),
  body('notes')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Las notas no pueden tener más de 500 caracteres'),
  body('staffMember')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('El nombre del staff no puede tener más de 100 caracteres'),
  body('barberId')
    .optional()
    .isString()
    .withMessage('ID de barbero inválido')
], async (req, res) => {
  try {
    // Verificar errores de validación
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Datos inválidos',
        errors: errors.array()
      })
    }

    const { serviceId, clientName, clientEmail, clientPhone, date, time, notes, staffMember, barberId } = req.body

    // Verificar que el servicio existe y pertenece al usuario
    const service = await prisma.service.findFirst({
      where: {
        id: serviceId,
        userId: req.user.id,
        isActive: true
      }
    })

    if (!service) {
      return res.status(400).json({
        success: false,
        message: 'Servicio no encontrado o inactivo'
      })
    }

    // Si se especifica barbero, verificar que exista y pertenezca al usuario
    if (barberId) {
      const barber = await prisma.barber.findFirst({
        where: { id: barberId, userId: req.user.id, isActive: true }
      })
      if (!barber) {
        return res.status(400).json({
          success: false,
          message: 'Barbero no encontrado o inactivo'
        })
      }
    }

    // Verificar solapamiento de horario (considerando duración del servicio)
    const hasOverlap = await checkTimeOverlap({
      userId: req.user.id,
      date: date,
      time: time,
      serviceDuration: service.duration,
      barberId: barberId || null
    })

    if (hasOverlap) {
      return res.status(400).json({
        success: false,
        message: 'Ya existe una cita que se cruza con este horario'
      })
    }

    // Verificar que la fecha no sea en el pasado
    const appointmentDate = new Date(date)
    const [hours, minutes] = time.split(':')
    appointmentDate.setHours(parseInt(hours), parseInt(minutes))
    
    if (appointmentDate < new Date()) {
      return res.status(400).json({
        success: false,
        message: 'No puedes programar citas en el pasado'
      })
    }

    // Crear nueva cita
    const newAppointment = await prisma.appointment.create({
      data: {
        userId: req.user.id,
        serviceId: serviceId,
        clientName: clientName,
        clientEmail: clientEmail,
        clientPhone: clientPhone,
        date: new Date(date),
        time: time,
        notes: notes,
        staffMember: staffMember,
        barberId: barberId || null,
        totalAmount: service.price,
        status: 'PENDIENTE'
      }
    })

    // Obtener datos del servicio para la respuesta
    const serviceData = await prisma.service.findFirst({
      where: { id: newAppointment.serviceId },
      select: {
        name: true,
        duration: true,
        price: true,
        category: true
      }
    })

    // Preparar datos para el email de confirmación
    try {
      const salonOwner = await prisma.user.findFirst({
        where: { id: req.user.id }
      })
      const bookingData = {
        clientName,
        clientEmail,
        salonName: salonOwner.salonName || salonOwner.username,
        serviceName: serviceData.name,
        date: format(new Date(date), 'PPP', { locale: es }),
        time,
        price: service.price,
        depositAmount: salonOwner.depositAmount ?? 0,
        salonAddress: salonOwner.address || 'Dirección no especificada',
        salonPhone: salonOwner.phone || 'Teléfono no especificado',
        bookingId: newAppointment.id.toString()
      }

      // Enviar correo de confirmación (no bloqueante)
      emailService.sendBookingConfirmation(bookingData)
        .then(result => {
          if (result.success) {
            console.log('Email de confirmación enviado exitosamente')
          } else {
            console.error('Error enviando email de confirmación:', result.error)
          }
        })
        .catch(error => {
          console.error('Error en envío de email:', error)
        })

      // Programar recordatorio (no bloqueante)
      queueService.scheduleReminder({
        appointmentId: newAppointment.id.toString(),
        appointmentDate: date,
        appointmentTime: time,
        clientEmail,
        clientName
      }).then(result => {
        if (result.success) {
          console.log(`📅 Recordatorio programado para: ${clientName} - ${result.reminderTime}`)
        } else {
          console.log(`⚠️ No se pudo programar recordatorio: ${result.message}`)
        }
      }).catch(error => {
        console.error('Error programando recordatorio:', error)
      })

    } catch (emailError) {
      console.error('Error preparando email de confirmación:', emailError)
      // No afecta la respuesta principal
    }

    res.status(201).json({
      success: true,
      message: 'Cita creada exitosamente',
      data: newAppointment
    })
  } catch (error) {
    console.error('Error creando cita:', error)
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Error interno'
    })
  }
})

// PUT /api/appointments/:id - Actualizar cita
router.put('/:id', [
  body('serviceId')
    .optional()
    .isLength({ min: 1, max: 50 })
    .withMessage('ID de servicio inválido'),
  body('clientName')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('El nombre del cliente no puede estar vacío')
    .isLength({ max: 100 })
    .withMessage('El nombre no puede tener más de 100 caracteres'),
  body('clientEmail')
    .optional()
    .isEmail()
    .normalizeEmail()
    .withMessage('Email inválido'),
  body('clientPhone')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('El teléfono no puede estar vacío'),
  body('date')
    .optional()
    .isISO8601()
    .withMessage('Formato de fecha inválido'),
  body('time')
    .optional()
    .matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/)
    .withMessage('Formato de hora inválido (HH:MM)'),
  body('status')
    .optional()
    .isIn(['PENDIENTE', 'CONFIRMADA', 'COMPLETADA', 'CANCELADA', 'NO_ASISTIO'])
    .withMessage('Status inválido'),
  body('notes')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Las notas no pueden tener más de 500 caracteres'),
  body('staffMember')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('El nombre del staff no puede tener más de 100 caracteres'),
  body('paidAmount')
    .optional()
    .isNumeric()
    .withMessage('El monto pagado debe ser un número')
    .isFloat({ min: 0 })
    .withMessage('El monto pagado debe ser mayor o igual a 0'),
  body('paymentMethod')
    .optional()
    .isIn(['efectivo', 'tarjeta', 'transferencia', 'stripe', 'paypal'])
    .withMessage('Método de pago inválido'),
  body('cancelReason')
    .optional()
    .trim()
    .isLength({ max: 200 })
    .withMessage('La razón de cancelación no puede tener más de 200 caracteres')
], async (req, res) => {
  try {
    console.log('🔄 PUT /appointments/:id - Datos recibidos:', {
      params: req.params,
      body: req.body,
      userId: req.user.id
    })
    
    // Verificar errores de validación
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      console.error('❌ Errores de validación:', errors.array())
      return res.status(400).json({
        success: false,
        message: 'Datos inválidos',
        errors: errors.array()
      })
    }

    // Buscar la cita
    const appointment = await prisma.appointment.findFirst({
      where: {
        id: req.params.id,
        userId: req.user.id
      }
    })

    if (!appointment) {
      return res.status(404).json({
        success: false,
        message: 'Cita no encontrada'
      })
    }

    // Si se está cambiando la fecha/hora, verificar disponibilidad
    if ((req.body.date || req.body.time) && appointment.status !== 'CANCELADA') {
      const newDate = req.body.date ? new Date(req.body.date) : appointment.date
      const newTime = req.body.time || appointment.time

      // Obtener duración del servicio
      const appointmentService = await prisma.service.findFirst({
        where: { id: req.body.serviceId || appointment.serviceId },
        select: { duration: true }
      })

      const hasOverlap = await checkTimeOverlap({
        userId: req.user.id,
        date: newDate,
        time: newTime,
        serviceDuration: appointmentService?.duration || 30,
        barberId: req.body.barberId || appointment.barberId || null,
        excludeAppointmentId: appointment.id
      })

      if (hasOverlap) {
        return res.status(400).json({
          success: false,
          message: 'Ya existe una cita que se cruza con este horario'
        })
      }
    }

    // Si se está cancelando, agregar fecha de cancelación
    if (req.body.status === 'CANCELADA' && appointment.status !== 'CANCELADA') {
      req.body.cancelledAt = new Date()
    }

    // Guardar estado anterior para verificar si se está cancelando
    const previousStatus = appointment.status

    // Preparar datos para actualizar
    const updateData = {}
    Object.keys(req.body).forEach(key => {
      if (req.body[key] !== undefined) {
        // Convertir fecha a objeto Date si es necesario
        if (key === 'date' && typeof req.body[key] === 'string') {
          updateData[key] = new Date(req.body[key])
        } else {
          updateData[key] = req.body[key]
        }
      }
    })

    const updatedAppointment = await prisma.appointment.update({
      where: { id: req.params.id },
      data: updateData,
      include: {
        service: {
          select: {
            name: true,
            duration: true,
            price: true,
            category: true
          }
        }
      }
    })

    // Si cambia de estado y la cita tiene groupId, propagar a todo el grupo
    if (req.body.status && appointment.groupId) {
      await prisma.appointment.updateMany({
        where: { 
          groupId: appointment.groupId,
          userId: req.user.id,
          id: { not: req.params.id } // las demás del grupo
        },
        data: { 
          status: req.body.status,
          ...(req.body.cancelReason ? { cancelReason: req.body.cancelReason } : {}),
          ...(req.body.cancelledAt ? { cancelledAt: req.body.cancelledAt } : {})
        }
      })
      console.log(`✅ Grupo ${appointment.groupId} actualizado a ${req.body.status}`)
    }

    // Enviar emails según el tipo de cambio
    try {
      const salonOwner = await prisma.user.findFirst({
        where: { id: req.user.id }
      })

      // Detectar cambios para email de modificación
      const changes = []
      if (req.body.date && req.body.date !== appointment.date.toISOString().split('T')[0]) {
        changes.push({
          field: 'Fecha',
          old: format(appointment.date, 'PPP', { locale: es }),
          new: format(new Date(req.body.date), 'PPP', { locale: es })
        })
      }
      if (req.body.time && req.body.time !== appointment.time) {
        changes.push({
          field: 'Hora',
          old: appointment.time,
          new: req.body.time
        })
      }
      if (req.body.clientName && req.body.clientName !== appointment.clientName) {
        changes.push({
          field: 'Nombre del cliente',
          old: appointment.clientName,
          new: req.body.clientName
        })
      }
      if (req.body.clientPhone && req.body.clientPhone !== appointment.clientPhone) {
        changes.push({
          field: 'Teléfono',
          old: appointment.clientPhone,
          new: req.body.clientPhone
        })
      }

      // Email de confirmación (cuando cambia de PENDIENTE a CONFIRMADA)
      if (req.body.status === 'CONFIRMADA' && previousStatus === 'PENDIENTE') {
        console.log('📧 Enviando email de confirmación...')
        const bookingData = {
          clientName: updatedAppointment.clientName,
          clientEmail: updatedAppointment.clientEmail,
          salonName: salonOwner.salonName || salonOwner.username,
          serviceName: updatedAppointment.service.name,
          date: format(updatedAppointment.date, 'PPP', { locale: es }),
          time: updatedAppointment.time,
          price: updatedAppointment.service.price,
          depositAmount: salonOwner.depositAmount ?? 0,
          salonAddress: salonOwner.address || 'Dirección no especificada',
          salonPhone: salonOwner.phone || 'Teléfono no especificado',
          bookingId: updatedAppointment.id.toString()
        }

        emailService.sendBookingConfirmation(bookingData)
          .then(result => {
            if (result.success) {
              console.log('✅ Email de confirmación enviado exitosamente')
            } else {
              console.error('❌ Error enviando email de confirmación:', result.error)
            }
          })
          .catch(error => {
            console.error('❌ Error en envío de email de confirmación:', error)
          })
      }

      // Email de modificación (cuando hay cambios en fecha/hora/datos del cliente)
      if (changes.length > 0 && updatedAppointment.status !== 'CANCELADA') {
        console.log('📧 Enviando email de modificación...')
        const modificationData = {
          clientName: updatedAppointment.clientName,
          clientEmail: updatedAppointment.clientEmail,
          salonName: salonOwner.salonName || salonOwner.username,
          serviceName: updatedAppointment.service.name,
          date: format(updatedAppointment.date, 'PPP', { locale: es }),
          time: updatedAppointment.time,
          price: updatedAppointment.service.price,
          depositAmount: salonOwner.depositAmount ?? 0,
          salonAddress: salonOwner.address || 'Dirección no especificada',
          salonPhone: salonOwner.phone || 'Teléfono no especificado',
          bookingId: updatedAppointment.id.toString(),
          changes: changes
        }

        emailService.sendBookingModification(modificationData)
          .then(result => {
            if (result.success) {
              console.log('✅ Email de modificación enviado exitosamente')
            } else {
              console.error('❌ Error enviando email de modificación:', result.error)
            }
          })
          .catch(error => {
            console.error('❌ Error en envío de email de modificación:', error)
          })
      }

    } catch (emailError) {
      console.error('❌ Error preparando emails:', emailError)
    }

    // Enviar email de cancelación si corresponde
    if (req.body.status === 'CANCELADA' && previousStatus !== 'CANCELADA') {
      try {
        console.log('🔄 Enviando email de cancelación...')
        const salonOwner = await prisma.user.findFirst({
          where: { id: req.user.id }
        })
        const bookingData = {
          clientName: updatedAppointment.clientName,
          clientEmail: updatedAppointment.clientEmail,
          salonName: salonOwner.salonName || salonOwner.username,
          serviceName: updatedAppointment.service.name,
          date: format(updatedAppointment.date, 'PPP', { locale: es }),
          time: updatedAppointment.time,
          salonPhone: salonOwner.phone || 'Teléfono no especificado'
        }

        console.log('📧 Datos del email de cancelación:', {
          cliente: bookingData.clientName,
          email: bookingData.clientEmail,
          salon: bookingData.salonName
        })

        // Enviar email de cancelación (no bloqueante)
        emailService.sendCancellationEmail(bookingData)
          .then(result => {
            if (result.success) {
              console.log('✅ Email de cancelación enviado exitosamente')
            } else {
              console.error('❌ Error enviando email de cancelación:', result.error)
            }
          })
          .catch(error => {
            console.error('❌ Error en envío de email de cancelación:', error)
          })

        // Cancelar recordatorio programado (no bloqueante)
        queueService.cancelReminder(updatedAppointment.id.toString())
          .then(result => {
            if (result.success) {
              console.log('🗑️ Recordatorio cancelado exitosamente')
            } else {
              console.log(`⚠️ ${result.message || 'No se pudo cancelar el recordatorio'}`)
            }
          })
          .catch(error => {
            console.error('Error cancelando recordatorio:', error)
          })

      } catch (emailError) {
        console.error('❌ Error preparando email de cancelación:', emailError)
      }
    }

    res.json({
      success: true,
      message: 'Cita actualizada exitosamente',
      data: updatedAppointment
    })
  } catch (error) {
    console.error('Error actualizando cita:', error)
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Error interno'
    })
  }
})

// DELETE /api/appointments/:id - Eliminar cita
router.delete('/:id', async (req, res) => {
  try {
    const appointment = await prisma.appointment.findFirst({
      where: {
        id: req.params.id,
        userId: req.user.id
      }
    })

    if (!appointment) {
      return res.status(404).json({
        success: false,
        message: 'Cita no encontrada'
      })
    }

    // Si tiene groupId, eliminar todas las citas del grupo
    if (appointment.groupId) {
      await prisma.appointment.deleteMany({
        where: { 
          groupId: appointment.groupId,
          userId: req.user.id
        }
      })
      console.log(`🗑️ Grupo ${appointment.groupId} eliminado completo`)
    } else {
      await prisma.appointment.delete({
        where: { id: req.params.id }
      })
    }

    res.json({
      success: true,
      message: 'Cita eliminada exitosamente'
    })
  } catch (error) {
    console.error('Error eliminando cita:', error)
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Error interno'
    })
  }
})

// GET /api/appointments/stats - Estadísticas de citas
router.get('/stats/summary', async (req, res) => {
  try {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const thisWeekStart = new Date(today)
    thisWeekStart.setDate(today.getDate() - today.getDay())
    const thisMonthStart = new Date(today.getFullYear(), today.getMonth(), 1)

    // Citas de hoy
    const todayCount = await prisma.appointment.count({
      where: {
        userId: req.user.id,
        date: {
          gte: today,
          lt: new Date(today.getTime() + 24 * 60 * 60 * 1000)
        },
        status: { not: 'CANCELADA' }
      }
    })

    // Citas de esta semana
    const thisWeekCount = await prisma.appointment.count({
      where: {
        userId: req.user.id,
        date: { gte: thisWeekStart },
        status: { not: 'CANCELADA' }
      }
    })

    // Citas de este mes
    const thisMonthCount = await prisma.appointment.count({
      where: {
        userId: req.user.id,
        date: { gte: thisMonthStart },
        status: { not: 'CANCELADA' }
      }
    })

    // Estadísticas por status
    const statusStats = await prisma.appointment.groupBy({
      by: ['status'],
      where: {
        userId: req.user.id,
        date: { gte: thisMonthStart }
      },
      _count: {
        _all: true
      }
    })

    // Ingresos del mes
    const monthlyRevenue = await prisma.appointment.aggregate({
      _sum: {
        paidAmount: true
      },
      where: {
        userId: req.user.id,
        date: { gte: thisMonthStart },
        status: 'COMPLETADA'
      }
    })

    res.json({
      success: true,
      stats: {
        today: todayCount,
        thisWeek: thisWeekCount,
        thisMonth: thisMonthCount,
        byStatus: statusStats,
        monthlyRevenue: monthlyRevenue._sum.paidAmount || 0
      }
    })
  } catch (error) {
    console.error('Error obteniendo estadísticas:', error)
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Error interno'
    })
  }
})

// PUT /api/appointments/:id/status - Actualizar solo el estado de una cita
router.put('/:id/status', [
  body('status')
    .isIn(['PENDIENTE', 'CONFIRMADA', 'COMPLETADA', 'CANCELADA', 'NO_ASISTIO'])
    .withMessage('Status inválido'),
  body('cancelReason')
    .optional()
    .trim()
    .isLength({ max: 200 })
    .withMessage('La razón de cancelación no puede tener más de 200 caracteres')
], async (req, res) => {
  try {
    console.log('🔄 PUT /appointments/:id/status - Datos recibidos:', {
      params: req.params,
      body: req.body,
      userId: req.user.id
    })
    
    // Verificar errores de validación
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      console.error('❌ Errores de validación:', errors.array())
      return res.status(400).json({
        success: false,
        message: 'Datos inválidos',
        errors: errors.array()
      })
    }

    // Buscar la cita
    const appointment = await prisma.appointment.findFirst({
      where: {
        id: req.params.id,
        userId: req.user.id
      }
    })

    if (!appointment) {
      return res.status(404).json({
        success: false,
        message: 'Cita no encontrada'
      })
    }

    // Preparar datos de actualización
    const updateData = {
      status: req.body.status
    }

    // Agregar razón de cancelación si se proporciona
    if (req.body.cancelReason) {
      updateData.cancelReason = req.body.cancelReason
    }

    // Si la cita tiene groupId, actualizar todas las citas del grupo
    if (appointment.groupId) {
      await prisma.appointment.updateMany({
        where: { 
          groupId: appointment.groupId,
          userId: req.user.id
        },
        data: updateData
      })
      console.log(`✅ Grupo ${appointment.groupId} actualizado a ${req.body.status}`)
    }

    // Actualizar la cita principal (o única)
    const updatedAppointment = await prisma.appointment.update({
      where: { id: req.params.id },
      data: updateData,
      include: {
        service: {
          select: {
            name: true,
            duration: true,
            price: true,
            category: true
          }
        }
      }
    })

    console.log('✅ Estado de cita actualizado exitosamente:', updatedAppointment.id)

    res.json({
      success: true,
      message: 'Estado de cita actualizado exitosamente',
      data: updatedAppointment
    })
  } catch (error) {
    console.error('Error actualizando estado de cita:', error)
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Error interno'
    })
  }
})

module.exports = router 