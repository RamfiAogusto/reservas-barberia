const express = require('express')
const router = express.Router()
const { body, validationResult } = require('express-validator')
const { authenticateToken } = require('../middleware/auth')
const BusinessHours = require('../models/BusinessHours')
const RecurringBreak = require('../models/RecurringBreak')
const ScheduleException = require('../models/ScheduleException')
const Appointment = require('../models/Appointment')

// Aplicar middleware de autenticación a todas las rutas
router.use(authenticateToken)

// ========== HORARIOS BASE ==========

// GET /api/schedules/business-hours - Obtener horarios base del usuario
router.get('/business-hours', async (req, res) => {
  try {
    const businessHours = await BusinessHours.getByUser(req.user._id)
    
    // Crear estructura completa de la semana (0-6)
    const weekSchedule = Array.from({ length: 7 }, (_, index) => {
      const existing = businessHours.find(bh => bh.dayOfWeek === index)
      return existing || {
        dayOfWeek: index,
        dayName: ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'][index],
        isActive: false,
        startTime: '09:00',
        endTime: '18:00'
      }
    })

    res.json({
      success: true,
      data: weekSchedule
    })
  } catch (error) {
    console.error('Error obteniendo horarios base:', error)
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    })
  }
})

// PUT /api/schedules/business-hours - Actualizar horarios base
router.put('/business-hours', [
  body('schedule').isArray().withMessage('El horario debe ser un array'),
  body('schedule.*.dayOfWeek').isInt({ min: 0, max: 6 }).withMessage('Día de semana inválido'),
  body('schedule.*.isActive').isBoolean().withMessage('isActive debe ser booleano'),
  body('schedule.*.startTime').optional().matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).withMessage('Hora de inicio inválida'),
  body('schedule.*.endTime').optional().matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).withMessage('Hora de fin inválida')
], async (req, res) => {
  try {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Datos inválidos',
        errors: errors.array()
      })
    }

    const { schedule } = req.body
    const userId = req.user._id

    // Procesar cada día de la semana
    for (const daySchedule of schedule) {
      const { dayOfWeek, isActive, startTime, endTime } = daySchedule

      if (isActive && (!startTime || !endTime)) {
        return res.status(400).json({
          success: false,
          message: `Día ${dayOfWeek}: Si está activo, debe tener hora de inicio y fin`
        })
      }

      if (isActive) {
        // Actualizar o crear horario
        await BusinessHours.findOneAndUpdate(
          { userId, dayOfWeek },
          {
            userId,
            dayOfWeek,
            startTime,
            endTime,
            isActive: true
          },
          { upsert: true, new: true }
        )
      } else {
        // Desactivar horario
        await BusinessHours.findOneAndUpdate(
          { userId, dayOfWeek },
          { isActive: false },
          { upsert: true }
        )
      }
    }

    // Retornar horarios actualizados
    const updatedSchedule = await BusinessHours.getByUser(userId)
    
    res.json({
      success: true,
      message: 'Horarios actualizados exitosamente',
      data: updatedSchedule
    })

  } catch (error) {
    console.error('Error actualizando horarios base:', error)
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    })
  }
})

// ========== DESCANSOS RECURRENTES ==========

// GET /api/schedules/recurring-breaks - Obtener descansos recurrentes
router.get('/recurring-breaks', async (req, res) => {
  try {
    const breaks = await RecurringBreak.getByUser(req.user._id)
    
    res.json({
      success: true,
      data: breaks
    })
  } catch (error) {
    console.error('Error obteniendo descansos:', error)
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    })
  }
})

// POST /api/schedules/recurring-breaks - Crear descanso recurrente
router.post('/recurring-breaks', [
  body('name').trim().notEmpty().withMessage('El nombre es requerido'),
  body('startTime').matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).withMessage('Hora de inicio inválida'),
  body('endTime').matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).withMessage('Hora de fin inválida'),
  body('recurrenceType').isIn(['daily', 'weekly', 'specific_days']).withMessage('Tipo de recurrencia inválido'),
  body('specificDays').optional().isArray().withMessage('Días específicos debe ser un array')
], async (req, res) => {
  try {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Datos inválidos',
        errors: errors.array()
      })
    }

    const { name, startTime, endTime, recurrenceType, specificDays } = req.body

    const newBreak = new RecurringBreak({
      userId: req.user._id,
      name,
      startTime,
      endTime,
      recurrenceType,
      specificDays: specificDays || []
    })

    await newBreak.save()

    res.status(201).json({
      success: true,
      message: 'Descanso creado exitosamente',
      data: newBreak
    })

  } catch (error) {
    console.error('Error creando descanso:', error)
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    })
  }
})

// PUT /api/schedules/recurring-breaks/:id - Actualizar descanso recurrente
router.put('/recurring-breaks/:id', [
  body('name').optional().trim().notEmpty().withMessage('El nombre no puede estar vacío'),
  body('startTime').optional().matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).withMessage('Hora de inicio inválida'),
  body('endTime').optional().matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).withMessage('Hora de fin inválida'),
  body('recurrenceType').optional().isIn(['daily', 'weekly', 'specific_days']).withMessage('Tipo de recurrencia inválido'),
  body('specificDays').optional().isArray().withMessage('Días específicos debe ser un array')
], async (req, res) => {
  try {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Datos inválidos',
        errors: errors.array()
      })
    }

    const breakRecord = await RecurringBreak.findOne({
      _id: req.params.id,
      userId: req.user._id
    })

    if (!breakRecord) {
      return res.status(404).json({
        success: false,
        message: 'Descanso no encontrado'
      })
    }

    // Actualizar campos
    Object.keys(req.body).forEach(key => {
      if (req.body[key] !== undefined) {
        breakRecord[key] = req.body[key]
      }
    })

    await breakRecord.save()

    res.json({
      success: true,
      message: 'Descanso actualizado exitosamente',
      data: breakRecord
    })

  } catch (error) {
    console.error('Error actualizando descanso:', error)
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    })
  }
})

// DELETE /api/schedules/recurring-breaks/:id - Eliminar descanso recurrente
router.delete('/recurring-breaks/:id', async (req, res) => {
  try {
    const breakRecord = await RecurringBreak.findOne({
      _id: req.params.id,
      userId: req.user._id
    })

    if (!breakRecord) {
      return res.status(404).json({
        success: false,
        message: 'Descanso no encontrado'
      })
    }

    breakRecord.isActive = false
    await breakRecord.save()

    res.json({
      success: true,
      message: 'Descanso eliminado exitosamente'
    })

  } catch (error) {
    console.error('Error eliminando descanso:', error)
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    })
  }
})

// ========== EXCEPCIONES DE HORARIO ==========

// GET /api/schedules/exceptions - Obtener excepciones
router.get('/exceptions', async (req, res) => {
  try {
    const { startDate, endDate } = req.query

    let exceptions
    if (startDate && endDate) {
      exceptions = await ScheduleException.getByUserAndDateRange(
        req.user._id,
        new Date(startDate),
        new Date(endDate)
      )
    } else {
      exceptions = await ScheduleException.getByUser(req.user._id)
    }

    res.json({
      success: true,
      data: exceptions
    })
  } catch (error) {
    console.error('Error obteniendo excepciones:', error)
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    })
  }
})

// POST /api/schedules/exceptions - Crear excepción
router.post('/exceptions', [
  body('name').trim().notEmpty().withMessage('El nombre es requerido'),
  body('exceptionType').isIn(['day_off', 'special_hours', 'vacation', 'holiday']).withMessage('Tipo de excepción inválido'),
  body('startDate').isISO8601().withMessage('Fecha de inicio inválida'),
  body('endDate').isISO8601().withMessage('Fecha de fin inválida'),
  body('specialStartTime').optional().matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).withMessage('Hora especial de inicio inválida'),
  body('specialEndTime').optional().matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).withMessage('Hora especial de fin inválida'),
  body('isRecurringAnnually').optional().isBoolean().withMessage('Recurrencia anual debe ser booleano'),
  body('reason').optional().trim()
], async (req, res) => {
  try {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Datos inválidos',
        errors: errors.array()
      })
    }

    const {
      name,
      exceptionType,
      startDate,
      endDate,
      specialStartTime,
      specialEndTime,
      isRecurringAnnually,
      reason
    } = req.body

    const newException = new ScheduleException({
      userId: req.user._id,
      name,
      exceptionType,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      specialStartTime,
      specialEndTime,
      isRecurringAnnually: isRecurringAnnually || false,
      reason
    })

    await newException.save()

    res.status(201).json({
      success: true,
      message: 'Excepción creada exitosamente',
      data: newException
    })

  } catch (error) {
    console.error('Error creando excepción:', error)
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    })
  }
})

// PUT /api/schedules/exceptions/:id - Actualizar excepción
router.put('/exceptions/:id', [
  body('name').optional().trim().notEmpty().withMessage('El nombre no puede estar vacío'),
  body('exceptionType').optional().isIn(['day_off', 'special_hours', 'vacation', 'holiday']).withMessage('Tipo de excepción inválido'),
  body('startDate').optional().isISO8601().withMessage('Fecha de inicio inválida'),
  body('endDate').optional().isISO8601().withMessage('Fecha de fin inválida'),
  body('specialStartTime').optional().matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).withMessage('Hora especial de inicio inválida'),
  body('specialEndTime').optional().matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).withMessage('Hora especial de fin inválida'),
  body('isRecurringAnnually').optional().isBoolean().withMessage('Recurrencia anual debe ser booleano'),
  body('reason').optional().trim()
], async (req, res) => {
  try {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Datos inválidos',
        errors: errors.array()
      })
    }

    const exception = await ScheduleException.findOne({
      _id: req.params.id,
      userId: req.user._id
    })

    if (!exception) {
      return res.status(404).json({
        success: false,
        message: 'Excepción no encontrada'
      })
    }

    // Actualizar campos
    Object.keys(req.body).forEach(key => {
      if (req.body[key] !== undefined) {
        if (key === 'startDate' || key === 'endDate') {
          exception[key] = new Date(req.body[key])
        } else {
          exception[key] = req.body[key]
        }
      }
    })

    await exception.save()

    res.json({
      success: true,
      message: 'Excepción actualizada exitosamente',
      data: exception
    })

  } catch (error) {
    console.error('Error actualizando excepción:', error)
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    })
  }
})

// DELETE /api/schedules/exceptions/:id - Eliminar excepción
router.delete('/exceptions/:id', async (req, res) => {
  try {
    const exception = await ScheduleException.findOne({
      _id: req.params.id,
      userId: req.user._id
    })

    if (!exception) {
      return res.status(404).json({
        success: false,
        message: 'Excepción no encontrada'
      })
    }

    exception.isActive = false
    await exception.save()

    res.json({
      success: true,
      message: 'Excepción eliminada exitosamente'
    })

  } catch (error) {
    console.error('Error eliminando excepción:', error)
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    })
  }
})

// ========== CÁLCULO AVANZADO DE DISPONIBILIDAD ==========

// GET /api/schedules/availability/advanced - Calcular disponibilidad avanzada
router.get('/availability/advanced', async (req, res) => {
  try {
    const { date, serviceId } = req.query

    if (!date || !serviceId) {
      return res.status(400).json({
        success: false,
        message: 'Fecha y servicio son requeridos'
      })
    }

    const targetDate = new Date(date)
    const dayOfWeek = targetDate.getDay()

    console.log(`🔍 Calculando disponibilidad para ${date} (día ${dayOfWeek})`)

    // 1. Obtener horarios base del día
    const businessHours = await BusinessHours.getByUserAndDay(req.user._id, dayOfWeek)
    
    console.log(`📅 Horarios encontrados:`, businessHours ? {
      dayOfWeek: businessHours.dayOfWeek,
      isActive: businessHours.isActive,
      startTime: businessHours.startTime,
      endTime: businessHours.endTime
    } : 'null')
    
    if (!businessHours || !businessHours.isActive) {
      console.log(`❌ Día no laborable - businessHours: ${!!businessHours}, isActive: ${businessHours?.isActive}`)
      return res.json({
        success: true,
        data: {
          date: targetDate.toISOString().split('T')[0],
          isBusinessDay: false,
          availableSlots: [],
          reason: 'Día no laborable'
        }
      })
    }

    console.log(`✅ Día laborable confirmado`)

    // 2. Verificar excepciones para esta fecha
    const exceptions = await ScheduleException.getByUserAndDate(req.user._id, targetDate)
    
    // Si hay excepción de día libre
    const dayOffException = exceptions.find(ex => ex.isDayOff)
    if (dayOffException) {
      return res.json({
        success: true,
        data: {
          date: targetDate.toISOString().split('T')[0],
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
    const breaks = await RecurringBreak.getByUserAndDay(req.user._id, dayOfWeek)

    // 5. Obtener citas existentes
    const existingAppointments = await Appointment.find({
      userId: req.user._id,
      date: targetDate,
      status: { $nin: ['cancelada', 'no_asistio'] }
    }).select('time')

    // 6. Generar slots disponibles considerando todo
    const slots = generateAdvancedSlots({
      startTime: effectiveStartTime,
      endTime: effectiveEndTime,
      breaks,
      existingAppointments,
      slotDuration: 30, // TODO: hacer configurable
      targetDate
    })

    // Validar que slots sea un array válido
    const validSlots = Array.isArray(slots) ? slots : []

    res.json({
      success: true,
      data: {
        date: targetDate.toISOString().split('T')[0],
        isBusinessDay: true,
        businessHours: {
          start: effectiveStartTime,
          end: effectiveEndTime,
          isSpecial: !!specialHoursException
        },
        breaks: (breaks || []).map(b => ({
          name: b.name,
          startTime: b.startTime,
          endTime: b.endTime
        })),
        availableSlots: validSlots,
        totalSlots: validSlots.length
      }
    })

  } catch (error) {
    console.error('Error calculando disponibilidad avanzada:', error)
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    })
  }
})

// Función helper para generar slots avanzados
function generateAdvancedSlots({ startTime, endTime, breaks = [], existingAppointments = [], slotDuration, targetDate }) {
  try {
    console.log('🔧 Generando slots con parámetros:', {
      startTime,
      endTime,
      breaksCount: breaks ? breaks.length : 'undefined',
      appointmentsCount: existingAppointments ? existingAppointments.length : 'undefined',
      slotDuration,
      targetDate: targetDate ? targetDate.toISOString() : 'undefined'
    })

    // Convertir horarios a minutos
    const [startHour, startMin] = startTime.split(':').map(Number)
    const [endHour, endMin] = endTime.split(':').map(Number)
    
    const startMinutes = startHour * 60 + startMin
    const endMinutes = endHour * 60 + endMin
    
    // Crear array de todos los slots posibles
    const allSlots = []
    for (let minutes = startMinutes; minutes < endMinutes; minutes += slotDuration) {
      const hour = Math.floor(minutes / 60)
      const min = minutes % 60
      const timeString = `${hour.toString().padStart(2, '0')}:${min.toString().padStart(2, '0')}`
      allSlots.push(timeString)
    }
    
    console.log(`   ⏰ Slots iniciales generados: ${allSlots.length}`)
    
    // Filtrar slots ocupados por citas
    const occupiedTimes = (existingAppointments || []).map(apt => apt.time)
    let availableSlots = allSlots.filter(slot => !occupiedTimes.includes(slot))
    
    console.log(`   📅 Después de filtrar citas: ${availableSlots.length}`)
    
    // Filtrar slots ocupados por descansos
    if (breaks && breaks.length > 0) {
      console.log(`   ☕ Procesando ${breaks.length} descansos...`)
      breaks.forEach((breakItem, index) => {
        console.log(`     Descanso ${index + 1}: ${breakItem.name} (${breakItem.startTime}-${breakItem.endTime})`)
        
        if (breakItem.appliesOnDay && typeof breakItem.appliesOnDay === 'function') {
          const applies = breakItem.appliesOnDay(targetDate.getDay())
          console.log(`       Aplica en día ${targetDate.getDay()}: ${applies}`)
          
          if (applies) {
            const [breakStartHour, breakStartMin] = breakItem.startTime.split(':').map(Number)
            const [breakEndHour, breakEndMin] = breakItem.endTime.split(':').map(Number)
            
            const breakStartMinutes = breakStartHour * 60 + breakStartMin
            const breakEndMinutes = breakEndHour * 60 + breakEndMin
            
            const beforeFilter = availableSlots.length
            availableSlots = availableSlots.filter(slot => {
              const [slotHour, slotMin] = slot.split(':').map(Number)
              const slotMinutes = slotHour * 60 + slotMin
              
              // El slot no debe estar dentro del rango del descanso
              return !(slotMinutes >= breakStartMinutes && slotMinutes < breakEndMinutes)
            })
            
            console.log(`       Slots filtrados: ${beforeFilter} -> ${availableSlots.length}`)
          }
        } else {
          console.log(`       ⚠️ Método appliesOnDay no disponible`)
        }
      })
    } else {
      console.log(`   ☕ No hay descansos que procesar`)
    }
    
    // Si es hoy, filtrar horarios que ya pasaron
    const now = new Date()
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    
    if (targetDate.getTime() === today.getTime()) {
      console.log(`   🕐 Filtrando horarios pasados (es hoy)`)
      const currentHour = now.getHours()
      const currentMinute = now.getMinutes()
      
      const beforeTimeFilter = availableSlots.length
      availableSlots = availableSlots.filter(slot => {
        const [slotHour, slotMinute] = slot.split(':').map(Number)
        if (slotHour > currentHour) return true
        if (slotHour === currentHour && slotMinute > currentMinute + 30) return true // 30 min buffer
        return false
      })
      
      console.log(`   Después de filtrar tiempo: ${beforeTimeFilter} -> ${availableSlots.length}`)
    }
    
    console.log(`   ✅ Slots finales: ${availableSlots.length}`)
    return availableSlots
  } catch (error) {
    console.error('❌ Error en generateAdvancedSlots:', error)
    return []
  }
}

module.exports = router 