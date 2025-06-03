'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { getAuthToken } from '@/utils/api'

const ProtectedRoute = ({ children }) => {
  const router = useRouter()

  useEffect(() => {
    const token = getAuthToken()
    
    if (!token) {
      // Si no hay token, redirigir al login
      router.push('/login')
      return
    }

    // Verificar si el token es válido haciendo una petición simple
    const verifyToken = async () => {
      try {
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'}/users/profile`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        })

        if (!response.ok) {
          // Token inválido, limpiar localStorage y redirigir
          localStorage.removeItem('authToken')
          localStorage.removeItem('user')
          router.push('/login')
        }
      } catch (error) {
        console.error('Error verificando token:', error)
        // En caso de error, también redirigir al login
        localStorage.removeItem('authToken')
        localStorage.removeItem('user')
        router.push('/login')
      }
    }

    verifyToken()
  }, [router])

  // Si llegamos aquí, renderizar los children
  return <>{children}</>
}

export default ProtectedRoute