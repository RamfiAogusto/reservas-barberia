'use client'

import { useEffect } from 'react'
import ProtectedRoute from '@/components/ProtectedRoute'
import { ThemeProvider, useTheme } from '@/contexts/ThemeContext'
import ThemeToggle from '@/components/ThemeToggle'
import { useSocket } from '@/contexts/SocketContext'
import { useRealtimeNotifications } from '@/utils/useRealtimeNotifications'

const DashboardWithTheme = ({ children }) => {
  const { isDark } = useTheme()
  return (
    <div className={`min-h-screen ${isDark ? 'dark' : ''}`}>
      {children}
      <div className="fixed bottom-6 right-6 z-50">
        <ThemeToggle />
      </div>
    </div>
  )
}

/**
 * Componente interno que se ejecuta dentro de ProtectedRoute
 * (cuando ya hay usuario autenticado).
 * Se une a la sala WebSocket del salón y activa notificaciones globales.
 */
const DashboardRealtime = ({ children }) => {
  const { joinSalon, isConnected } = useSocket()

  // Unirse a la sala del salón
  useEffect(() => {
    if (!isConnected) return
    const storedUser = localStorage.getItem('user')
    if (storedUser) {
      try {
        const user = JSON.parse(storedUser)
        if (user?.id) {
          joinSalon(user.id)
        }
      } catch (e) {
        // Ignorar
      }
    }
  }, [isConnected, joinSalon])

  // Activar notificaciones toast globales
  useRealtimeNotifications()

  return children
}

export default function DashboardLayout({ children }) {
  return (
    <ProtectedRoute>
      <ThemeProvider>
        <DashboardRealtime>
          <DashboardWithTheme>{children}</DashboardWithTheme>
        </DashboardRealtime>
      </ThemeProvider>
    </ProtectedRoute>
  )
}