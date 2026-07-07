const express = require('express')
const http = require('http')
const cors = require('cors')
const helmet = require('helmet')
const rateLimit = require('express-rate-limit')
const { checkConnection } = require('./lib/prisma')
const paymentGateway = require('./services/paymentGatewayService')
// Configuración de zona horaria para República Dominicana
process.env.TZ = 'America/Santo_Domingo'

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
const barbersRoutes = require('./routes/barbers')

// Importar servicios
const queueService = require('./services/queueService')
const holdCleanupService = require('./services/holdCleanupService')
const { initializeSocket } = require('./services/socketService')

const app = express()
const server = http.createServer(app)

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
// FRONTEND_URL (env) es la fuente canónica del origen permitido en producción.
// Los dos dominios legacy de abajo (Vercel + Netlify) se mantienen temporalmente
// por compatibilidad mientras se confirma la topología final de despliegue
// (ver nota "Topología de despliegue" en PRODUCTION-SETUP.md) — un humano debe
// confirmar cuál(es) retirar.
const LEGACY_PROD_ORIGINS = [
  'https://reservas-barberia-ruddy.vercel.app',
  'https://frontreservas.netlify.app'
]

const corsOptions = {
  origin: function (origin, callback) {
    // Permitir requests sin origin (mobile apps, etc) en desarrollo
    const allowedOrigins = [
      'http://localhost:3000',
      'http://127.0.0.1:3000',
      process.env.FRONTEND_URL,
      ...LEGACY_PROD_ORIGINS
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

// Inicializar Socket.IO con la misma configuración CORS
initializeSocket(server, corsOptions)

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
    holdCleanupService.start()
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
app.use('/api/barbers', barbersRoutes)
app.use('/api/public', publicLimiter, publicRoutes)

// Ruta de salud — reporta conectividad de dependencias sin lanzar excepciones.
// Se mantiene rápida: la verificación de DB usa un SELECT 1 (ver lib/prisma.js)
// y el resto son lecturas de estado en memoria (no hacen I/O de red).
app.get('/api/health', async (req, res) => {
  let dbConnected = false
  try {
    dbConnected = await checkConnection()
  } catch (error) {
    console.error('❌ Health check - error verificando DB:', error.message)
  }

  let queueStatus = { initialized: false, redisAvailable: false, queueActive: false, workerActive: false }
  try {
    queueStatus = queueService.getStatus()
  } catch (error) {
    console.error('❌ Health check - error verificando cola:', error.message)
  }

  const emailConfigured = !!process.env.RESEND_API_KEY
  const paymentGatewayConfigured = (() => {
    try {
      return paymentGateway.isConfigured()
    } catch {
      return false
    }
  })()

  const isHealthy = dbConnected

  res.status(isHealthy ? 200 : 503).json({
    status: isHealthy ? 'OK' : 'DEGRADED',
    message: 'API de Reservas Barbería funcionando correctamente',
    timestamp: new Date().toISOString(),
    dependencies: {
      database: { connected: dbConnected },
      queue: queueStatus,
      email: { configured: emailConfigured },
      paymentGateway: { configured: paymentGatewayConfigured, note: 'Pasarela simulada (mock) hasta integrar un proveedor real' }
    }
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

server.listen(PORT, () => {
  console.log(`🚀 Servidor ejecutándose en puerto ${PORT}`)
  console.log(`📍 URL: http://localhost:${PORT}`)
  console.log(`🏥 Health check: http://localhost:${PORT}/api/health`)
  console.log(`🔌 WebSocket: ws://localhost:${PORT}`)
}) 