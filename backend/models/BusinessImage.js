const mongoose = require('mongoose')

const businessImageSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'El ID del usuario es requerido']
  },
  imageUrl: {
    type: String,
    required: [true, 'La URL de la imagen es requerida']
  },
  cloudinaryPublicId: {
    type: String,
    required: [true, 'El ID público de Cloudinary es requerido']
  },
  title: {
    type: String,
    trim: true,
    maxlength: [100, 'El título no puede tener más de 100 caracteres']
  },
  description: {
    type: String,
    trim: true,
    maxlength: [200, 'La descripción no puede tener más de 200 caracteres']
  },
  category: {
    type: String,
    enum: ['exterior', 'interior', 'servicios', 'equipo', 'otros'],
    default: 'otros'
  },
  order: {
    type: Number,
    default: 0
  },
  isActive: {
    type: Boolean,
    default: true
  },
  isFeatured: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
})

// Índice para buscar imágenes por usuario
businessImageSchema.index({ userId: 1, isActive: 1 })
businessImageSchema.index({ userId: 1, isFeatured: 1 })

// Método para obtener imágenes activas
businessImageSchema.statics.getActiveByUser = function(userId) {
  return this.find({ userId, isActive: true }).sort({ order: 1, createdAt: -1 })
}

// Método para obtener imágenes destacadas
businessImageSchema.statics.getFeaturedByUser = function(userId) {
  return this.find({ userId, isActive: true, isFeatured: true }).sort({ order: 1, createdAt: -1 })
}

module.exports = mongoose.model('BusinessImage', businessImageSchema) 