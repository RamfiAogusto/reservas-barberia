const express = require('express')
const router = express.Router()
const rateLimit = require('express-rate-limit')
const { prisma } = require('../lib/prisma')
const { body, validationResult } = require('express-validator')
const emailService = require('../services/emailService')
const queueService = require('../services/queueService')
const { format } = require('date-fns')
const { es } = require('date-fns/locale')
const { createAppointmentWithOverlapCheck, createAppointmentWithAutoAssign, getAvailableBarbersForSlot, createMultiServiceAppointments } = require('../utils/availabilityUtils')
const { emitToSalon } = require('../services/socketService')
const paymentGateway = require('../services/paymentGatewayService')
const sendAndLog = require('../utils/sendAndLog')

// GET /api/public/salon/:username - Obtener perfil público del salón
router.get('/salon/:username', async (req, res) => {
  try {
    const { username } = req.params

    // Buscar el usuario por username (sin contraseña)
    const user = await prisma.user.findFirst({
      where: { 
        username: username.toLowerCase(),
        isActive: true 
      },
      select: {
        id: true,
        username: true,
        salonName: true,
        phone: true,
        address: true,
        avatar: true,
        requiresDeposit: true,
        depositAmount: true,
        bookingMode: true,
        holdDurationMinutes: true
      }
    })

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Salón no encontrado'
      })
    }

    // Buscar servicios activos del salón
    const services = await prisma.service.findMany({
      where: { 
        userId: user.id,
        isActive: true 
      },
      orderBy: [
        { category: 'asc' },
        { name: 'asc' }
      ]
    })

    // Buscar imágenes destacadas del salón
    const featuredImages = await prisma.businessImage.findMany({
      where: {
        userId: user.id,
        isActive: true,
        isFeatured: true
      },
      orderBy: [
        { order: 'asc' },
        { createdAt: 'desc' }
      ],
      take: 6
    })

    // Buscar barberos activos del salón
    const barbers = await prisma.barber.findMany({
      where: {
        userId: user.id,
        isActive: true
      },
      orderBy: { name: 'asc' }
    })

    // Estructura de respuesta pública
    // Depósito: a nivel salón, para confirmar la reserva. El precio del servicio se paga completo al llegar.
    const salonProfile = {
      username: user.username,
      salonName: user.salonName,
      phone: user.phone,
      address: user.address,
      avatar: user.avatar,
      requiresDeposit: user.requiresDeposit ?? false,
      depositAmount: user.depositAmount ?? 0,
      bookingMode: user.bookingMode || 'LIBRE',
      holdDurationMinutes: user.holdDurationMinutes || 15,
      services: services.map(service => ({
        _id: service.id,
        name: service.name,
        description: service.description,
        category: service.category,
        price: service.price,
        duration: service.duration,
        showDuration: service.showDuration
      })),
      gallery: featuredImages.map(img => ({
        _id: img.id,
        imageUrl: img.imageUrl,
        title: img.title,
        description: img.description,
        category: img.category
      })),
      barbers: barbers.map(b => ({
        id: b.id,
        _id: b.id,
        name: b.name,
        phone: b.phone,
        avatar: b.avatar,
        specialty: b.specialty
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
    const user = await prisma.user.findFirst({ 
      where: { 
        username: username.toLowerCase(),
        isActive: true 
      }
    })

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Salón no encontrado'
      })
    }

    // Buscar servicios agrupados por categoría
    const services = await prisma.service.findMany({ 
      where: { 
        userId: user.id,
        isActive: true 
      },
      orderBy: [
        { category: 'asc' },
        { name: 'asc' }
      ]
    })

    // Agrupar servicios por categoría
    const servicesByCategory = services.reduce((acc, service) => {
      const category = service.category || 'otros'
      if (!acc[category]) {
        acc[category] = []
      }
      acc[category].push({
        _id: service.id,
        name: service.name,
        description: service.description,
        price: service.price,
        duration: service.duration
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
    const user = await prisma.user.findFirst({ 
      where: { 
        username: username.toLowerCase(),
        isActive: true 
      }
    })

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Salón no encontrado'
      })
    }

    // Buscar el servicio
    const service = await prisma.service.findFirst({
      where: {
        id: serviceId,
        userId: user.id,
        isActive: true
      }
    })

    if (!service) {
      return res.status(404).json({
        success: false,
        message: 'Servicio no encontrado'
      })
    }

    // Soporte multi-servicio: si se pasa totalDuration, usarlo en vez de la duración del servicio
    const serviceDuration = req.query.totalDuration ? parseInt(req.query.totalDuration) : service.duration

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
    const businessHours = await prisma.businessHour.findFirst({
      where: {
        userId: user.id,
        dayOfWeek: dayOfWeek
      }
    })
    
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
    const exceptions = await prisma.scheduleException.findMany({
      where: {
        userId: user.id,
        isActive: true,
        startDate: { lte: requestedDate },
        endDate: { gte: requestedDate }
      }
    })

    const isDayOffType = (type) => ['DAY_OFF', 'VACATION', 'HOLIDAY'].includes(String(type).toUpperCase())
    const hasSpecialHours = (ex) => String(ex.exceptionType).toUpperCase() === 'SPECIAL_HOURS' && ex.specialStartTime && ex.specialEndTime
    const getExceptionTypeLabel = (type) => ({ DAY_OFF: 'Día libre', SPECIAL_HOURS: 'Horario especial', VACATION: 'Vacaciones', HOLIDAY: 'Día festivo' }[String(type).toUpperCase()] || type)
    
    // Si hay excepción de día libre
    const dayOffException = exceptions.find(ex => isDayOffType(ex.exceptionType))
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
          reason: `${getExceptionTypeLabel(dayOffException.exceptionType)}: ${dayOffException.name}`
        }
      })
    }

    // 3. Determinar horarios efectivos (normal o especial)
    let effectiveStartTime = businessHours.startTime
    let effectiveEndTime = businessHours.endTime

    const specialHoursException = exceptions.find(ex => hasSpecialHours(ex))
    if (specialHoursException) {
      effectiveStartTime = specialHoursException.specialStartTime
      effectiveEndTime = specialHoursException.specialEndTime
    }

    // 4. Obtener descansos que aplican este día (filtrar por recurrencia)
    const allBreaks = await prisma.recurringBreak.findMany({
      where: { userId: user.id, isActive: true }
    })
    const breaks = allBreaks.filter(b => {
      const rt = String(b.recurrenceType).toUpperCase()
      if (rt === 'DAILY') return true
      if (rt === 'SPECIFIC_DAYS' && Array.isArray(b.specificDays)) return b.specificDays.includes(dayOfWeek)
      return false
    })

    // 5. Obtener barberos activos del salón
    const barbers = await prisma.barber.findMany({
      where: { userId: user.id, isActive: true }
    })
    const hasBarbers = barbers.length > 0
    const requestedBarberId = req.query.barberId // puede ser un ID, 'any', o undefined

    // 6. Obtener citas existentes según el modo de barbero
    const appointmentWhere = {
      userId: user.id,
      date: requestedDate,
      status: { notIn: ['CANCELADA', 'EXPIRADA'] }
    }
    // Solo filtrar por barbero específico si se pasa un ID real (no 'any')
    if (requestedBarberId && requestedBarberId !== 'any' && hasBarbers) {
      appointmentWhere.barberId = requestedBarberId
    }

    const existingAppointments = await prisma.appointment.findMany({
      where: appointmentWhere,
      include: {
        service: { select: { duration: true } }
      }
    })

    // 7. Generar slots base (sin filtro de citas — lo haremos después por barbero)
    const isAnyBarberMode = hasBarbers && (!requestedBarberId || requestedBarberId === 'any')

    let slotsToUse
    if (isAnyBarberMode) {
      // Modo "cualquier barbero": generar slots sin citas, luego marcar por disponibilidad multi-barbero
      const baseSlots = generateAdvancedSlotsPublic({
        startTime: effectiveStartTime,
        endTime: effectiveEndTime,
        breaks,
        existingAppointments: [], // Sin citas — verificaremos por barbero
        serviceDuration,
        targetDate: requestedDate
      })

      // Para cada slot, verificar si AL MENOS un barbero está disponible
      for (const slot of baseSlots) {
        if (!slot.available) continue // Ya bloqueado por horario/descanso/pasado
        const freeBarberIds = getAvailableBarbersForSlot(barbers, existingAppointments, slot.time, serviceDuration)
        if (freeBarberIds.length === 0) {
          slot.available = false
          slot.reason = 'Todos los barberos ocupados'
        } else {
          slot.availableBarbers = freeBarberIds.map(id => {
            const b = barbers.find(bb => bb.id === id)
            return { id, name: b?.name || 'Barbero' }
          })
          slot.totalBarbers = barbers.length
        }
      }
      slotsToUse = baseSlots
    } else {
      // Modo barbero específico o sin barberos: lógica original
      slotsToUse = generateAdvancedSlotsPublic({
        startTime: effectiveStartTime,
        endTime: effectiveEndTime,
        breaks,
        existingAppointments,
        serviceDuration: service.duration,
        targetDate: requestedDate
      })
    }

    const availableSlots = slotsToUse.filter(slot => slot.available).map(slot => slot.time)

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
        allSlots: slotsToUse,
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
    const user = await prisma.user.findFirst({ 
      where: { 
        username: username.toLowerCase(),
        isActive: true 
      }
    })

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Salón no encontrado'
      })
    }

    // Buscar el servicio
    const service = await prisma.service.findFirst({
      where: {
        id: serviceId,
        userId: user.id,
        isActive: true
      }
    })

    if (!service) {
      return res.status(404).json({
        success: false,
        message: 'Servicio no encontrado'
      })
    }

    // Soporte multi-servicio: si se pasa totalDuration, usarlo en vez de la duración del servicio
    const serviceDuration = req.query.totalDuration ? parseInt(req.query.totalDuration) : service.duration

    // Convertir fecha usando parsing manual para evitar problemas de zona horaria
    const [year, month, day] = date.split('-').map(Number)
    const targetDate = new Date(year, month - 1, day)
    targetDate.setHours(0, 0, 0, 0)
    const dayOfWeek = targetDate.getDay()

    // 1. Obtener horarios base
    const businessHours = await prisma.businessHour.findFirst({
      where: {
        userId: user.id,
        dayOfWeek: dayOfWeek
      }
    })
    
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
    const exceptions = await prisma.scheduleException.findMany({
             where: {
         userId: user.id,
         isActive: true,
         OR: [
           {
             startDate: { lte: targetDate },
             endDate: { gte: targetDate }
           }
         ]
       }
    })

    let effectiveStartTime = businessHours.startTime
    let effectiveEndTime = businessHours.endTime
    let isSpecialDay = false

    // Verificar si hay alguna excepción que aplique
    const isDayOffType = (type) => ['DAY_OFF', 'VACATION', 'HOLIDAY'].includes(String(type).toUpperCase())
    for (const exception of exceptions) {
      if (isDayOffType(exception.exceptionType)) {
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

      if (String(exception.exceptionType).toUpperCase() === 'SPECIAL_HOURS' && exception.specialStartTime && exception.specialEndTime) {
        effectiveStartTime = exception.specialStartTime
        effectiveEndTime = exception.specialEndTime
        isSpecialDay = true
      }
    }

    // 3. Obtener descansos recurrentes que apliquen
    const breaks = await prisma.recurringBreak.findMany({
      where: {
        userId: user.id,
        isActive: true
      }
    })

    const applicableBreaks = breaks.filter(breakItem => {
      const rt = String(breakItem.recurrenceType).toUpperCase()
      if (rt === 'DAILY') return true
      if (rt === 'SPECIFIC_DAYS' && Array.isArray(breakItem.specificDays)) {
        return breakItem.specificDays.includes(dayOfWeek)
      }
      return false
    })

    // 4. Obtener barberos activos del salón
    const barbers = await prisma.barber.findMany({
      where: { userId: user.id, isActive: true }
    })
    const hasBarbers = barbers.length > 0
    const requestedBarberId = req.query.barberId

    // 5. Obtener citas existentes para esa fecha
    const advAppointmentWhere = {
      userId: user.id,
      date: targetDate,
      status: { in: ['CONFIRMADA', 'PENDIENTE'] }
    }
    // Solo filtrar por barbero específico si se pasa un ID real (no 'any')
    if (requestedBarberId && requestedBarberId !== 'any' && hasBarbers) {
      advAppointmentWhere.barberId = requestedBarberId
    }

    const existingAppointments = await prisma.appointment.findMany({
      where: advAppointmentWhere,
      include: {
        service: { select: { duration: true } }
      }
    })

    // 6. Generar slots según modo de barbero
    const isAnyBarberMode = hasBarbers && (!requestedBarberId || requestedBarberId === 'any')

    let slotsToUse
    if (isAnyBarberMode) {
      // Modo "cualquier barbero": calcular disponibilidad multi-barbero
      const baseSlots = generateAdvancedSlotsPublic({
        startTime: effectiveStartTime,
        endTime: effectiveEndTime,
        breaks: applicableBreaks,
        existingAppointments: [], // Sin citas — verificaremos por barbero
        serviceDuration,
        targetDate
      })

      for (const slot of baseSlots) {
        if (!slot.available) continue
        const freeBarberIds = getAvailableBarbersForSlot(barbers, existingAppointments, slot.time, serviceDuration)
        if (freeBarberIds.length === 0) {
          slot.available = false
          slot.reason = 'Todos los barberos ocupados'
        } else {
          slot.availableBarbers = freeBarberIds.map(id => {
            const b = barbers.find(bb => bb.id === id)
            return { id, name: b?.name || 'Barbero' }
          })
          slot.totalBarbers = barbers.length
        }
      }
      slotsToUse = baseSlots
    } else {
      // Modo barbero específico o sin barberos
      slotsToUse = generateAdvancedSlotsPublic({
        startTime: effectiveStartTime,
        endTime: effectiveEndTime,
        breaks: applicableBreaks,
        existingAppointments,
        serviceDuration,
        targetDate
      })
    }

    const availableSlots = slotsToUse.filter(slot => slot.available).map(slot => slot.time)

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
        allSlots: slotsToUse,
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
    const user = await prisma.user.findFirst({ 
      where: { 
        username: username.toLowerCase(),
        isActive: true 
      }
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
      const businessHours = await prisma.businessHour.findFirst({
        where: {
          userId: user.id,
          dayOfWeek: dayOfWeek
        }
      })
      
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
      const exceptions = await prisma.scheduleException.findMany({
        where: {
          userId: user.id,
          isActive: true,
          startDate: { lte: currentDate },
          endDate: { gte: currentDate }
        }
      })

      const isDayOffType = (type) => ['DAY_OFF', 'VACATION', 'HOLIDAY'].includes(String(type).toUpperCase())
      let isAvailable = true
      let reason = ''
      let type = 'available'

      for (const exception of exceptions) {
        if (isDayOffType(exception.exceptionType)) {
          isAvailable = false
          reason = exception.name
          type = String(exception.exceptionType).toLowerCase()
          break
        }
        
        if (String(exception.exceptionType).toUpperCase() === 'SPECIAL_HOURS') {
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

// Límite específico para creación de reservas: evita saturar el calendario
// de un salón con reservas automatizadas, sin afectar las consultas GET
// (perfil, servicios, disponibilidad) que comparten este router.
const bookingLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 15, // 15 reservas por IP cada 15 minutos
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Demasiadas reservas desde esta IP. Intenta nuevamente en unos minutos.'
  }
})

// POST /api/public/salon/:username/book - Crear una nueva reserva (single o multi-servicio)
router.post('/salon/:username/book', bookingLimiter, [
  // serviceId requerido (para compatibilidad) O serviceIds array
  body('serviceId').optional().isString(),
  body('serviceIds').optional().isArray(),
  body('clientName').trim().notEmpty().withMessage('El nombre es requerido'),
  body('clientEmail').isEmail().withMessage('Email inválido'),
  body('clientPhone').trim().notEmpty().withMessage('El teléfono es requerido'),
  body('date').isISO8601().withMessage('Fecha inválida'),
  body('time').matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).withMessage('Hora inválida'),
  body('notes').optional().trim(),
  body('barberId').optional().isString().withMessage('Barbero inválido')
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
    const { serviceId, serviceIds, clientName, clientEmail, clientPhone, date, time, notes, barberId } = req.body

    // Determinar IDs de servicios (compatibilidad con single y multi)
    const resolvedServiceIds = serviceIds && serviceIds.length > 0
      ? serviceIds
      : serviceId ? [serviceId] : []

    if (resolvedServiceIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Debes seleccionar al menos un servicio'
      })
    }

    // Buscar el usuario con configuración de modo de reserva
    const user = await prisma.user.findFirst({ 
      where: { 
        username: username.toLowerCase(),
        isActive: true 
      },
      select: {
        id: true,
        username: true,
        email: true,
        salonName: true,
        phone: true,
        address: true,
        requiresDeposit: true,
        depositAmount: true,
        bookingMode: true,
        holdDurationMinutes: true,
      }
    })

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Salón no encontrado'
      })
    }

    // Buscar todos los servicios seleccionados
    const services = await prisma.service.findMany({
      where: {
        id: { in: resolvedServiceIds },
        userId: user.id,
        isActive: true
      }
    })

    if (services.length !== resolvedServiceIds.length) {
      return res.status(404).json({
        success: false,
        message: 'Uno o más servicios no encontrados'
      })
    }

    // Ordenar servicios en el mismo orden que fueron enviados
    const orderedServices = resolvedServiceIds.map(id => services.find(s => s.id === id))

    // Si se especifica barbero (y no es 'any'), verificar que exista
    let resolvedBarberId = null
    const isAutoAssign = !barberId || barberId === 'any'

    if (barberId && barberId !== 'any') {
      const barber = await prisma.barber.findFirst({
        where: { id: barberId, userId: user.id, isActive: true }
      })
      if (!barber) {
        return res.status(404).json({
          success: false,
          message: 'Barbero no encontrado'
        })
      }
      resolvedBarberId = barberId
    }

    // Verificar si el salón tiene barberos
    const salonBarbers = await prisma.barber.findMany({
      where: { userId: user.id, isActive: true }
    })
    const salonHasBarbers = salonBarbers.length > 0

    // Verificar disponibilidad usando parsing manual de fecha
    const [dateYear, dateMonth, dateDay] = date.split('-').map(Number)
    const appointmentDate = new Date(dateYear, dateMonth - 1, dateDay)
    appointmentDate.setHours(0, 0, 0, 0)

    // Verificar que es un día laboral
    const dayOfWeek = appointmentDate.getDay()
    const businessHour = await prisma.businessHour.findFirst({
      where: { userId: user.id, dayOfWeek }
    })
    if (!businessHour || !businessHour.isActive) {
      return res.status(400).json({
        success: false,
        message: 'El salón no está disponible en la fecha seleccionada'
      })
    }

    // Verificar que no es un día de excepción
    const exception = await prisma.scheduleException.findFirst({
      where: {
        userId: user.id,
        startDate: { lte: appointmentDate },
        endDate: { gte: appointmentDate },
        exceptionType: { in: ['DAY_OFF', 'VACATION', 'HOLIDAY'] }
      }
    })
    if (exception) {
      return res.status(400).json({
        success: false,
        message: `El salón no está disponible: ${exception.name || 'Día no laborable'}`
      })
    }

    // Calcular totales
    const totalDuration = orderedServices.reduce((sum, s) => sum + s.duration, 0)
    const totalPrice = orderedServices.reduce((sum, s) => sum + s.price, 0)
    const serviceNames = orderedServices.map(s => s.name).join(' + ')

    // ──── Determinar estado según modo de reserva ────
    const bookingMode = user.bookingMode || 'LIBRE'
    let initialStatus = 'PENDIENTE'
    let holdExpiresAt = null
    let paymentToken = null
    let paymentUrl = null

    if (bookingMode === 'PREPAGO' && user.requiresDeposit && user.depositAmount > 0) {
      // PREPAGO: cita queda en ESPERANDO_PAGO hasta que cliente pague
      initialStatus = 'ESPERANDO_PAGO'
      holdExpiresAt = new Date(Date.now() + (user.holdDurationMinutes || 15) * 60 * 1000)
      paymentToken = require('crypto').randomUUID()
    }
    // LIBRE y PAGO_POST_APROBACION: citas se crean como PENDIENTE

    // Crear citas con verificación atómica de solapamiento
    let createdAppointments = []
    let assignedBarber = null
    let groupId = null

    try {
      const result = await createMultiServiceAppointments({
        services: orderedServices.map(s => ({ id: s.id, duration: s.duration, price: s.price, name: s.name })),
        baseData: {
          userId: user.id,
          clientName,
          clientEmail,
          clientPhone,
          date: appointmentDate,
          time,
          notes: notes || '',
          status: initialStatus,
          paymentStatus: (bookingMode === 'LIBRE' || !user.requiresDeposit) ? 'COMPLETO' : 'PENDIENTE',
          holdExpiresAt,
          paymentToken
        },
        barberId: resolvedBarberId,
        isAutoAssign: salonHasBarbers && isAutoAssign,
        userId: user.id
      })
      createdAppointments = result.appointments
      assignedBarber = result.assignedBarber
      groupId = result.groupId
    } catch (overlapError) {
      if (overlapError.message === 'OVERLAP_CONFLICT') {
        return res.status(409).json({
          success: false,
          message: 'Este horario ya no está disponible. Por favor, selecciona otro horario.'
        })
      }
      if (overlapError.message === 'NO_BARBER_AVAILABLE') {
        return res.status(409).json({
          success: false,
          message: 'No hay barberos disponibles en este horario. Por favor, selecciona otro horario.'
        })
      }
      throw overlapError
    }

    const mainAppointment = createdAppointments[0]

    // ──── PREPAGO: crear sesión de pago si la pasarela está configurada ────
    if (bookingMode === 'PREPAGO' && paymentToken) {
      if (paymentGateway.isConfigured()) {
        try {
          const session = await paymentGateway.createPaymentSession({
            appointmentId: mainAppointment.id,
            groupId,
            amount: Math.round(user.depositAmount * 100), // centavos
            currency: 'usd',
            customerEmail: clientEmail,
            customerName: clientName,
            description: `Depósito de reserva - ${serviceNames} en ${user.salonName}`,
            successUrl: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/pay/${paymentToken}?status=success`,
            cancelUrl: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/pay/${paymentToken}?status=cancelled`,
            metadata: { paymentToken, salonUsername: user.username, appointmentId: mainAppointment.id }
          })
          paymentUrl = session.paymentUrl
        } catch (paymentError) {
          console.error('❌ Error creando sesión de pago:', paymentError)
          // No falla la reserva, el cliente puede pagar después por el link
        }
      } else {
        // Pasarela no configurada — generamos URL placeholder
        paymentUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/pay/${paymentToken}`
      }
    }

    // Preparar y enviar email de confirmación
    try {
      const bookingData = {
        clientName,
        clientEmail,
        salonName: user.salonName || user.username,
        serviceName: serviceNames,
        services: orderedServices.map(s => ({ name: s.name, price: s.price, duration: s.duration })),
        totalDuration,
        barberName: assignedBarber ? assignedBarber.name : null,
        date: format(appointmentDate, 'PPP', { locale: es }),
        time,
        price: totalPrice,
        depositAmount: user.depositAmount ?? 0,
        requiresDeposit: user.requiresDeposit ?? false,
        salonAddress: user.address || 'Dirección no especificada',
        salonPhone: user.phone || 'Teléfono no especificado',
        bookingId: mainAppointment.id.toString()
      }

      console.log('📧 Preparando envío de email de solicitud...')
      console.log('   Cliente:', bookingData.clientName)
      console.log('   Email:', bookingData.clientEmail)
      console.log('   Salón:', bookingData.salonName)
      console.log('   Servicio(s):', bookingData.serviceName)

      // Enviar correo de solicitud enviada al cliente (no bloqueante)
      sendAndLog(emailService.sendBookingRequest(bookingData), `Email de solicitud (reserva ${mainAppointment.id})`)

      // Enviar notificación al dueño del negocio (no bloqueante)
      const ownerNotificationData = {
        ...bookingData,
        ownerEmail: user.email,
        clientPhone: clientPhone,
        notes: notes || ''
      }

      sendAndLog(emailService.sendOwnerNotification(ownerNotificationData), `Notificación al dueño (reserva ${mainAppointment.id})`)

      // Programar recordatorio (no bloqueante)
      sendAndLog(
        queueService.scheduleReminder({
          appointmentId: mainAppointment.id.toString(),
          appointmentDate: date,
          appointmentTime: time,
          clientEmail,
          clientName
        }),
        `Recordatorio programado (reserva ${mainAppointment.id})`
      )

    } catch (emailError) {
      console.error('Error preparando email de confirmación:', emailError)
    }

    // Emitir evento real-time al dueño del salón
    emitToSalon(user.id, 'appointment:new', {
      appointment: {
        id: mainAppointment.id,
        groupId,
        clientName: mainAppointment.clientName,
        clientEmail: mainAppointment.clientEmail,
        date: mainAppointment.date,
        time: mainAppointment.time,
        status: mainAppointment.status,
        totalAmount: totalPrice,
        services: orderedServices.map(s => ({ name: s.name, price: s.price, duration: s.duration })),
        barber: assignedBarber ? { name: assignedBarber.name } : null
      },
      message: `Nueva reserva de ${mainAppointment.clientName}`,
      source: 'public'
    })

    res.status(201).json({
      success: true,
      message: bookingMode === 'PREPAGO' 
        ? 'Reserva creada. Completa el pago para confirmar tu cita.'
        : bookingMode === 'PAGO_POST_APROBACION'
          ? 'Solicitud de reserva enviada. Recibirás un enlace de pago cuando sea aprobada.'
          : 'Reserva creada exitosamente',
      data: {
        appointmentId: mainAppointment.id,
        groupId,
        clientName: mainAppointment.clientName,
        services: orderedServices.map(s => ({ name: s.name, price: s.price, duration: s.duration })),
        service: serviceNames,
        date: mainAppointment.date.toISOString().split('T')[0],
        time: mainAppointment.time,
        status: mainAppointment.status,
        totalAmount: totalPrice,
        totalDuration,
        appointmentCount: createdAppointments.length,
        requiresDeposit: user.requiresDeposit ?? false,
        depositAmount: user.depositAmount ?? 0,
        bookingMode,
        paymentUrl: paymentUrl || null,
        paymentToken: paymentToken || null,
        holdExpiresAt: holdExpiresAt ? holdExpiresAt.toISOString() : null,
        barber: assignedBarber ? { id: assignedBarber.id, name: assignedBarber.name } : null
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

// GET /api/public/salon/:username/gallery - Obtener galería del salón
router.get('/salon/:username/gallery', async (req, res) => {
  try {
    const { username } = req.params
    const { category } = req.query

    // Buscar el usuario
    const user = await prisma.user.findFirst({ 
      where: { 
        username: username.toLowerCase(),
        isActive: true 
      }
    })

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Salón no encontrado'
      })
    }

    // Construir el query para las imágenes
    const query = { 
      userId: user.id,
      isActive: true
    }

    // Filtrar por categoría si se proporciona
    if (category) {
      query.category = category
    }

    // Buscar imágenes
    const images = await prisma.businessImage.findMany({
      where: query,
      orderBy: [
        { order: 'asc' },
        { createdAt: 'desc' }
      ]
    })
    
    // Obtener categorías disponibles
    const categories = await prisma.businessImage.findMany({
      where: {
        userId: user.id,
        isActive: true
      },
      select: {
        category: true
      },
      distinct: ['category']
    })

    res.status(200).json({
      success: true,
      data: {
        salonName: user.salonName,
        categories: categories.map(c => c.category),
        images: images.map(img => ({
          _id: img.id,
          imageUrl: img.imageUrl,
          title: img.title,
          description: img.description,
          category: img.category
        }))
      }
    })

  } catch (error) {
    console.error('Error al obtener galería:', error)
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
    const aptDuration = apt.service?.duration || 30 // Usar duración real del servicio de la cita
    
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
  
  // Helper: verificar si un descanso aplica en el día
  const breakAppliesOnDay = (breakItem, dayOfWeek) => {
    const rt = String(breakItem.recurrenceType || '').toUpperCase()
    if (rt === 'DAILY') return true
    if (rt === 'SPECIFIC_DAYS' && Array.isArray(breakItem.specificDays)) return breakItem.specificDays.includes(dayOfWeek)
    return false
  }

  // Marcar slots ocupados por descansos
  const targetDayOfWeek = targetDate.getDay()
  breaks.forEach(breakItem => {
    if (breakAppliesOnDay(breakItem, targetDayOfWeek)) {
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
  
  // Si es hoy, marcar horarios que ya pasaron usando la nueva utilidad
  const { isToday, isTimePassed } = require('../utils/timeUtils')
  
  if (isToday(targetDate)) {
    allSlots.forEach(slot => {
      // Verificar si el horario ya pasó usando la zona horaria de República Dominicana
      if (isTimePassed(slot.time, 'America/Santo_Domingo')) {
        slot.available = false
        slot.reason = 'Horario pasado'
      }
    })
  }
  
  return allSlots
}

module.exports = router 