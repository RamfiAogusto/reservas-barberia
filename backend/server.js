const express = require('express')
const cors = require('cors')
const helmet = require('helmet')
const rateLimit = require('express-rate-limit')
const { checkConnection } = require('./lib/prisma')
require('dotenv').config()

// Importar rutas
const authRoutes = require('./routes/auth')
const userRoutes = require('./routes/users')
const servicesRoutes = require('./routes/services')
const appointmentsRoutes = require('./routes/appointments')
const paymentsRoutes = require('./routes/payments')
const schedulesRoutes = require('./routes/schedules')
const publicRoutes = require('./routes/public')
const galleryRoutes = require('./routes/gallery')

// Importar servicios
const queueService = require('./services/queueService')

const app = express()

// Configurar trust proxy para rate limiting en producción
app.set('trust proxy', 1)

// Middleware de seguridad
app.use(helmet())

// Rate limiting - Configuración más permisiva para desarrollo
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 1000, // límite de 1000 requests por IP cada 15 minutos (más permisivo)
  message: {
    error: 'Demasiadas requests desde esta IP, intenta nuevamente en 15 minutos.'
  },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
})
app.use(limiter)

// Rate limiting más permisivo para rutas públicas
const publicLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 2000, // Más permisivo para rutas públicas
  message: {
    error: 'Demasiadas requests, intenta nuevamente en unos minutos.'
  }
})

// CORS - Configuración mejorada
const corsOptions = {
  origin: function (origin, callback) {
    // Permitir requests sin origin (mobile apps, etc) en desarrollo
    const allowedOrigins = [
      'http://localhost:3000',
      'http://127.0.0.1:3000',
      'https://reservas-barberia-ruddy.vercel.app',
      'https://frontreservas.netlify.app',
      process.env.FRONTEND_URL
    ].filter(Boolean)
    
    console.log('🌐 CORS check - Origin:', origin)
    console.log('🌐 CORS check - Allowed origins:', allowedOrigins)
    
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true)
    } else {
      console.log('❌ CORS blocked - Origin not allowed:', origin)
      callback(new Error('No permitido por CORS'))
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: [
    'Content-Type', 
    'Authorization', 
    'x-requested-with',
    'Accept',
    'Origin',
    'Access-Control-Request-Method',
    'Access-Control-Request-Headers'
  ],
  exposedHeaders: ['RateLimit-Limit', 'RateLimit-Remaining', 'RateLimit-Reset'],
  optionsSuccessStatus: 200, // Para navegadores legacy
  preflightContinue: false // Pass control to the next handler
}

app.use(cors(corsOptions))

// Manejo explícito de preflight requests
app.options('*', cors(corsOptions))

// Body parser
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true, limit: '10mb' }))

// Conexión a PostgreSQL
checkConnection()
.then((isConnected) => {
  if (isConnected) {
    queueService.initialize()
  } else {
    console.error('❌ No se pudo conectar a PostgreSQL')
  }
})
.catch((err) => console.error('❌ Error conectando a PostgreSQL:', err))

// Rutas
app.use('/api/auth', authRoutes)
app.use('/api/users', userRoutes)
app.use('/api/services', servicesRoutes)
app.use('/api/appointments', appointmentsRoutes)
app.use('/api/payments', paymentsRoutes)
app.use('/api/schedules', schedulesRoutes)
app.use('/api/gallery', galleryRoutes)
app.use('/api/public', publicLimiter, publicRoutes)

// Ruta de salud
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'API de Reservas Barbería funcionando correctamente',
    timestamp: new Date().toISOString()
  })
})

// Manejo de errores
app.use((err, req, res, next) => {
  console.error(err.stack)
  res.status(500).json({ 
    message: 'Error interno del servidor',
    error: process.env.NODE_ENV === 'production' ? {} : err.message
  })
})

// Ruta 404
app.use('*', (req, res) => {
  res.status(404).json({ message: 'Ruta no encontrada' })
})

const PORT = process.env.PORT || 5000

app.listen(PORT, () => {
  console.log(`🚀 Servidor ejecutándose en puerto ${PORT}`)
  console.log(`📍 URL: http://localhost:${PORT}`)
  console.log(`🏥 Health check: http://localhost:${PORT}/api/health`)
}) 