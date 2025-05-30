const express = require('express')
const router = express.Router()
const User = require('../models/User')
const Service = require('../models/Service')

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

module.exports = router 