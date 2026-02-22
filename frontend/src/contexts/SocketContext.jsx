'use client'

import { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react'
import { io } from 'socket.io-client'

const SocketContext = createContext(null)

/**
 * SocketProvider - Conecta al servidor WebSocket y maneja la sala del salón.
 * Envuelve toda la app para que cualquier componente pueda escuchar eventos en tiempo real.
 */
export function SocketProvider({ children }) {
  const [socket, setSocket] = useState(null)
  const [isConnected, setIsConnected] = useState(false)
  const listenersRef = useRef(new Map())

  useEffect(() => {
    // Obtener URL del backend (sin /api)
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'
    const baseUrl = apiUrl.replace('/api', '')

    const newSocket = io(baseUrl, {
      transports: ['websocket', 'polling'],
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 20000,
    })

    newSocket.on('connect', () => {
      console.log('🔌 WebSocket conectado:', newSocket.id)
      setIsConnected(true)

      // Re-unirse a salas después de reconexión
      const storedUser = localStorage.getItem('user')
      if (storedUser) {
        try {
          const user = JSON.parse(storedUser)
          if (user?.id) {
            newSocket.emit('join:salon', user.id)
            newSocket.emit('join:user', user.id)
          }
        } catch (e) {
          // Ignorar error de parse
        }
      }
    })

    newSocket.on('disconnect', (reason) => {
      console.log('🔌 WebSocket desconectado:', reason)
      setIsConnected(false)
    })

    newSocket.on('connect_error', (error) => {
      console.log('🔌 Error de conexión WebSocket:', error.message)
      setIsConnected(false)
    })

    setSocket(newSocket)

    return () => {
      newSocket.close()
    }
  }, [])

  /**
   * Unirse a la sala del salón (llamar después del login)
   */
  const joinSalon = useCallback((ownerId) => {
    if (socket && ownerId) {
      socket.emit('join:salon', ownerId)
      socket.emit('join:user', ownerId)
    }
  }, [socket])

  /**
   * Registrar un listener para un evento. Devuelve función de cleanup.
   * Usa useCallback + refs para evitar unregister/re-register constante.
   */
  const on = useCallback((event, callback) => {
    if (!socket) return () => {}

    socket.on(event, callback)
    
    return () => {
      socket.off(event, callback)
    }
  }, [socket])

  /**
   * Remover listener
   */
  const off = useCallback((event, callback) => {
    if (!socket) return
    socket.off(event, callback)
  }, [socket])

  return (
    <SocketContext.Provider value={{ socket, isConnected, joinSalon, on, off }}>
      {children}
    </SocketContext.Provider>
  )
}

/**
 * Hook para acceder al socket context
 */
export function useSocket() {
  const context = useContext(SocketContext)
  if (!context) {
    // En vez de throw, devolver un stub silencioso (para páginas públicas sin provider)
    return { socket: null, isConnected: false, joinSalon: () => {}, on: () => () => {}, off: () => {} }
  }
  return context
}

/**
 * Hook para escuchar eventos de socket con auto-cleanup
 * Uso: useSocketEvent('appointment:new', (data) => { ... })
 */
export function useSocketEvent(event, callback) {
  const { on } = useSocket()
  const callbackRef = useRef(callback)

  // Mantener ref actualizada sin re-suscribir
  useEffect(() => {
    callbackRef.current = callback
  }, [callback])

  useEffect(() => {
    const handler = (data) => callbackRef.current(data)
    const cleanup = on(event, handler)
    return cleanup
  }, [event, on])
}
