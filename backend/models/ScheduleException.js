const mongoose = require('mongoose')

const scheduleExceptionSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'El ID del usuario es requerido']
  },
  name: {
    type: String,
    required: [true, 'El nombre de la excepción es requerido'],
    trim: true,
    maxlength: [150, 'El nombre no puede tener más de 150 caracteres']
  },
  exceptionType: {
    type: String,
    enum: ['day_off', 'special_hours', 'vacation', 'holiday'],
    required: [true, 'El tipo de excepción es requerido']
  },
  startDate: {
    type: Date,
    required: [true, 'La fecha de inicio es requerida']
  },
  endDate: {
    type: Date,
    required: [true, 'La fecha de fin es requerida']
  },
  // Para special_hours - horarios especiales
  specialStartTime: {
    type: String,
    match: [/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Formato de hora inválido (HH:MM)']
  },
  specialEndTime: {
    type: String,
    match: [/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Formato de hora inválido (HH:MM)']
  },
  // Para recurrencias anuales (como Navidad, Año Nuevo)
  isRecurringAnnually: {
    type: Boolean,
    default: false
  },
  reason: {
    type: String,
    trim: true,
    maxlength: [500, 'La razón no puede tener más de 500 caracteres']
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
})

// Índices para optimizar consultas
scheduleExceptionSchema.index({ userId: 1, isActive: 1 })
scheduleExceptionSchema.index({ userId: 1, startDate: 1, endDate: 1 })

// Método virtual para verificar si es un día libre
scheduleExceptionSchema.virtual('isDayOff').get(function() {
  return ['day_off', 'vacation', 'holiday'].includes(this.exceptionType)
})

// Método virtual para verificar si tiene horarios especiales
scheduleExceptionSchema.virtual('hasSpecialHours').get(function() {
  return this.exceptionType === 'special_hours' && this.specialStartTime && this.specialEndTime
})

// Método virtual para obtener la duración en días
scheduleExceptionSchema.virtual('durationDays').get(function() {
  const diffTime = Math.abs(this.endDate - this.startDate)
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1
})

// Método virtual para obtener descripción del tipo
scheduleExceptionSchema.virtual('typeDescription').get(function() {
  const types = {
    'day_off': 'Día libre',
    'special_hours': 'Horario especial',
    'vacation': 'Vacaciones',
    'holiday': 'Día festivo'
  }
  return types[this.exceptionType] || 'No especificado'
})

// Validación pre-save
scheduleExceptionSchema.pre('save', function(next) {
  // Validar que startDate <= endDate
  if (this.startDate > this.endDate) {
    return next(new Error('La fecha de inicio debe ser menor o igual a la fecha de fin'))
  }
  
  // Si es special_hours, debe tener horarios especiales
  if (this.exceptionType === 'special_hours') {
    if (!this.specialStartTime || !this.specialEndTime) {
      return next(new Error('Los horarios especiales requieren hora de inicio y fin'))
    }
    
    // Validar que specialStartTime < specialEndTime
    const start = this.specialStartTime.split(':').map(Number)
    const end = this.specialEndTime.split(':').map(Number)
    
    const startMinutes = start[0] * 60 + start[1]
    const endMinutes = end[0] * 60 + end[1]
    
    if (startMinutes >= endMinutes) {
      return next(new Error('La hora especial de inicio debe ser menor que la hora de fin'))
    }
  }
  
  next()
})

// Método estático para obtener excepciones de un usuario
scheduleExceptionSchema.statics.getByUser = function(userId) {
  return this.find({ userId, isActive: true }).sort({ startDate: 1 })
}

// Método estático para obtener excepciones en un rango de fechas
scheduleExceptionSchema.statics.getByUserAndDateRange = function(userId, startDate, endDate) {
  return this.find({
    userId,
    isActive: true,
    $or: [
      // Excepciones que empiezan en el rango
      {
        startDate: { $gte: startDate, $lte: endDate }
      },
      // Excepciones que terminan en el rango
      {
        endDate: { $gte: startDate, $lte: endDate }
      },
      // Excepciones que cubren todo el rango
      {
        startDate: { $lte: startDate },
        endDate: { $gte: endDate }
      }
    ]
  }).sort({ startDate: 1 })
}

// Método estático para obtener excepciones en una fecha específica
scheduleExceptionSchema.statics.getByUserAndDate = function(userId, date) {
  const targetDate = new Date(date)
  targetDate.setHours(0, 0, 0, 0)
  
  const nextDay = new Date(targetDate)
  nextDay.setDate(nextDay.getDate() + 1)
  
  return this.find({
    userId,
    isActive: true,
    startDate: { $lte: targetDate },
    endDate: { $gte: targetDate }
  })
}

// Método de instancia para verificar si aplica en una fecha específica
scheduleExceptionSchema.methods.appliesOnDate = function(date) {
  if (!this.isActive) return false
  
  const targetDate = new Date(date)
  targetDate.setHours(0, 0, 0, 0)
  
  const start = new Date(this.startDate)
  start.setHours(0, 0, 0, 0)
  
  const end = new Date(this.endDate)
  end.setHours(23, 59, 59, 999)
  
  return targetDate >= start && targetDate <= end
}

// Método de instancia para verificar si es recurrente anual y aplica este año
scheduleExceptionSchema.methods.appliesThisYear = function(year) {
  if (!this.isRecurringAnnually) return false
  
  const startMonth = this.startDate.getMonth()
  const startDay = this.startDate.getDate()
  const endMonth = this.endDate.getMonth()
  const endDay = this.endDate.getDate()
  
  const currentYearStart = new Date(year, startMonth, startDay)
  const currentYearEnd = new Date(year, endMonth, endDay)
  
  return { start: currentYearStart, end: currentYearEnd }
}

// Asegurar que los virtuals se incluyan en JSON
scheduleExceptionSchema.set('toJSON', { virtuals: true })

module.exports = mongoose.model('ScheduleException', scheduleExceptionSchema) 