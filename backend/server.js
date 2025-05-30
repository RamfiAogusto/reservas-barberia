const express = require('express')
const mongoose = require('mongoose')
const cors = require('cors')
const helmet = require('helmet')
const rateLimit = require('express-rate-limit')
require('dotenv').config()

// Importar rutas
const authRoutes = require('./routes/auth')
const userRoutes = require('./routes/users')
const servicesRoutes = require('./routes/services')
const appointmentsRoutes = require('./routes/appointments')
const paymentsRoutes = require('./routes/payments')
const schedulesRoutes = require('./routes/schedules')

const app = express()

// Middleware de seguridad
app.use(helmet())

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 100 // límite de 100 requests por IP cada 15 minutos
})
app.use(limiter)

// CORS
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}))

// Body parser
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true, limit: '10mb' }))

// Conexión a MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/reservas')
.then(() => console.log('✅ Conectado a MongoDB'))
.catch((err) => console.error('❌ Error conectando a MongoDB:', err))

// Rutas
app.use('/api/auth', authRoutes)
app.use('/api/users', userRoutes)
app.use('/api/services', servicesRoutes)
app.use('/api/appointments', appointmentsRoutes)
app.use('/api/payments', paymentsRoutes)
app.use('/api/schedules', schedulesRoutes)

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