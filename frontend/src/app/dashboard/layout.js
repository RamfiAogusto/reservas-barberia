'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import ProtectedRoute from '@/components/ProtectedRoute'
import { ThemeProvider, useTheme } from '@/contexts/ThemeContext'
import ThemeToggle from '@/components/ThemeToggle'
import Sidebar from '@/components/Sidebar'
import { useSocket } from '@/contexts/SocketContext'
import { useRealtimeNotifications } from '@/utils/useRealtimeNotifications'
import { getUserData, clearAuthData } from '@/utils/api'
import { cn } from '@/lib/utils'

const DashboardShell = ({ children }) => {
  const { isDark } = useTheme()
  const router = useRouter()
  const [user, setUser] = useState(null)

  useEffect(() => {
    const u = getUserData()
    if (u) setUser(u)
  }, [])

  const handleLogout = useCallback(() => {
    clearAuthData()
    router.push('/')
  }, [router])

  return (
    <div className={cn("min-h-screen bg-gray-50 dark:bg-gray-950", isDark && 'dark')}>
      <Sidebar user={user} onLogout={handleLogout} />
      {/* Main area – offset by sidebar width on desktop */}
      <div className="lg:pl-64 min-h-screen">
        <main className="p-4 sm:p-6 lg:p-8 max-w-[1400px] mx-auto">
          {children}
        </main>
      </div>
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
          <DashboardShell>{children}</DashboardShell>
        </DashboardRealtime>
      </ThemeProvider>
    </ProtectedRoute>
  )
}