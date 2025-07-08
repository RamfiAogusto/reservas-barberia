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

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="mb-8">
        <h1 className="text-2xl font-bold mb-2">Galería de Imágenes</h1>
        <p className="text-gray-600">
          Administra las fotos de tu negocio que se mostrarán en tu perfil público. Las imágenes marcadas como destacadas aparecerán en la sección principal de tu perfil.
        </p>
      </div>

      <GalleryManager />
    </div>
  )
} 