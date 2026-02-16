'use client'

import ProtectedRoute from '@/components/ProtectedRoute'
import { ThemeProvider, useTheme } from '@/contexts/ThemeContext'
import ThemeToggle from '@/components/ThemeToggle'

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

export default function DashboardLayout({ children }) {
  return (
    <ProtectedRoute>
      <ThemeProvider>
        <DashboardWithTheme>{children}</DashboardWithTheme>
      </ThemeProvider>
    </ProtectedRoute>
  )
}