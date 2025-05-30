const express = require('express')
const router = express.Router()
const User = require('../models/User')
const Service = require('../models/Service')
const Appointment = require('../models/Appointment')
const { body, validationResult } = require('express-validator')

// GET /api/public/salon/:username - Obtener perfil público del salón
router.get('/salon/:username', async (req, res) => {
  try {
    const { username } = req.params

    // Buscar el usuario por username (sin contraseña)
    const user = await User.findOne({ 
      username: username.toLowerCase(),
      isActive: true 
    }).select('-password')

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Salón no encontrado'
      })
    }

    // Buscar servicios activos del salón
    const services = await Service.find({ 
      userId: user._id,
      isActive: true 
    }).sort({ category: 1, name: 1 })

    // Estructura de respuesta pública
    const salonProfile = {
      username: user.username,
      salonName: user.salonName,
      phone: user.phone,
      address: user.address,
      avatar: user.avatar,
      services: services.map(service => ({
        _id: service._id,
        name: service.name,
        description: service.description,
        category: service.category,
        price: service.price,
        duration: service.duration,
        requiresDeposit: service.requiresPayment,
        depositAmount: service.depositAmount
      }))
    }

    res.status(200).json({
      success: true,
      data: salonProfile
    })

  } catch (error) {
    console.error('Error al obtener perfil público:', error)
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    })
  }
})

// GET /api/public/salon/:username/services - Obtener solo servicios del salón
router.get('/salon/:username/services', async (req, res) => {
  try {
    const { username } = req.params

    // Buscar el usuario
    const user = await User.findOne({ 
      username: username.toLowerCase(),
      isActive: true 
    })

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Salón no encontrado'
      })
    }

    // Buscar servicios agrupados por categoría
    const services = await Service.find({ 
      userId: user._id,
      isActive: true 
    }).sort({ category: 1, name: 1 })

    // Agrupar servicios por categoría
    const servicesByCategory = services.reduce((acc, service) => {
      const category = service.category || 'otros'
      if (!acc[category]) {
        acc[category] = []
      }
      acc[category].push({
        _id: service._id,
        name: service.name,
        description: service.description,
        price: service.price,
        duration: service.duration,
        requiresDeposit: service.requiresPayment,
        depositAmount: service.depositAmount
      })
      return acc
    }, {})

    res.status(200).json({
      success: true,
      data: {
        salonName: user.salonName,
        services: servicesByCategory
      }
    })

  } catch (error) {
    console.error('Error al obtener servicios públicos:', error)
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    })
  }
})

// GET /api/public/salon/:username/availability - Obtener slots disponibles para una fecha
router.get('/salon/:username/availability', async (req, res) => {
  try {
    const { username } = req.params
    const { date, serviceId } = req.query

    if (!date || !serviceId) {
      return res.status(400).json({
        success: false,
        message: 'Fecha y servicio son requeridos'
      })
    }

    // Buscar el usuario
    const user = await User.findOne({ 
      username: username.toLowerCase(),
      isActive: true 
    })

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Salón no encontrado'
      })
    }

    // Buscar el servicio
    const service = await Service.findOne({
      _id: serviceId,
      userId: user._id,
      isActive: true
    })

    if (!service) {
      return res.status(404).json({
        success: false,
        message: 'Servicio no encontrado'
      })
    }

    // Convertir fecha a Date object
    const requestedDate = new Date(date)
    requestedDate.setHours(0, 0, 0, 0)

    // Verificar que la fecha no sea pasada
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    if (requestedDate < today) {
      return res.status(400).json({
        success: false,
        message: 'No se pueden hacer reservas en fechas pasadas'
      })
    }

    // Obtener citas existentes para esa fecha
    const existingAppointments = await Appointment.find({
      userId: user._id,
      date: requestedDate,
      status: { $nin: ['cancelada', 'no_asistio'] }
    }).select('time')

    // Horarios base (esto debería venir de una configuración)
    // Por ahora usaremos horarios fijos: 9:00 AM - 6:00 PM
    const startHour = 9
    const endHour = 18
    const slotDuration = 30 // minutos por slot

    // Generar todos los slots posibles
    const allSlots = []
    for (let hour = startHour; hour < endHour; hour++) {
      for (let minute = 0; minute < 60; minute += slotDuration) {
        const timeSlot = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`
        allSlots.push(timeSlot)
      }
    }

    // Filtrar slots ocupados
    const occupiedTimes = existingAppointments.map(apt => apt.time)
    const availableSlots = allSlots.filter(slot => !occupiedTimes.includes(slot))

    // Si la fecha es hoy, filtrar horarios que ya pasaron
    if (requestedDate.getTime() === today.getTime()) {
      const now = new Date()
      const currentHour = now.getHours()
      const currentMinute = now.getMinutes()
      
      const filteredSlots = availableSlots.filter(slot => {
        const [slotHour, slotMinute] = slot.split(':').map(Number)
        if (slotHour > currentHour) return true
        if (slotHour === currentHour && slotMinute > currentMinute + 30) return true // 30 min buffer
        return false
      })
      
      return res.json({
        success: true,
        data: {
          date: requestedDate.toISOString().split('T')[0],
          service: {
            name: service.name,
            duration: service.duration,
            price: service.price
          },
          availableSlots: filteredSlots
        }
      })
    }

    res.json({
      success: true,
      data: {
        date: requestedDate.toISOString().split('T')[0],
        service: {
          name: service.name,
          duration: service.duration,
          price: service.price
        },
        availableSlots
      }
    })

  } catch (error) {
    console.error('Error al obtener disponibilidad:', error)
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    })
  }
})

// POST /api/public/salon/:username/book - Crear una nueva reserva
router.post('/salon/:username/book', [
  body('serviceId').notEmpty().withMessage('El servicio es requerido'),
  body('clientName').trim().notEmpty().withMessage('El nombre es requerido'),
  body('clientEmail').isEmail().withMessage('Email inválido'),
  body('clientPhone').trim().notEmpty().withMessage('El teléfono es requerido'),
  body('date').isISO8601().withMessage('Fecha inválida'),
  body('time').matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).withMessage('Hora inválida'),
  body('notes').optional().trim()
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

    const { username } = req.params
    const { serviceId, clientName, clientEmail, clientPhone, date, time, notes } = req.body

    // Buscar el usuario
    const user = await User.findOne({ 
      username: username.toLowerCase(),
      isActive: true 
    })

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Salón no encontrado'
      })
    }

    // Buscar el servicio
    const service = await Service.findOne({
      _id: serviceId,
      userId: user._id,
      isActive: true
    })

    if (!service) {
      return res.status(404).json({
        success: false,
        message: 'Servicio no encontrado'
      })
    }

    // Verificar disponibilidad
    const appointmentDate = new Date(date)
    const existingAppointment = await Appointment.checkAvailability(
      user._id, 
      appointmentDate, 
      time, 
      serviceId
    )

    if (existingAppointment) {
      return res.status(409).json({
        success: false,
        message: 'Este horario ya está ocupado'
      })
    }

    // Crear la cita
    const newAppointment = new Appointment({
      userId: user._id,
      serviceId: service._id,
      clientName,
      clientEmail,
      clientPhone,
      date: appointmentDate,
      time,
      notes: notes || '',
      totalAmount: service.price,
      status: service.requiresPayment ? 'pendiente' : 'confirmada',
      paymentStatus: service.requiresPayment ? 'pendiente' : 'completo'
    })

    await newAppointment.save()

    // Poblar con datos del servicio para la respuesta
    await newAppointment.populate('serviceId', 'name duration price category')

    res.status(201).json({
      success: true,
      message: 'Reserva creada exitosamente',
      data: {
        appointmentId: newAppointment._id,
        clientName: newAppointment.clientName,
        service: newAppointment.serviceId.name,
        date: newAppointment.formattedDate,
        time: newAppointment.time,
        status: newAppointment.status,
        totalAmount: newAppointment.totalAmount,
        requiresPayment: service.requiresPayment,
        depositAmount: service.depositAmount
      }
    })

  } catch (error) {
    console.error('Error al crear reserva:', error)
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    })
  }
})

module.exports = router 