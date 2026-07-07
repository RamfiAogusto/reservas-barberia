const express = require('express')
const jwt = require('jsonwebtoken')
const rateLimit = require('express-rate-limit')
const { body, validationResult } = require('express-validator')
const { prisma } = require('../lib/prisma')
const bcrypt = require('bcryptjs')
const router = express.Router()

// Límite de intentos de login por IP: mitiga fuerza bruta sobre credenciales.
// Mensaje genérico para no revelar si el límite es por IP o por cuenta.
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 8, // 8 intentos por IP cada 15 minutos
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Demasiados intentos. Intenta nuevamente en unos minutos.'
  }
})

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
    .isLength({ min: 8 })
    .withMessage('La contraseña debe tener al menos 8 caracteres'),
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
      // Mensaje genérico: no distinguir entre email y username duplicados
      // para no permitir enumeración de cuentas existentes.
      return res.status(400).json({
        success: false,
        message: 'El email o usuario ya está en uso'
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
        onboardingCompleted: true,
        createdAt: true,
        updatedAt: true
      }
    })

    // Generar token
    const token = generateToken(newUser.id)

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
router.post('/login', loginLimiter, [
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

    // Excluir password de la respuesta (onboardingCompleted ya viene del modelo)
    const { password: _, ...userWithoutPassword } = user

    // Generar token
    const token = generateToken(user.id)

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