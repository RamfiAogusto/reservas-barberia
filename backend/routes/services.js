const express = require('express')
const { body, validationResult } = require('express-validator')
const Service = require('../models/Service')
const { authenticateToken } = require('../middleware/auth')
const router = express.Router()

// Middleware de autenticación para todas las rutas
router.use(authenticateToken)

// GET /api/services - Obtener todos los servicios del usuario
router.get('/', async (req, res) => {
  try {
    const services = await Service.getActiveByUser(req.user._id)
    
    res.json({
      success: true,
      count: services.length,
      data: services
    })
  } catch (error) {
    console.error('Error obteniendo servicios:', error)
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Error interno'
    })
  }
})

// GET /api/services/:id - Obtener un servicio específico
router.get('/:id', async (req, res) => {
  try {
    const service = await Service.findOne({
      _id: req.params.id,
      userId: req.user._id
    })

    if (!service) {
      return res.status(404).json({
        success: false,
        message: 'Servicio no encontrado'
      })
    }

    res.json({
      success: true,
      data: service
    })
  } catch (error) {
    console.error('Error obteniendo servicio:', error)
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Error interno'
    })
  }
})

// POST /api/services - Crear nuevo servicio
router.post('/', [
  body('name')
    .trim()
    .notEmpty()
    .withMessage('El nombre del servicio es requerido')
    .isLength({ max: 100 })
    .withMessage('El nombre no puede tener más de 100 caracteres'),
  body('price')
    .isNumeric()
    .withMessage('El precio debe ser un número')
    .isFloat({ min: 0 })
    .withMessage('El precio debe ser mayor o igual a 0'),
  body('duration')
    .isInt({ min: 5, max: 480 })
    .withMessage('La duración debe estar entre 5 y 480 minutos'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('La descripción no puede tener más de 500 caracteres'),
  body('category')
    .optional()
    .isIn(['corte', 'barba', 'combo', 'tratamiento', 'otro'])
    .withMessage('Categoría inválida'),
  body('requiresPayment')
    .optional()
    .isBoolean()
    .withMessage('requiresPayment debe ser true o false'),
  body('depositAmount')
    .optional()
    .isNumeric()
    .withMessage('El monto del depósito debe ser un número')
    .isFloat({ min: 0 })
    .withMessage('El monto del depósito debe ser mayor o igual a 0')
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

    const { name, description, price, duration, category, requiresPayment, depositAmount } = req.body

    // Verificar si ya existe un servicio con el mismo nombre para este usuario
    const existingService = await Service.findOne({
      userId: req.user._id,
      name: { $regex: new RegExp(`^${name}$`, 'i') },
      isActive: true
    })

    if (existingService) {
      return res.status(400).json({
        success: false,
        message: 'Ya tienes un servicio con este nombre'
      })
    }

    // Crear nuevo servicio
    const newService = new Service({
      userId: req.user._id,
      name,
      description,
      price,
      duration,
      category,
      requiresPayment: requiresPayment || false,
      depositAmount: depositAmount || 0
    })

    await newService.save()

    res.status(201).json({
      success: true,
      message: 'Servicio creado exitosamente',
      data: newService
    })
  } catch (error) {
    console.error('Error creando servicio:', error)
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Error interno'
    })
  }
})

// PUT /api/services/:id - Actualizar servicio
router.put('/:id', [
  body('name')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('El nombre del servicio no puede estar vacío')
    .isLength({ max: 100 })
    .withMessage('El nombre no puede tener más de 100 caracteres'),
  body('price')
    .optional()
    .isNumeric()
    .withMessage('El precio debe ser un número')
    .isFloat({ min: 0 })
    .withMessage('El precio debe ser mayor o igual a 0'),
  body('duration')
    .optional()
    .isInt({ min: 5, max: 480 })
    .withMessage('La duración debe estar entre 5 y 480 minutos'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('La descripción no puede tener más de 500 caracteres'),
  body('category')
    .optional()
    .isIn(['corte', 'barba', 'combo', 'tratamiento', 'otro'])
    .withMessage('Categoría inválida'),
  body('requiresPayment')
    .optional()
    .isBoolean()
    .withMessage('requiresPayment debe ser true o false'),
  body('depositAmount')
    .optional()
    .isNumeric()
    .withMessage('El monto del depósito debe ser un número')
    .isFloat({ min: 0 })
    .withMessage('El monto del depósito debe ser mayor o igual a 0'),
  body('isActive')
    .optional()
    .isBoolean()
    .withMessage('isActive debe ser true o false')
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

    // Buscar el servicio
    const service = await Service.findOne({
      _id: req.params.id,
      userId: req.user._id
    })

    if (!service) {
      return res.status(404).json({
        success: false,
        message: 'Servicio no encontrado'
      })
    }

    // Si se está cambiando el nombre, verificar que no exista otro con el mismo nombre
    if (req.body.name && req.body.name !== service.name) {
      const existingService = await Service.findOne({
        userId: req.user._id,
        name: { $regex: new RegExp(`^${req.body.name}$`, 'i') },
        isActive: true,
        _id: { $ne: req.params.id }
      })

      if (existingService) {
        return res.status(400).json({
          success: false,
          message: 'Ya tienes un servicio con este nombre'
        })
      }
    }

    // Actualizar campos
    Object.keys(req.body).forEach(key => {
      if (req.body[key] !== undefined) {
        service[key] = req.body[key]
      }
    })

    await service.save()

    res.json({
      success: true,
      message: 'Servicio actualizado exitosamente',
      data: service
    })
  } catch (error) {
    console.error('Error actualizando servicio:', error)
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Error interno'
    })
  }
})

// DELETE /api/services/:id - Eliminar servicio (soft delete)
router.delete('/:id', async (req, res) => {
  try {
    const service = await Service.findOne({
      _id: req.params.id,
      userId: req.user._id
    })

    if (!service) {
      return res.status(404).json({
        success: false,
        message: 'Servicio no encontrado'
      })
    }

    // Soft delete - marcar como inactivo
    service.isActive = false
    await service.save()

    res.json({
      success: true,
      message: 'Servicio eliminado exitosamente'
    })
  } catch (error) {
    console.error('Error eliminando servicio:', error)
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Error interno'
    })
  }
})

// GET /api/services/stats - Estadísticas de servicios
router.get('/stats/summary', async (req, res) => {
  try {
    const totalServices = await Service.countDocuments({
      userId: req.user._id,
      isActive: true
    })

    const servicesByCategory = await Service.aggregate([
      {
        $match: {
          userId: req.user._id,
          isActive: true
        }
      },
      {
        $group: {
          _id: '$category',
          count: { $sum: 1 },
          avgPrice: { $avg: '$price' }
        }
      }
    ])

    const priceRange = await Service.aggregate([
      {
        $match: {
          userId: req.user._id,
          isActive: true
        }
      },
      {
        $group: {
          _id: null,
          minPrice: { $min: '$price' },
          maxPrice: { $max: '$price' },
          avgPrice: { $avg: '$price' }
        }
      }
    ])

    res.json({
      success: true,
      stats: {
        totalServices,
        servicesByCategory,
        priceRange: priceRange[0] || { minPrice: 0, maxPrice: 0, avgPrice: 0 }
      }
    })
  } catch (error) {
    console.error('Error obteniendo estadísticas:', error)
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Error interno'
    })
  }
})

module.exports = router 