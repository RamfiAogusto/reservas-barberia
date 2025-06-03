const express = require('express')
const router = express.Router()
const User = require('../models/User')
const Service = require('../models/Service')
const Appointment = require('../models/Appointment')
const BusinessHours = require('../models/BusinessHours')
const RecurringBreak = require('../models/RecurringBreak')
const ScheduleException = require('../models/ScheduleException')
const { body, validationResult } = require('express-validator')
const emailService = require('../services/emailService')
const { format } = require('date-fns')
const { es } = require('date-fns/locale')

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

    // Convertir fecha usando parsing manual para evitar problemas de zona horaria
    const [year, month, day] = date.split('-').map(Number)
    const requestedDate = new Date(year, month - 1, day)
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

    const dayOfWeek = requestedDate.getDay()

    // 1. Verificar horarios base del día
    const businessHours = await BusinessHours.getByUserAndDay(user._id, dayOfWeek)
    
    if (!businessHours || !businessHours.isActive) {
      return res.json({
        success: true,
        data: {
          date: requestedDate.toISOString().split('T')[0],
          service: {
            name: service.name,
            duration: service.duration,
            price: service.price
          },
          isBusinessDay: false,
          availableSlots: [],
          reason: 'Día no laborable'
        }
      })
    }

    // 2. Verificar excepciones para esta fecha
    const exceptions = await ScheduleException.getByUserAndDate(user._id, requestedDate)
    
    // Si hay excepción de día libre
    const dayOffException = exceptions.find(ex => ex.isDayOff)
    if (dayOffException) {
      return res.json({
        success: true,
        data: {
          date: requestedDate.toISOString().split('T')[0],
          service: {
            name: service.name,
            duration: service.duration,
            price: service.price
          },
          isBusinessDay: false,
          availableSlots: [],
          reason: `${dayOffException.typeDescription}: ${dayOffException.name}`
        }
      })
    }

    // 3. Determinar horarios efectivos (normal o especial)
    let effectiveStartTime = businessHours.startTime
    let effectiveEndTime = businessHours.endTime

    const specialHoursException = exceptions.find(ex => ex.hasSpecialHours)
    if (specialHoursException) {
      effectiveStartTime = specialHoursException.specialStartTime
      effectiveEndTime = specialHoursException.specialEndTime
    }

    // 4. Obtener descansos que aplican este día
    const breaks = await RecurringBreak.getByUserAndDay(user._id, dayOfWeek)

    // 5. Obtener citas existentes
    const existingAppointments = await Appointment.find({
      userId: user._id,
      date: requestedDate,
      status: { $nin: ['cancelada', 'no_asistio'] }
    }).populate('serviceId', 'duration').select('time serviceId')

    // 6. Generar slots disponibles usando el motor avanzado con duración del servicio
    const allSlots = generateAdvancedSlotsPublic({
      startTime: effectiveStartTime,
      endTime: effectiveEndTime,
      breaks,
      existingAppointments,
      serviceDuration: service.duration, // Usar duración real del servicio
      targetDate: requestedDate
    })

    // Separar slots disponibles para compatibilidad
    const availableSlots = allSlots.filter(slot => slot.available).map(slot => slot.time)

    res.json({
      success: true,
      data: {
        date: requestedDate.toISOString().split('T')[0],
        service: {
          name: service.name,
          duration: service.duration,
          price: service.price
        },
        isBusinessDay: true,
        businessHours: {
          start: effectiveStartTime,
          end: effectiveEndTime,
          isSpecial: !!specialHoursException
        },
        availableSlots: availableSlots,
        allSlots: allSlots, // Incluir todos los slots con su estado
        totalSlots: availableSlots.length
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

// GET /api/public/salon/:username/availability/advanced - Obtener disponibilidad con sistema avanzado
router.get('/salon/:username/availability/advanced', async (req, res) => {
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

    // Convertir fecha usando parsing manual para evitar problemas de zona horaria
    const [year, month, day] = date.split('-').map(Number)
    const targetDate = new Date(year, month - 1, day)
    targetDate.setHours(0, 0, 0, 0)
    const dayOfWeek = targetDate.getDay()

    // 1. Obtener horarios base
    const businessHours = await BusinessHours.getByUserAndDay(user._id, dayOfWeek)
    
    if (!businessHours || !businessHours.isActive) {
      return res.json({
        success: true,
        data: {
          date: date,
          isBusinessDay: false,
          reason: 'Día no laborable',
          availableSlots: []
        }
      })
    }

    // 2. Verificar excepciones de horario para esta fecha
    const exceptions = await ScheduleException.find({
      userId: user._id,
      isActive: true,
      $or: [
        {
          startDate: { $lte: targetDate },
          endDate: { $gte: targetDate }
        }
      ]
    })

    let effectiveStartTime = businessHours.startTime
    let effectiveEndTime = businessHours.endTime
    let isSpecialDay = false

    // Verificar si hay alguna excepción que aplique
    for (const exception of exceptions) {
      if (exception.exceptionType === 'day_off' || exception.exceptionType === 'vacation' || exception.exceptionType === 'holiday') {
        return res.json({
          success: true,
          data: {
            date: date,
            isBusinessDay: false,
            reason: `${exception.name} - ${exception.exceptionType}`,
            availableSlots: []
          }
        })
      }

      if (exception.exceptionType === 'special_hours' && exception.specialStartTime && exception.specialEndTime) {
        effectiveStartTime = exception.specialStartTime
        effectiveEndTime = exception.specialEndTime
        isSpecialDay = true
      }
    }

    // 3. Obtener descansos recurrentes que apliquen
    const breaks = await RecurringBreak.find({
      userId: user._id,
      isActive: true
    })

    const applicableBreaks = breaks.filter(breakItem => {
      if (breakItem.recurrenceType === 'daily') return true
      if (breakItem.recurrenceType === 'specific_days') {
        return breakItem.specificDays.includes(dayOfWeek)
      }
      return false
    })

    // 4. Obtener citas existentes para esa fecha
    const existingAppointments = await Appointment.find({
      userId: user._id,
      date: targetDate,
      status: { $in: ['confirmada', 'pendiente'] }
    }).populate('serviceId', 'duration').select('time serviceId')

    // 5. Generar slots disponibles usando el motor avanzado
    const allSlots = generateAdvancedSlotsPublic({
      startTime: effectiveStartTime,
      endTime: effectiveEndTime,
      breaks: applicableBreaks,
      existingAppointments,
      serviceDuration: service.duration, // Usar duración real del servicio
      targetDate
    })

    // Separar slots disponibles para compatibilidad
    const availableSlots = allSlots.filter(slot => slot.available).map(slot => slot.time)

    res.json({
      success: true,
      data: {
        date: date,
        isBusinessDay: true,
        businessHours: {
          start: effectiveStartTime,
          end: effectiveEndTime,
          isSpecial: isSpecialDay
        },
        breaks: applicableBreaks.map(b => ({
          name: b.name,
          startTime: b.startTime,
          endTime: b.endTime,
          recurrenceType: b.recurrenceType
        })),
        availableSlots: availableSlots,
        allSlots: allSlots, // Incluir todos los slots con su estado
        totalSlots: availableSlots.length
      }
    })

  } catch (error) {
    console.error('Error en disponibilidad avanzada pública:', error)
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    })
  }
})

// GET /api/public/salon/:username/days-status - Verificar disponibilidad de múltiples días
router.get('/salon/:username/days-status', async (req, res) => {
  try {
    const { username } = req.params
    const { startDate, endDate } = req.query

    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: 'Fechas de inicio y fin son requeridas'
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

    // Crear fechas usando parsing manual para evitar problemas de zona horaria
    const [startYear, startMonth, startDay] = startDate.split('-').map(Number)
    const start = new Date(startYear, startMonth - 1, startDay)
    start.setHours(0, 0, 0, 0)

    const [endYear, endMonth, endDay] = endDate.split('-').map(Number)
    const end = new Date(endYear, endMonth - 1, endDay)
    end.setHours(0, 0, 0, 0)
    const days = []

    // Iterar por cada día en el rango
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const currentDate = new Date(d)
      const dayOfWeek = currentDate.getDay()
      
      // Generar string de fecha en formato YYYY-MM-DD
      const year = currentDate.getFullYear()
      const month = String(currentDate.getMonth() + 1).padStart(2, '0')
      const day = String(currentDate.getDate()).padStart(2, '0')
      const dateString = `${year}-${month}-${day}`

      // Verificar horarios base
      const businessHours = await BusinessHours.getByUserAndDay(user._id, dayOfWeek)
      
      if (!businessHours || !businessHours.isActive) {
        days.push({
          date: dateString,
          available: false,
          reason: 'Día no laborable',
          type: 'closed'
        })
        continue
      }

      // Verificar excepciones
      const exceptions = await ScheduleException.find({
        userId: user._id,
        isActive: true,
        startDate: { $lte: currentDate },
        endDate: { $gte: currentDate }
      })

      let isAvailable = true
      let reason = ''
      let type = 'available'

      for (const exception of exceptions) {
        if (exception.exceptionType === 'day_off' || exception.exceptionType === 'vacation' || exception.exceptionType === 'holiday') {
          isAvailable = false
          reason = exception.name
          type = exception.exceptionType
          break
        }
        
        if (exception.exceptionType === 'special_hours') {
          type = 'special_hours'
          reason = exception.name
        }
      }

      days.push({
        date: dateString,
        available: isAvailable,
        reason: reason,
        type: type,
        businessHours: isAvailable ? {
          start: businessHours.startTime,
          end: businessHours.endTime
        } : null
      })
    }

    res.json({
      success: true,
      data: {
        salonName: user.salonName,
        days: days
      }
    })

  } catch (error) {
    console.error('Error verificando días:', error)
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

    // Verificar disponibilidad usando parsing manual de fecha
    const [dateYear, dateMonth, dateDay] = date.split('-').map(Number)
    const appointmentDate = new Date(dateYear, dateMonth - 1, dateDay)
    appointmentDate.setHours(0, 0, 0, 0)

    const existingAppointment = await Appointment.checkAvailability(
      user._id, 
      appointmentDate, 
      time, 
      serviceId
    )

    if (existingAppointment) {
      return res.status(409).json({
        success: false,
        message: 'Este horario ya está ocupado o no hay suficiente tiempo disponible'
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

    // Preparar y enviar email de confirmación
    try {
      const bookingData = {
        clientName,
        clientEmail,
        salonName: user.salonName || user.username,
        serviceName: newAppointment.serviceId.name,
        date: format(appointmentDate, 'PPP', { locale: es }),
        time,
        price: service.price,
        depositAmount: service.depositAmount || 0,
        salonAddress: user.address || 'Dirección no especificada',
        salonPhone: user.phone || 'Teléfono no especificado',
        bookingId: newAppointment._id.toString()
      }

      // Enviar correo de confirmación (no bloqueante)
      emailService.sendBookingConfirmation(bookingData)
        .then(result => {
          if (result.success) {
            console.log('Email de confirmación enviado exitosamente para reserva:', newAppointment._id)
          } else {
            console.error('Error enviando email de confirmación:', result.error)
          }
        })
        .catch(error => {
          console.error('Error en envío de email:', error)
        })
    } catch (emailError) {
      console.error('Error preparando email de confirmación:', emailError)
      // No afecta la respuesta principal
    }

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

// Función helper para generar slots avanzados (versión pública)
function generateAdvancedSlotsPublic({ startTime, endTime, breaks, existingAppointments, serviceDuration, targetDate }) {
  // Convertir horarios a minutos
  const [startHour, startMin] = startTime.split(':').map(Number)
  const [endHour, endMin] = endTime.split(':').map(Number)
  
  const startMinutes = startHour * 60 + startMin
  const endMinutes = endHour * 60 + endMin
  
  // Crear array de todos los slots posibles (cada slot es del tamaño del servicio)
  const allSlots = []
  for (let minutes = startMinutes; minutes <= endMinutes - serviceDuration; minutes += 30) { // Incrementar de 30 en 30 pero verificar que cabe el servicio completo
    const hour = Math.floor(minutes / 60)
    const min = minutes % 60
    const timeString = `${hour.toString().padStart(2, '0')}:${min.toString().padStart(2, '0')}`
    
    // Verificar que el slot completo (duración del servicio) cabe en el horario
    if (minutes + serviceDuration <= endMinutes) {
      allSlots.push({
        time: timeString,
        available: true,
        reason: null
      })
    }
  }
  
  // Crear un mapa de ocupación en minutos para verificar conflictos
  const occupiedMinutes = new Set()
  
  // Marcar minutos ocupados por citas existentes
  existingAppointments.forEach(apt => {
    const [aptHour, aptMin] = apt.time.split(':').map(Number)
    const aptStartMinutes = aptHour * 60 + aptMin
    const aptDuration = apt.serviceId?.duration || 30 // Usar duración del servicio o 30 min por defecto
    
    // Marcar todos los minutos ocupados por esta cita
    for (let i = 0; i < aptDuration; i++) {
      occupiedMinutes.add(aptStartMinutes + i)
    }
  })
  
  // Marcar slots como ocupados si tienen conflictos con citas existentes
  allSlots.forEach(slot => {
    const [slotHour, slotMin] = slot.time.split(':').map(Number)
    const slotStartMinutes = slotHour * 60 + slotMin
    
    // Verificar si algún minuto del servicio está ocupado
    for (let i = 0; i < serviceDuration; i++) {
      if (occupiedMinutes.has(slotStartMinutes + i)) {
        slot.available = false
        slot.reason = 'Horario ocupado'
        break
      }
    }
  })
  
  // Marcar slots ocupados por descansos
  breaks.forEach(breakItem => {
    if (breakItem.appliesOnDay && breakItem.appliesOnDay(targetDate.getDay())) {
      const [breakStartHour, breakStartMin] = breakItem.startTime.split(':').map(Number)
      const [breakEndHour, breakEndMin] = breakItem.endTime.split(':').map(Number)
      
      const breakStartMinutes = breakStartHour * 60 + breakStartMin
      const breakEndMinutes = breakEndHour * 60 + breakEndMin
      
      allSlots.forEach(slot => {
        const [slotHour, slotMin] = slot.time.split(':').map(Number)
        const slotStartMinutes = slotHour * 60 + slotMin
        const slotEndMinutes = slotStartMinutes + serviceDuration
        
        // El servicio completo no debe solaparse con el descanso
        if (slotStartMinutes < breakEndMinutes && slotEndMinutes > breakStartMinutes) {
          slot.available = false
          slot.reason = breakItem.name || 'Tiempo de descanso'
        }
      })
    }
  })
  
  // Si es hoy, marcar horarios que ya pasaron
  const now = new Date()
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  
  if (targetDate.getTime() === today.getTime()) {
    const currentHour = now.getHours()
    const currentMinute = now.getMinutes()
    
    allSlots.forEach(slot => {
      const [slotHour, slotMinute] = slot.time.split(':').map(Number)
      const slotStartMinutes = slotHour * 60 + slotMinute
      const currentMinutes = currentHour * 60 + currentMinute
      
      // El servicio debe poder completarse después del tiempo actual + buffer
      const bufferMinutes = 15
      if (slotStartMinutes < currentMinutes + bufferMinutes) {
        slot.available = false
        slot.reason = 'Horario pasado'
      }
    })
  }
  
  return allSlots
}

module.exports = router 