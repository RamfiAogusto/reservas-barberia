const mongoose = require('mongoose')

const serviceSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'El ID del usuario es requerido']
  },
  name: {
    type: String,
    required: [true, 'El nombre del servicio es requerido'],
    trim: true,
    maxlength: [100, 'El nombre no puede tener más de 100 caracteres']
  },
  description: {
    type: String,
    trim: true,
    maxlength: [500, 'La descripción no puede tener más de 500 caracteres']
  },
  price: {
    type: Number,
    required: [true, 'El precio es requerido'],
    min: [0, 'El precio no puede ser negativo']
  },
  duration: {
    type: Number,
    required: [true, 'La duración es requerida'],
    min: [5, 'La duración mínima es 5 minutos'],
    max: [480, 'La duración máxima es 8 horas']
  },
  requiresPayment: {
    type: Boolean,
    default: false
  },
  depositAmount: {
    type: Number,
    default: 0,
    min: [0, 'El monto del depósito no puede ser negativo']
  },
  isActive: {
    type: Boolean,
    default: true
  },
  category: {
    type: String,
    enum: ['corte', 'barba', 'combo', 'tratamiento', 'otro'],
    default: 'corte'
  }
}, {
  timestamps: true
})

// Índice para buscar servicios por usuario
serviceSchema.index({ userId: 1, isActive: 1 })

// Método para obtener servicios activos
serviceSchema.statics.getActiveByUser = function(userId) {
  return this.find({ userId, isActive: true }).sort({ name: 1 })
}

// Método virtual para obtener el precio formateado
serviceSchema.virtual('formattedPrice').get(function() {
  return `$${this.price.toFixed(2)}`
})

// Método virtual para obtener la duración formateada
serviceSchema.virtual('formattedDuration').get(function() {
  const hours = Math.floor(this.duration / 60)
  const minutes = this.duration % 60
  
  if (hours > 0) {
    return minutes > 0 ? `${hours}h ${minutes}min` : `${hours}h`
  }
  return `${minutes}min`
})

// Asegurar que los virtuals se incluyan en JSON
serviceSchema.set('toJSON', { virtuals: true })

module.exports = mongoose.model('Service', serviceSchema) 