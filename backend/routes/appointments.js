const express = require('express')
const { body, validationResult, query } = require('express-validator')
const Appointment = require('../models/Appointment')
const Service = require('../models/Service')
const { authenticateToken } = require('../middleware/auth')
const router = express.Router()

// Middleware de autenticación para todas las rutas
router.use(authenticateToken)

// GET /api/appointments - Obtener citas del usuario con filtros
router.get('/', [
  query('date').optional().isISO8601().withMessage('Formato de fecha inválido'),
  query('status').optional().isIn(['pendiente', 'confirmada', 'completada', 'cancelada', 'no_asistio']).withMessage('Status inválido'),
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
    let query = { userId: req.user._id }

    // Filtrar por fecha específica
    if (date) {
      const filterDate = new Date(date)
      filterDate.setHours(0, 0, 0, 0)
      const nextDay = new Date(filterDate)
      nextDay.setDate(nextDay.getDate() + 1)
      
      query.date = {
        $gte: filterDate,
        $lt: nextDay
      }
    }

    // Filtrar por rango de fechas
    if (startDate && endDate) {
      query.date = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      }
    }

    // Filtrar por status
    if (status) {
      query.status = status
    }

    const appointments = await Appointment.find(query)
      .populate('serviceId', 'name duration price category')
      .sort({ date: 1, time: 1 })

    res.json({
      success: true,
      count: appointments.length,
      data: appointments
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
    const appointments = await Appointment.getTodayAppointments(req.user._id)
    
    res.json({
      success: true,
      count: appointments.length,
      data: appointments
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
    const appointment = await Appointment.findOne({
      _id: req.params.id,
      userId: req.user._id
    }).populate('serviceId', 'name duration price category')

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
    .isMongoId()
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
    .withMessage('El nombre del staff no puede tener más de 100 caracteres')
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

    const { serviceId, clientName, clientEmail, clientPhone, date, time, notes, staffMember } = req.body

    // Verificar que el servicio existe y pertenece al usuario
    const service = await Service.findOne({
      _id: serviceId,
      userId: req.user._id,
      isActive: true
    })

    if (!service) {
      return res.status(400).json({
        success: false,
        message: 'Servicio no encontrado o inactivo'
      })
    }

    // Verificar disponibilidad del horario
    const existingAppointment = await Appointment.checkAvailability(req.user._id, new Date(date), time, serviceId)
    if (existingAppointment) {
      return res.status(400).json({
        success: false,
        message: 'Ya tienes una cita programada en este horario'
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
    const newAppointment = new Appointment({
      userId: req.user._id,
      serviceId,
      clientName,
      clientEmail,
      clientPhone,
      date: new Date(date),
      time,
      notes,
      staffMember,
      totalAmount: service.price,
      status: 'pendiente'
    })

    await newAppointment.save()

    // Populate para la respuesta
    await newAppointment.populate('serviceId', 'name duration price category')

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
    .isMongoId()
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
    .isIn(['pendiente', 'confirmada', 'completada', 'cancelada', 'no_asistio'])
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
    // Verificar errores de validación
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Datos inválidos',
        errors: errors.array()
      })
    }

    // Buscar la cita
    const appointment = await Appointment.findOne({
      _id: req.params.id,
      userId: req.user._id
    })

    if (!appointment) {
      return res.status(404).json({
        success: false,
        message: 'Cita no encontrada'
      })
    }

    // Si se está cambiando la fecha/hora, verificar disponibilidad
    if ((req.body.date || req.body.time) && appointment.status !== 'cancelada') {
      const newDate = req.body.date ? new Date(req.body.date) : appointment.date
      const newTime = req.body.time || appointment.time

      const existingAppointment = await Appointment.checkAvailability(
        req.user._id, 
        newDate, 
        newTime, 
        appointment.serviceId, 
        appointment._id
      )

      if (existingAppointment) {
        return res.status(400).json({
          success: false,
          message: 'Ya tienes una cita programada en este horario'
        })
      }
    }

    // Si se está cancelando, agregar fecha de cancelación
    if (req.body.status === 'cancelada' && appointment.status !== 'cancelada') {
      req.body.cancelledAt = new Date()
    }

    // Actualizar campos
    Object.keys(req.body).forEach(key => {
      if (req.body[key] !== undefined) {
        appointment[key] = req.body[key]
      }
    })

    await appointment.save()

    // Populate para la respuesta
    await appointment.populate('serviceId', 'name duration price category')

    res.json({
      success: true,
      message: 'Cita actualizada exitosamente',
      data: appointment
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
    const appointment = await Appointment.findOne({
      _id: req.params.id,
      userId: req.user._id
    })

    if (!appointment) {
      return res.status(404).json({
        success: false,
        message: 'Cita no encontrada'
      })
    }

    await appointment.deleteOne()

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
    const todayCount = await Appointment.countDocuments({
      userId: req.user._id,
      date: {
        $gte: today,
        $lt: new Date(today.getTime() + 24 * 60 * 60 * 1000)
      },
      status: { $nin: ['cancelada'] }
    })

    // Citas de esta semana
    const thisWeekCount = await Appointment.countDocuments({
      userId: req.user._id,
      date: { $gte: thisWeekStart },
      status: { $nin: ['cancelada'] }
    })

    // Citas de este mes
    const thisMonthCount = await Appointment.countDocuments({
      userId: req.user._id,
      date: { $gte: thisMonthStart },
      status: { $nin: ['cancelada'] }
    })

    // Estadísticas por status
    const statusStats = await Appointment.aggregate([
      {
        $match: {
          userId: req.user._id,
          date: { $gte: thisMonthStart }
        }
      },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ])

    // Ingresos del mes
    const monthlyRevenue = await Appointment.aggregate([
      {
        $match: {
          userId: req.user._id,
          date: { $gte: thisMonthStart },
          status: 'completada'
        }
      },
      {
        $group: {
          _id: null,
          total: { $sum: '$paidAmount' }
        }
      }
    ])

    res.json({
      success: true,
      stats: {
        today: todayCount,
        thisWeek: thisWeekCount,
        thisMonth: thisMonthCount,
        byStatus: statusStats,
        monthlyRevenue: monthlyRevenue[0]?.total || 0
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

module.exports = router 