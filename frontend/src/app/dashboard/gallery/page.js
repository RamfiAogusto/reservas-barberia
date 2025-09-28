'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import GalleryManager from '@/components/GalleryManager'
import { getAuthToken, getUserData } from '@/utils/api'

export default function GalleryPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState(null)

  useEffect(() => {
    const handleInitialize = () => {
      try {
        // Verificar si hay token de autenticación
        const token = getAuthToken()
        if (!token) {
          router.push('/login')
          return
        }
        
        // Obtener datos del usuario del localStorage
        const userData = getUserData()
        if (userData) {
          setUser(userData)
        } else {
          // Si no hay datos del usuario, redirigir al login
          router.push('/login')
          return
        }
      } catch (error) {
        console.error('Error verificando autenticación:', error)
        router.push('/login')
      } finally {
        setLoading(false)
      }
    }

    handleInitialize()
  }, [router])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-lg">Cargando...</div>
      </div>
    )
  }

  return <GalleryManager />
} 