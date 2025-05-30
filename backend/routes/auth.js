const express = require('express')
const jwt = require('jsonwebtoken')
const { body, validationResult } = require('express-validator')
const User = require('../models/User')
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
    const existingUser = await User.findOne({
      $or: [{ email }, { username }]
    })

    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: existingUser.email === email 
          ? 'Este email ya está registrado' 
          : 'Este nombre de usuario ya está en uso'
      })
    }

    // Crear nuevo usuario
    const newUser = new User({
      username,
      email,
      password,
      phone,
      salonName,
      address
    })

    await newUser.save()

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
    const user = await User.findOne({ email })
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
    const isPasswordValid = await user.comparePassword(password)
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Credenciales inválidas'
      })
    }

    // Generar token
    const token = generateToken(user._id)

    res.json({
      success: true,
      message: 'Login exitoso',
      token,
      user
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