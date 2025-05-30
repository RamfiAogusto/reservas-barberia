const mongoose = require('mongoose')

const appointmentSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'El ID del usuario es requerido']
  },
  serviceId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Service',
    required: [true, 'El ID del servicio es requerido']
  },
  clientName: {
    type: String,
    required: [true, 'El nombre del cliente es requerido'],
    trim: true,
    maxlength: [100, 'El nombre no puede tener más de 100 caracteres']
  },
  clientEmail: {
    type: String,
    required: [true, 'El email del cliente es requerido'],
    lowercase: true,
    trim: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Email inválido']
  },
  clientPhone: {
    type: String,
    required: [true, 'El teléfono del cliente es requerido'],
    trim: true
  },
  date: {
    type: Date,
    required: [true, 'La fecha es requerida']
  },
  time: {
    type: String,
    required: [true, 'La hora es requerida'],
    match: [/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Formato de hora inválido (HH:MM)']
  },
  status: {
    type: String,
    enum: ['pendiente', 'confirmada', 'completada', 'cancelada', 'no_asistio'],
    default: 'pendiente'
  },
  notes: {
    type: String,
    trim: true,
    maxlength: [500, 'Las notas no pueden tener más de 500 caracteres']
  },
  staffMember: {
    type: String,
    trim: true,
    maxlength: [100, 'El nombre del staff no puede tener más de 100 caracteres']
  },
  totalAmount: {
    type: Number,
    required: [true, 'El monto total es requerido'],
    min: [0, 'El monto no puede ser negativo']
  },
  paidAmount: {
    type: Number,
    default: 0,
    min: [0, 'El monto pagado no puede ser negativo']
  },
  paymentStatus: {
    type: String,
    enum: ['pendiente', 'parcial', 'completo', 'reembolsado'],
    default: 'pendiente'
  },
  paymentMethod: {
    type: String,
    enum: ['efectivo', 'tarjeta', 'transferencia', 'stripe', 'paypal'],
    default: 'efectivo'
  },
  reminderSent: {
    type: Boolean,
    default: false
  },
  cancelledAt: {
    type: Date
  },
  cancelReason: {
    type: String,
    trim: true
  }
}, {
  timestamps: true
})

// Índices para optimizar consultas
appointmentSchema.index({ userId: 1, date: 1 })
appointmentSchema.index({ userId: 1, status: 1 })
appointmentSchema.index({ date: 1, time: 1 })

// Método estático para obtener citas por usuario y rango de fechas
appointmentSchema.statics.getByDateRange = function(userId, startDate, endDate) {
  return this.find({
    userId,
    date: {
      $gte: startDate,
      $lte: endDate
    }
  })
  .populate('serviceId', 'name duration price')
  .sort({ date: 1, time: 1 })
}

// Método estático para obtener citas de hoy
appointmentSchema.statics.getTodayAppointments = function(userId) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)
  
  return this.find({
    userId,
    date: {
      $gte: today,
      $lt: tomorrow
    }
  })
  .populate('serviceId', 'name duration price')
  .sort({ time: 1 })
}

// Método para verificar disponibilidad
appointmentSchema.statics.checkAvailability = function(userId, date, time, serviceId, excludeId = null) {
  const query = {
    userId,
    date,
    time,
    status: { $nin: ['cancelada', 'no_asistio'] }
  }
  
  if (excludeId) {
    query._id = { $ne: excludeId }
  }
  
  return this.findOne(query)
}

// Método virtual para obtener fecha formateada
appointmentSchema.virtual('formattedDate').get(function() {
  return this.date.toLocaleDateString('es-ES', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })
})

// Método virtual para obtener datetime completo
appointmentSchema.virtual('datetime').get(function() {
  const [hours, minutes] = this.time.split(':')
  const datetime = new Date(this.date)
  datetime.setHours(parseInt(hours), parseInt(minutes))
  return datetime
})

// Método para verificar si la cita es hoy
appointmentSchema.methods.isToday = function() {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const appointmentDate = new Date(this.date)
  appointmentDate.setHours(0, 0, 0, 0)
  return appointmentDate.getTime() === today.getTime()
}

// Método para verificar si la cita ya pasó
appointmentSchema.methods.isPast = function() {
  const now = new Date()
  return this.datetime < now
}

// Asegurar que los virtuals se incluyan en JSON
appointmentSchema.set('toJSON', { virtuals: true })

module.exports = mongoose.model('Appointment', appointmentSchema) 