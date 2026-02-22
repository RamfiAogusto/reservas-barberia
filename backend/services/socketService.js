/**
 * Socket.IO Service - Maneja conexiones WebSocket para tiempo real
 * 
 * Eventos emitidos:
 * - appointment:new         → nueva cita creada (público o dashboard)
 * - appointment:updated     → cita actualizada (datos completos)
 * - appointment:statusChanged → cambio de estado (id, newStatus, oldStatus)
 * - appointment:deleted     → cita eliminada
 * - appointment:responded   → barbero respondió (IN_PERSON/ONLINE)
 * - appointment:paymentConfirmed → pago confirmado
 * - appointment:holdExpired → reserva expirada por no pagar
 * - service:updated         → servicio creado/actualizado/eliminado
 * - schedule:updated        → horario modificado
 * - gallery:updated         → galería modificada
 * - barber:updated          → barbero creado/actualizado/eliminado
 */

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

  io.on('connection', (socket) => {
    console.log(`🔌 Cliente conectado: ${socket.id}`)

    // El cliente se une a la sala de su salón (por ownerId)
    socket.on('join:salon', (ownerId) => {
      if (ownerId) {
        socket.join(`salon:${ownerId}`)
        console.log(`🏠 Socket ${socket.id} se unió a salon:${ownerId}`)
      }
    })

    // El cliente se une a su sala personal (para notificaciones de pago, etc.)
    socket.on('join:user', (userId) => {
      if (userId) {
        socket.join(`user:${userId}`)
        console.log(`👤 Socket ${socket.id} se unió a user:${userId}`)
      }
    })

    socket.on('disconnect', (reason) => {
      console.log(`🔌 Cliente desconectado: ${socket.id} (${reason})`)
    })
  })

  console.log('🔌 Socket.IO inicializado')
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
