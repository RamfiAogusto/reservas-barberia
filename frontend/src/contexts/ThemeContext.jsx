'use client'

import { createContext, useContext, useEffect, useState } from 'react'

const STORAGE_KEY = 'dashboard-theme'

const ThemeContext = createContext({
  isDark: false,
  toggleTheme: () => {}
})

export const useTheme = () => {
  const context = useContext(ThemeContext)
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider')
  }
  return context
}

export const ThemeProvider = ({ children }) => {
  // El script inline del layout raíz ya aplicó la clase `dark` antes de la
  // hidratación; aquí solo leemos ese estado (post-hidratación, para no
  // provocar un mismatch con el HTML del servidor). No hay flash porque la
  // clase ya está puesta en <html> y no se toca hasta que mounted === true.
  const [isDark, setIsDark] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setIsDark(document.documentElement.classList.contains('dark'))
    setMounted(true)
  }, [])

  // Sincronizar la clase en <html> y persistir la preferencia.
  // Sin cleanup: el tema es global y debe sobrevivir a la navegación.
  useEffect(() => {
    if (!mounted) return
    const root = document.documentElement
    if (isDark) {
      root.classList.add('dark')
    } else {
      root.classList.remove('dark')
    }
    try {
      localStorage.setItem(STORAGE_KEY, isDark ? 'dark' : 'light')
    } catch (e) {
      // localStorage no disponible
    }
  }, [isDark, mounted])

  const toggleTheme = () => setIsDark((prev) => !prev)

  return (
    <ThemeContext.Provider value={{ isDark, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

// Client wrapper for use in server-component layout.js
export const ThemeClientWrapper = ({ children }) => {
  return <ThemeProvider>{children}</ThemeProvider>
}
