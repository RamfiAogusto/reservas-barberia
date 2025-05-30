const jwt = require('jsonwebtoken')
const User = require('../models/User')

// Middleware para verificar token JWT
const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization
    const token = authHeader && authHeader.split(' ')[1] // Bearer TOKEN

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Token de acceso requerido'
      })
    }

    // Verificar token
    const decoded = jwt.verify(token, process.env.JWT_SECRET)
    
    // Buscar usuario en la base de datos
    const user = await User.findById(decoded.userId).select('-password')
    
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Usuario no encontrado'
      })
    }

    if (!user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'Cuenta desactivada'
      })
    }

    // Agregar usuario a la request
    req.user = user
    next()

  } catch (error) {
    console.error('Error en autenticación:', error)
    
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: 'Token inválido'
      })
    }

    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Token expirado'
      })
    }

    return res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    })
  }
}

module.exports = { authenticateToken } 