const express = require('express')
const { authenticateToken } = require('../middleware/auth')
const { prisma } = require('../lib/prisma')
const router = express.Router()

// Middleware de autenticación para rutas protegidas
router.use('/profile', authenticateToken)

// GET /api/users/profile - Obtener perfil del usuario autenticado
router.get('/profile', async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user._id },
      select: {
        id: true,
        username: true,
        email: true,
        phone: true,
        salonName: true,
        address: true,
        role: true,
        isActive: true,
        avatar: true,
        createdAt: true,
        updatedAt: true
      }
    })
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado'
      })
    }

    res.json({
      success: true,
      data: user
    })
  } catch (error) {
    console.error('Error obteniendo perfil:', error)
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Error interno'
    })
  }
})

// PUT /api/users/profile - Actualizar perfil del usuario autenticado
router.put('/profile', async (req, res) => {
  try {
    const { salonName, phone, address, avatar } = req.body
    
    const user = await prisma.user.update({
      where: { id: req.user._id },
      data: { salonName, phone, address, avatar },
      select: {
        id: true,
        username: true,
        email: true,
        phone: true,
        salonName: true,
        address: true,
        role: true,
        isActive: true,
        avatar: true,
        createdAt: true,
        updatedAt: true
      }
    })

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado'
      })
    }

    res.json({
      success: true,
      message: 'Perfil actualizado exitosamente',
      data: user
    })
  } catch (error) {
    console.error('Error actualizando perfil:', error)
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Error interno'
    })
  }
})

// GET /api/users/:username - Obtener perfil público por username (NO PROTEGIDA)
router.get('/:username', async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { 
        username: req.params.username.toLowerCase(),
        isActive: true 
      },
      select: {
        username: true,
        salonName: true,
        phone: true,
        address: true,
        avatar: true
      }
    })

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado'
      })
    }

    res.json({
      success: true,
      data: {
        username: user.username,
        salonName: user.salonName,
        phone: user.phone,
        address: user.address,
        avatar: user.avatar
      }
    })
  } catch (error) {
    console.error('Error obteniendo perfil público:', error)
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Error interno'
    })
  }
})

module.exports = router