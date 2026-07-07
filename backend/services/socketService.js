/**
 * Socket.IO Service - Maneja conexiones WebSocket para tiempo real
 * 
 * Eventos emitidos:
 * - appointment:new         → nueva cita creada (público o dashboard)
 * - appointment:updated     → cita actualizada (datos completos)
 * - appointment:statusChanged → cambio de estado (id, newStatus, oldStatus)
 * - appointment:deleted     → cita eliminada
 * - appointment:responded   → barbero respondió (action: CONFIRMAR/RECHAZAR/APROBAR)
 * - appointment:paymentConfirmed → pago confirmado
 * - appointment:holdExpired → reserva expirada por no pagar
 * - service:updated         → servicio creado/actualizado/eliminado
 * - schedule:updated        → horario modificado
 * - gallery:updated         → galería modificada
 * - barber:updated          → barbero creado/actualizado/eliminado
 */

const jwt = require('jsonwebtoken')

let io = null

const initializeSocket = (server, corsOptions) => {
  const { Server } = require('socket.io')

  io = new Server(server, {
    cors: {
      origin: corsOptions.origin,
      methods: ['GET', 'POST'],
      credentials: true
    },
    // Configuración de transporte
    transports: ['websocket', 'polling'],
    // Ping cada 25 segundos
    pingInterval: 25000,
    pingTimeout: 20000,
  })

  // Middleware de autenticación: exige un JWT válido en el handshake.
  // La sala se deriva EXCLUSIVAMENTE del token verificado, nunca de un
  // valor enviado por el cliente (evita que un tercero espíe otro salón).
  io.use((socket, next) => {
    try {
      const token = socket.handshake.auth && socket.handshake.auth.token
      if (!token) {
        return next(new Error('unauthorized'))
      }
      const decoded = jwt.verify(token, process.env.JWT_SECRET)
      if (!decoded || !decoded.userId) {
        return next(new Error('unauthorized'))
      }
      socket.userId = decoded.userId
      next()
    } catch (error) {
      next(new Error('unauthorized'))
    }
  })

  io.on('connection', (socket) => {
    console.log(`🔌 Cliente conectado: ${socket.id} (user:${socket.userId})`)

    // Unión automática a las salas propias, derivadas del token verificado.
    socket.join(`salon:${socket.userId}`)
    socket.join(`user:${socket.userId}`)

    socket.on('disconnect', (reason) => {
      console.log(`🔌 Cliente desconectado: ${socket.id} (${reason})`)
    })
  })

  console.log('🔌 Socket.IO inicializado (autenticado)')
  return io
}

/**
 * Emitir evento a todos los clientes conectados al salón del dueño
 */
const emitToSalon = (ownerId, event, data) => {
  if (!io) return
  io.to(`salon:${ownerId}`).emit(event, data)
}

/**
 * Emitir evento a un usuario específico
 */
const emitToUser = (userId, event, data) => {
  if (!io) return
  io.to(`user:${userId}`).emit(event, data)
}

/**
 * Emitir evento a todos los clientes conectados
 */
const emitToAll = (event, data) => {
  if (!io) return
  io.emit(event, data)
}

/**
 * Obtener instancia de io
 */
const getIO = () => io

module.exports = {
  initializeSocket,
  emitToSalon,
  emitToUser,
  emitToAll,
  getIO
}
