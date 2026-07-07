'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import ProtectedRoute from '@/components/ProtectedRoute'
import ThemeToggle from '@/components/ThemeToggle'
import Sidebar from '@/components/Sidebar'
import NotificationBell from '@/components/NotificationBell'
import PersistentBanners from '@/components/PersistentBanners'
import { useSocket } from '@/contexts/SocketContext'
import { useRealtimeNotifications } from '@/utils/useRealtimeNotifications'
import { getUserData, clearAuthData } from '@/utils/api'
import { NotificationProvider } from '@/contexts/NotificationContext'

const SIDEBAR_COLLAPSED_KEY = 'sidebarCollapsed'

const DashboardShell = ({ children }) => {
  const router = useRouter()
  const [user, setUser] = useState(null)
  const [collapsed, setCollapsed] = useState(false)

  useEffect(() => {
    const u = getUserData()
    if (u) setUser(u)
    try {
      const stored = localStorage.getItem(SIDEBAR_COLLAPSED_KEY)
      if (stored !== null) setCollapsed(stored === 'true')
    } catch (e) {
      // Ignorar (localStorage no disponible)
    }
  }, [])

  const handleLogout = useCallback(() => {
    clearAuthData()
    router.push('/')
  }, [router])

  const handleCollapsedChange = useCallback((value) => {
    setCollapsed(value)
    try {
      localStorage.setItem(SIDEBAR_COLLAPSED_KEY, String(value))
    } catch (e) {
      // Ignorar (localStorage no disponible)
    }
  }, [])

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <Sidebar user={user} onLogout={handleLogout} collapsed={collapsed} onCollapsedChange={handleCollapsedChange} />
      <div className={`${collapsed ? 'lg:pl-[72px]' : 'lg:pl-64'} min-h-screen transition-[padding] duration-200`}>
        {/* Top bar con campana de notificaciones */}
        <div className="sticky top-0 z-30 bg-gray-50/80 dark:bg-gray-950/80 backdrop-blur-sm border-b border-gray-200/50 dark:border-gray-800/50">
          <div className="flex items-center justify-end gap-2 px-4 sm:px-6 lg:px-8 py-2 max-w-[1400px] mx-auto">
            <NotificationBell />
            <ThemeToggle />
          </div>
        </div>
        <main className="p-4 sm:p-6 lg:p-8 max-w-[1400px] mx-auto">
          <PersistentBanners />
          {children}
        </main>
      </div>
    </div>
  )
}

const DashboardRealtime = ({ children }) => {
  const { joinSalon, isConnected } = useSocket()

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

  useRealtimeNotifications()

  return children
}

export default function DashboardLayout({ children }) {
  return (
    <ProtectedRoute>
      <NotificationProvider>
        <DashboardRealtime>
          <DashboardShell>{children}</DashboardShell>
        </DashboardRealtime>
      </NotificationProvider>
    </ProtectedRoute>
  )
}
