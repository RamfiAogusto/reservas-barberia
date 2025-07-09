const express = require('express')
const jwt = require('jsonwebtoken')
const { body, validationResult } = require('express-validator')
const { prisma } = require('../lib/prisma')
const bcrypt = require('bcryptjs')
const router = express.Router()

// Función para generar JWT token
const generateToken = (userId) => {
  return jwt.sign({ userId }, process.env.JWT_SECRET, { expiresIn: '7d' })
}

// POST /api/auth/register
router.post('/register', [
  body('username')
    .trim()
    .isLength({ min: 3, max: 30 })
    .withMessage('El nombre de usuario debe tener entre 3 y 30 caracteres'),
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Por favor ingresa un email válido'),
  body('password')
    .isLength({ min: 6 })
    .withMessage('La contraseña debe tener al menos 6 caracteres'),
  body('confirmPassword')
    .custom((value, { req }) => {
      if (value !== req.body.password) {
        throw new Error('Las contraseñas no coinciden')
      }
      return true
    }),
  body('phone')
    .notEmpty()
    .withMessage('El teléfono es requerido'),
  body('salonName')
    .trim()
    .notEmpty()
    .withMessage('El nombre del salón es requerido'),
  body('address')
    .trim()
    .notEmpty()
    .withMessage('La dirección es requerida')
], async (req, res) => {
  try {
    // Verificar errores de validación
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Datos de registro inválidos',
        errors: errors.array()
      })
    }

    const { username, email, password, phone, salonName, address } = req.body

    // Verificar si el usuario ya existe
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [
          { email },
          { username }
        ]
      }
    })

    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: existingUser.email === email 
          ? 'Este email ya está registrado' 
          : 'Este nombre de usuario ya está en uso'
      })
    }

    // Hashear la contraseña
    const hashedPassword = await bcrypt.hash(password, 12)

    // Crear nuevo usuario
    const newUser = await prisma.user.create({
      data: {
        username,
        email,
        password: hashedPassword,
        phone,
        salonName,
        address
      },
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

    // Generar token
    const token = generateToken(newUser._id)

    res.status(201).json({
      success: true,
      message: 'Usuario registrado exitosamente',
      token,
      user: newUser
    })

  } catch (error) {
    console.error('Error en registro:', error)
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Error interno'
    })
  }
})

// POST /api/auth/login
router.post('/login', [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Por favor ingresa un email válido'),
  body('password')
    .notEmpty()
    .withMessage('La contraseña es requerida')
], async (req, res) => {
  try {
    // Verificar errores de validación
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Datos de login inválidos',
        errors: errors.array()
      })
    }

    const { email, password } = req.body

    // Buscar usuario por email
    const user = await prisma.user.findUnique({
      where: { email }
    })
    
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Credenciales inválidas'
      })
    }

    // Verificar si el usuario está activo
    if (!user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'Cuenta desactivada. Contacta al administrador'
      })
    }

    // Verificar contraseña
    const isPasswordValid = await bcrypt.compare(password, user.password)
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Credenciales inválidas'
      })
    }

    // Excluir password de la respuesta
    const { password: _, ...userWithoutPassword } = user

    // Generar token
    const token = generateToken(user._id)

    res.json({
      success: true,
      message: 'Login exitoso',
      token,
      user: userWithoutPassword
    })

  } catch (error) {
    console.error('Error en login:', error)
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Error interno'
    })
  }
})

// POST /api/auth/logout
router.post('/logout', async (req, res) => {
  try {
    // En una implementación real, podrías agregar el token a una blacklist
    res.json({
      success: true,
      message: 'Logout exitoso'
    })
  } catch (error) {
    console.error('Error en logout:', error)
    res.status(500).json({
      success: false,
      message: 'Error en el logout',
      error: error.message
    })
  }
})

module.exports = router 