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
  const [isDark, setIsDark] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    const stored = localStorage.getItem(STORAGE_KEY)
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    const shouldBeDark = stored === 'dark' || (!stored && prefersDark)
    setIsDark(shouldBeDark)
  }, [])

  // Apply dark class on <html> — only while dashboard is mounted
  useEffect(() => {
    if (!mounted) return
    const root = document.documentElement
    if (isDark) {
      root.classList.add('dark')
    } else {
      root.classList.remove('dark')
    }
    localStorage.setItem(STORAGE_KEY, isDark ? 'dark' : 'light')

    // Cleanup: remove dark class when leaving dashboard
    return () => {
      root.classList.remove('dark')
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
