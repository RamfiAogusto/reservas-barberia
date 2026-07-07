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

    // El socket requiere un JWT válido en el handshake. Los visitantes
    // públicos (sin token) simplemente no abren conexión — las páginas
    // públicas no consumen eventos en tiempo real del salón.
    const newSocket = io(baseUrl, {
      transports: ['websocket', 'polling'],
      autoConnect: false,
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 20000,
      // Se evalúa en cada intento de conexión, tomando el token vigente.
      auth: (cb) => cb({ token: localStorage.getItem('authToken') }),
    })

    newSocket.on('connect', () => {
      console.log('🔌 WebSocket conectado:', newSocket.id)
      setIsConnected(true)
      // El servidor une automáticamente a las salas del usuario a partir
      // del token verificado; el cliente ya no envía join:salon/join:user.
    })

    newSocket.on('disconnect', (reason) => {
      console.log('🔌 WebSocket desconectado:', reason)
      setIsConnected(false)
    })

    newSocket.on('connect_error', (error) => {
      console.log('🔌 Error de conexión WebSocket:', error.message)
      setIsConnected(false)
    })

    // Conectar solo si hay token; re-evaluar cuando cambia la sesión.
    const syncConnection = () => {
      const hasToken = !!localStorage.getItem('authToken')
      if (hasToken && !newSocket.connected) {
        newSocket.connect()
      } else if (!hasToken && newSocket.connected) {
        newSocket.disconnect()
      }
    }

    syncConnection()
    // 'auth:changed' lo dispara api.js en login/logout; 'storage' cubre otras pestañas.
    window.addEventListener('auth:changed', syncConnection)
    window.addEventListener('storage', syncConnection)

    setSocket(newSocket)

    return () => {
      window.removeEventListener('auth:changed', syncConnection)
      window.removeEventListener('storage', syncConnection)
      newSocket.close()
    }
  }, [])

  /**
   * Compat: la unión a salas ahora es automática en el servidor a partir
   * del token verificado. Se mantiene como no-op para no romper llamadas.
   */
  const joinSalon = useCallback(() => {}, [])

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
