const mongoose = require('mongoose')

const recurringBreakSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'El ID del usuario es requerido']
  },
  name: {
    type: String,
    required: [true, 'El nombre del descanso es requerido'],
    trim: true,
    maxlength: [100, 'El nombre no puede tener más de 100 caracteres']
  },
  startTime: {
    type: String,
    required: [true, 'La hora de inicio es requerida'],
    match: [/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Formato de hora inválido (HH:MM)']
  },
  endTime: {
    type: String,
    required: [true, 'La hora de fin es requerida'],
    match: [/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Formato de hora inválido (HH:MM)']
  },
  recurrenceType: {
    type: String,
    enum: ['daily', 'weekly', 'specific_days'],
    required: [true, 'El tipo de recurrencia es requerido']
  },
  specificDays: [{
    type: Number,
    min: [0, 'Día inválido'], // 0 = Domingo, 1 = Lunes, ..., 6 = Sábado
    max: [6, 'Día inválido']
  }],
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
})

// Índice para optimizar consultas
recurringBreakSchema.index({ userId: 1, isActive: 1 })

// Método virtual para obtener la duración del descanso
recurringBreakSchema.virtual('duration').get(function() {
  const start = this.startTime.split(':').map(Number)
  const end = this.endTime.split(':').map(Number)
  
  const startMinutes = start[0] * 60 + start[1]
  const endMinutes = end[0] * 60 + end[1]
  
  return endMinutes - startMinutes
})

// Método virtual para obtener la descripción de recurrencia
recurringBreakSchema.virtual('recurrenceDescription').get(function() {
  const dayNames = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']
  
  switch (this.recurrenceType) {
    case 'daily':
      return 'Todos los días'
    case 'weekly':
      return 'Semanalmente'
    case 'specific_days':
      if (this.specificDays.length === 0) return 'Sin días específicos'
      const days = this.specificDays.map(day => dayNames[day]).join(', ')
      return `Solo: ${days}`
    default:
      return 'Sin especificar'
  }
})

// Método para validar que startTime < endTime
recurringBreakSchema.pre('save', function(next) {
  const start = this.startTime.split(':').map(Number)
  const end = this.endTime.split(':').map(Number)
  
  const startMinutes = start[0] * 60 + start[1]
  const endMinutes = end[0] * 60 + end[1]
  
  if (startMinutes >= endMinutes) {
    return next(new Error('La hora de inicio debe ser menor que la hora de fin'))
  }
  
  // Validar que si es specific_days, debe tener al menos un día
  if (this.recurrenceType === 'specific_days' && (!this.specificDays || this.specificDays.length === 0)) {
    return next(new Error('Debe especificar al menos un día para la recurrencia específica'))
  }
  
  next()
})

// Método estático para obtener descansos de un usuario
recurringBreakSchema.statics.getByUser = function(userId) {
  return this.find({ userId, isActive: true }).sort({ name: 1 })
}

// Método estático para obtener descansos que aplican en un día específico
recurringBreakSchema.statics.getByUserAndDay = function(userId, dayOfWeek) {
  return this.find({
    userId,
    isActive: true,
    $or: [
      { recurrenceType: 'daily' },
      { recurrenceType: 'weekly' },
      { 
        recurrenceType: 'specific_days',
        specificDays: dayOfWeek
      }
    ]
  })
}

// Método de instancia para verificar si aplica en un día específico
recurringBreakSchema.methods.appliesOnDay = function(dayOfWeek) {
  if (!this.isActive) return false
  
  switch (this.recurrenceType) {
    case 'daily':
      return true
    case 'weekly':
      return true // Asumimos que aplica todos los días laborales
    case 'specific_days':
      return this.specificDays.includes(dayOfWeek)
    default:
      return false
  }
}

// Asegurar que los virtuals se incluyan en JSON
recurringBreakSchema.set('toJSON', { virtuals: true })

module.exports = mongoose.model('RecurringBreak', recurringBreakSchema) 