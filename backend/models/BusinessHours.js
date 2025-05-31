const mongoose = require('mongoose')

const businessHoursSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'El ID del usuario es requerido']
  },
  dayOfWeek: {
    type: Number,
    required: [true, 'El día de la semana es requerido'],
    min: [0, 'Día inválido'], // 0 = Domingo, 1 = Lunes, ..., 6 = Sábado
    max: [6, 'Día inválido']
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
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
})

// Índice único para evitar duplicados por usuario y día
businessHoursSchema.index({ userId: 1, dayOfWeek: 1 }, { unique: true })

// Método virtual para obtener el nombre del día
businessHoursSchema.virtual('dayName').get(function() {
  const days = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']
  return days[this.dayOfWeek]
})

// Método para validar que startTime < endTime
businessHoursSchema.pre('save', function(next) {
  const start = this.startTime.split(':').map(Number)
  const end = this.endTime.split(':').map(Number)
  
  const startMinutes = start[0] * 60 + start[1]
  const endMinutes = end[0] * 60 + end[1]
  
  if (startMinutes >= endMinutes) {
    return next(new Error('La hora de inicio debe ser menor que la hora de fin'))
  }
  
  next()
})

// Método estático para obtener horarios de un usuario
businessHoursSchema.statics.getByUser = function(userId) {
  return this.find({ userId }).sort({ dayOfWeek: 1 })
}

// Método estático para obtener horarios de un día específico
businessHoursSchema.statics.getByUserAndDay = function(userId, dayOfWeek) {
  return this.findOne({ userId, dayOfWeek })
}

// Asegurar que los virtuals se incluyan en JSON
businessHoursSchema.set('toJSON', { virtuals: true })

module.exports = mongoose.model('BusinessHours', businessHoursSchema) 