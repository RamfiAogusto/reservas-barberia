'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { getAuthToken, saveUserData } from '@/utils/api'

const ProtectedRoute = ({ children }) => {
  const router = useRouter()
  const pathname = usePathname()
  const [isVerified, setIsVerified] = useState(false)

  useEffect(() => {
    const token = getAuthToken()
    
    if (!token) {
      router.push('/login')
      return
    }

    const verifyToken = async () => {
      try {
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'}/users/profile`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        })

        if (!response.ok) {
          localStorage.removeItem('authToken')
          localStorage.removeItem('user')
          router.push('/login')
        } else {
          const data = await response.json()
          const user = data.data

          // Actualizar datos del usuario en localStorage
          if (user) saveUserData(user)

          // Si no completó el onboarding y no está en /dashboard/setup, redirigir
          if (user && !user.onboardingCompleted && pathname !== '/dashboard/setup') {
            router.push('/dashboard/setup')
            return
          }

          setIsVerified(true)
        }
      } catch (error) {
        console.error('Error verificando token:', error)
        localStorage.removeItem('authToken')
        localStorage.removeItem('user')
        router.push('/login')
      }
    }

    verifyToken()
  }, [router, pathname])

  if (!isVerified) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-2 border-blue-600 border-t-transparent mx-auto"></div>
          <p className="mt-3 text-gray-500 dark:text-gray-400 text-sm">Verificando sesión...</p>
        </div>
      </div>
    )
  }

  return <>{children}</>
}

export default ProtectedRoute