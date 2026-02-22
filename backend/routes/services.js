const express = require('express')
const { body, validationResult } = require('express-validator')
const { prisma } = require('../lib/prisma')
const { authenticateToken } = require('../middleware/auth')
const { emitToSalon } = require('../services/socketService')
const router = express.Router()

// Middleware de autenticación para todas las rutas
router.use(authenticateToken)

// GET /api/services - Obtener todos los servicios del usuario
router.get('/', async (req, res) => {
  try {
    const services = await prisma.service.findMany({
      where: {
        userId: req.user.id,
        isActive: true
      },
      orderBy: {
        name: 'asc'
      }
    })
    
    // Agregar _id para compatibilidad con frontend
    const servicesWithId = services.map(service => ({
      ...service,
      _id: service.id
    }))
    
    res.json({
      success: true,
      count: servicesWithId.length,
      data: servicesWithId
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
    const service = await prisma.service.findFirst({
      where: {
        id: req.params.id,
        userId: req.user.id
      }
    })

    if (!service) {
      return res.status(404).json({
        success: false,
        message: 'Servicio no encontrado'
      })
    }

    // Agregar _id para compatibilidad con frontend
    const serviceWithId = {
      ...service,
      _id: service.id
    }

    res.json({
      success: true,
      data: serviceWithId
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
    .isInt({ min: 30, max: 480 })
    .withMessage('La duración debe estar entre 30 y 480 minutos')
    .custom((value) => {
      if (value % 30 !== 0) {
        throw new Error('La duración debe ser en bloques de 30 minutos')
      }
      return true
    }),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('La descripción no puede tener más de 500 caracteres'),
  body('category')
    .optional()
    .isIn(['CORTE', 'BARBA', 'COMBO', 'TRATAMIENTO', 'OTRO'])
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
  body('showDuration')
    .optional()
    .isBoolean()
    .withMessage('showDuration debe ser true o false')
], async (req, res) => {
  try {

    
    // Verificar errores de validación
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      console.log('❌ Errores de validación:', errors.array())
      return res.status(400).json({
        success: false,
        message: 'Datos inválidos',
        errors: errors.array()
      })
    }

    const { name, description, price, duration, category, requiresPayment, depositAmount, showDuration } = req.body

    // Verificar si ya existe un servicio con el mismo nombre para este usuario
    const existingService = await prisma.service.findFirst({
      where: {
        userId: req.user.id,
        name: {
          equals: name,
          mode: 'insensitive'
        },
        isActive: true
      }
    })

    if (existingService) {
      return res.status(400).json({
        success: false,
        message: 'Ya tienes un servicio con este nombre'
      })
    }

    // Crear nuevo servicio
    const newService = await prisma.service.create({
      data: {
        userId: req.user.id,
        name,
        description,
        price,
        duration,
        showDuration: showDuration !== undefined ? showDuration : true,
        category: category ? category.toUpperCase() : 'CORTE',
        requiresPayment: requiresPayment || false,
        depositAmount: depositAmount || 0
      }
    })

    // Agregar _id para compatibilidad con frontend
    const serviceWithId = {
      ...newService,
      _id: newService.id
    }

    res.status(201).json({
      success: true,
      message: 'Servicio creado exitosamente',
      data: serviceWithId
    })

    // Emitir evento real-time
    emitToSalon(req.user.id, 'service:updated', { action: 'created', service: serviceWithId })
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
    .isInt({ min: 30, max: 480 })
    .withMessage('La duración debe estar entre 30 y 480 minutos')
    .custom((value) => {
      if (value % 30 !== 0) {
        throw new Error('La duración debe ser en bloques de 30 minutos')
      }
      return true
    }),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('La descripción no puede tener más de 500 caracteres'),
  body('category')
    .optional()
    .isIn(['CORTE', 'BARBA', 'COMBO', 'TRATAMIENTO', 'OTRO'])
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
    .withMessage('isActive debe ser true o false'),
  body('showDuration')
    .optional()
    .isBoolean()
    .withMessage('showDuration debe ser true o false')
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
    const service = await prisma.service.findFirst({
      where: {
        id: req.params.id,
        userId: req.user.id
      }
    })

    if (!service) {
      return res.status(404).json({
        success: false,
        message: 'Servicio no encontrado'
      })
    }

    // Si se está cambiando el nombre, verificar que no exista otro con el mismo nombre
    if (req.body.name && req.body.name !== service.name) {
      const existingService = await prisma.service.findFirst({
        where: {
          userId: req.user.id,
          name: {
            equals: req.body.name,
            mode: 'insensitive'
          },
          isActive: true,
          id: {
            not: req.params.id
          }
        }
      })

      if (existingService) {
        return res.status(400).json({
          success: false,
          message: 'Ya tienes un servicio con este nombre'
        })
      }
    }

    // Preparar datos para actualizar
    const updateData = {}
    Object.keys(req.body).forEach(key => {
      if (req.body[key] !== undefined) {
        if (key === 'category' && req.body[key]) {
          updateData[key] = req.body[key].toUpperCase()
        } else if (key === 'showDuration') {
          // Asegurar que showDuration sea un booleano
          updateData[key] = Boolean(req.body[key])
        } else {
          updateData[key] = req.body[key]
        }
      }
    })

    // Actualizar servicio
    const updatedService = await prisma.service.update({
      where: { id: req.params.id },
      data: updateData
    })

    // Agregar _id para compatibilidad con frontend
    const serviceWithId = {
      ...updatedService,
      _id: updatedService.id
    }

    res.json({
      success: true,
      message: 'Servicio actualizado exitosamente',
      data: serviceWithId
    })

    // Emitir evento real-time
    emitToSalon(req.user.id, 'service:updated', { action: 'updated', service: serviceWithId })
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
    const service = await prisma.service.findFirst({
      where: {
        id: req.params.id,
        userId: req.user.id
      }
    })

    if (!service) {
      return res.status(404).json({
        success: false,
        message: 'Servicio no encontrado'
      })
    }

    // Soft delete - marcar como inactivo
    await prisma.service.update({
      where: { id: req.params.id },
      data: { isActive: false }
    })

    res.json({
      success: true,
      message: 'Servicio eliminado exitosamente'
    })

    // Emitir evento real-time
    emitToSalon(req.user.id, 'service:updated', { action: 'deleted', serviceId: req.params.id })
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
    const totalServices = await prisma.service.count({
      where: {
        userId: req.user.id,
        isActive: true
      }
    })

    const servicesByCategory = await prisma.service.groupBy({
      by: ['category'],
      where: {
        userId: req.user.id,
        isActive: true
      },
      _count: {
        category: true
      },
      _avg: {
        price: true
      }
    })

    const priceRange = await prisma.service.aggregate({
      where: {
        userId: req.user.id,
        isActive: true
      },
      _min: {
        price: true
      },
      _max: {
        price: true
      },
      _avg: {
        price: true
      }
    })

    res.json({
      success: true,
      stats: {
        totalServices,
        servicesByCategory: servicesByCategory.map(item => ({
          _id: item.category,
          count: item._count.category,
          avgPrice: item._avg.price
        })),
        priceRange: {
          minPrice: priceRange._min.price || 0,
          maxPrice: priceRange._max.price || 0,
          avgPrice: priceRange._avg.price || 0
        }
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