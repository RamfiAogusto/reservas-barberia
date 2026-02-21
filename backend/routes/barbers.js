const express = require('express')
const { body, validationResult } = require('express-validator')
const { prisma } = require('../lib/prisma')
const { authenticateToken } = require('../middleware/auth')
const router = express.Router()

// Middleware de autenticación para todas las rutas
router.use(authenticateToken)

// GET /api/barbers - Obtener barberos del salón
router.get('/', async (req, res) => {
  try {
    const barbers = await prisma.barber.findMany({
      where: {
        userId: req.user.id,
        isActive: true
      },
      orderBy: { name: 'asc' },
      include: {
        _count: {
          select: {
            appointments: {
              where: {
                status: { not: 'CANCELADA' }
              }
            }
          }
        }
      }
    })

    res.json({
      success: true,
      count: barbers.length,
      data: barbers
    })
  } catch (error) {
    console.error('Error obteniendo barberos:', error)
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Error interno'
    })
  }
})

// GET /api/barbers/:id - Obtener un barbero específico
router.get('/:id', async (req, res) => {
  try {
    const barber = await prisma.barber.findFirst({
      where: {
        id: req.params.id,
        userId: req.user.id
      }
    })

    if (!barber) {
      return res.status(404).json({
        success: false,
        message: 'Barbero no encontrado'
      })
    }

    res.json({
      success: true,
      data: barber
    })
  } catch (error) {
    console.error('Error obteniendo barbero:', error)
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Error interno'
    })
  }
})

// POST /api/barbers - Crear nuevo barbero
router.post('/', [
  body('name')
    .trim()
    .notEmpty()
    .withMessage('El nombre del barbero es requerido')
    .isLength({ max: 100 })
    .withMessage('El nombre no puede tener más de 100 caracteres'),
  body('phone')
    .optional()
    .trim()
    .isLength({ max: 20 })
    .withMessage('Teléfono inválido'),
  body('email')
    .optional()
    .isEmail()
    .normalizeEmail()
    .withMessage('Email inválido'),
  body('specialty')
    .optional()
    .trim()
    .isLength({ max: 200 })
    .withMessage('La especialidad no puede tener más de 200 caracteres')
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

    const { name, phone, email, specialty } = req.body

    // Verificar si ya existe un barbero con el mismo nombre
    const existingBarber = await prisma.barber.findFirst({
      where: {
        userId: req.user.id,
        name: { equals: name, mode: 'insensitive' },
        isActive: true
      }
    })

    if (existingBarber) {
      return res.status(400).json({
        success: false,
        message: 'Ya tienes un barbero con este nombre'
      })
    }

    const newBarber = await prisma.barber.create({
      data: {
        userId: req.user.id,
        name,
        phone: phone || null,
        email: email || null,
        specialty: specialty || null
      }
    })

    res.status(201).json({
      success: true,
      message: 'Barbero creado exitosamente',
      data: newBarber
    })
  } catch (error) {
    console.error('Error creando barbero:', error)
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Error interno'
    })
  }
})

// PUT /api/barbers/:id - Actualizar barbero
router.put('/:id', [
  body('name')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('El nombre no puede estar vacío')
    .isLength({ max: 100 })
    .withMessage('El nombre no puede tener más de 100 caracteres'),
  body('phone')
    .optional()
    .trim()
    .isLength({ max: 20 })
    .withMessage('Teléfono inválido'),
  body('email')
    .optional()
    .isEmail()
    .normalizeEmail()
    .withMessage('Email inválido'),
  body('specialty')
    .optional()
    .trim()
    .isLength({ max: 200 })
    .withMessage('La especialidad no puede tener más de 200 caracteres'),
  body('isActive')
    .optional()
    .isBoolean()
    .withMessage('isActive debe ser booleano')
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

    const barber = await prisma.barber.findFirst({
      where: {
        id: req.params.id,
        userId: req.user.id
      }
    })

    if (!barber) {
      return res.status(404).json({
        success: false,
        message: 'Barbero no encontrado'
      })
    }

    // Si se cambia el nombre, verificar duplicados
    if (req.body.name && req.body.name !== barber.name) {
      const existingBarber = await prisma.barber.findFirst({
        where: {
          userId: req.user.id,
          name: { equals: req.body.name, mode: 'insensitive' },
          isActive: true,
          id: { not: req.params.id }
        }
      })

      if (existingBarber) {
        return res.status(400).json({
          success: false,
          message: 'Ya tienes un barbero con este nombre'
        })
      }
    }

    const updateData = {}
    const allowedFields = ['name', 'phone', 'email', 'specialty', 'isActive']
    allowedFields.forEach(field => {
      if (req.body[field] !== undefined) {
        updateData[field] = req.body[field]
      }
    })

    const updatedBarber = await prisma.barber.update({
      where: { id: req.params.id },
      data: updateData
    })

    res.json({
      success: true,
      message: 'Barbero actualizado exitosamente',
      data: updatedBarber
    })
  } catch (error) {
    console.error('Error actualizando barbero:', error)
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Error interno'
    })
  }
})

// DELETE /api/barbers/:id - Desactivar barbero (soft delete)
router.delete('/:id', async (req, res) => {
  try {
    const barber = await prisma.barber.findFirst({
      where: {
        id: req.params.id,
        userId: req.user.id
      }
    })

    if (!barber) {
      return res.status(404).json({
        success: false,
        message: 'Barbero no encontrado'
      })
    }

    // Soft delete
    await prisma.barber.update({
      where: { id: req.params.id },
      data: { isActive: false }
    })

    res.json({
      success: true,
      message: 'Barbero eliminado exitosamente'
    })
  } catch (error) {
    console.error('Error eliminando barbero:', error)
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Error interno'
    })
  }
})

module.exports = router
