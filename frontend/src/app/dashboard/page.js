"use client"

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { getAuthToken, removeAuthToken } from '@/utils/api'

export default function DashboardPage() {
  const router = useRouter()
  const [user, setUser] = useState(null)

  useEffect(() => {
    // Verificar si hay token de autenticación
    const token = getAuthToken()
    if (!token) {
      router.push('/login')
      return
    }

    // Aquí podrías hacer una petición para obtener los datos del usuario
    // Por ahora solo verificamos que tenga token
    setUser({ name: 'Usuario' }) // Placeholder
  }, [router])

  const handleLogout = () => {
    removeAuthToken()
    router.push('/')
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Cargando...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <Link href="/" className="text-2xl font-bold text-primary-800">
                💈 ReservaBarber
              </Link>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-gray-700">¡Bienvenido!</span>
              <button
                onClick={handleLogout}
                className="btn-secondary px-4 py-2"
              >
                Cerrar sesión
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          {/* Welcome Section */}
          <div className="bg-white overflow-hidden shadow rounded-lg mb-6">
            <div className="px-4 py-5 sm:p-6">
              <div className="text-center">
                <h1 className="text-3xl font-bold text-gray-900 mb-2">
                  🎉 ¡Registro Exitoso!
                </h1>
                <p className="text-lg text-gray-600 mb-6">
                  Tu cuenta ha sido creada correctamente. Bienvenido a ReservaBarber.
                </p>
                <div className="bg-green-50 border border-green-200 rounded-md p-4 mb-6">
                  <div className="flex">
                    <div className="flex-shrink-0">
                      <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div className="ml-3">
                      <p className="text-sm text-green-800">
                        Tu usuario se ha guardado correctamente en la base de datos MongoDB.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Dashboard Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Card 1 */}
            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-primary-100 rounded-md flex items-center justify-center">
                      <span className="text-primary-600 text-xl">🏪</span>
                    </div>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">
                        Mi Barbería
                      </dt>
                      <dd className="text-lg font-medium text-gray-900">
                        Configurar perfil
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
              <div className="bg-gray-50 px-5 py-3">
                <div className="text-sm">
                  <a href="#" className="font-medium text-primary-600 hover:text-primary-500">
                    Configurar ahora
                  </a>
                </div>
              </div>
            </div>

            {/* Card 2 */}
            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-primary-100 rounded-md flex items-center justify-center">
                      <span className="text-primary-600 text-xl">📅</span>
                    </div>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">
                        Reservas
                      </dt>
                      <dd className="text-lg font-medium text-gray-900">
                        0 hoy
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
              <div className="bg-gray-50 px-5 py-3">
                <div className="text-sm">
                  <a href="#" className="font-medium text-primary-600 hover:text-primary-500">
                    Ver todas
                  </a>
                </div>
              </div>
            </div>

            {/* Card 3 */}
            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-primary-100 rounded-md flex items-center justify-center">
                      <span className="text-primary-600 text-xl">✂️</span>
                    </div>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">
                        Servicios
                      </dt>
                      <dd className="text-lg font-medium text-gray-900">
                        Configurar
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
              <div className="bg-gray-50 px-5 py-3">
                <div className="text-sm">
                  <a href="#" className="font-medium text-primary-600 hover:text-primary-500">
                    Añadir servicios
                  </a>
                </div>
              </div>
            </div>
          </div>

          {/* Next Steps */}
          <div className="bg-white overflow-hidden shadow rounded-lg mt-6">
            <div className="px-4 py-5 sm:p-6">
              <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                Próximos pasos para configurar tu barbería
              </h3>
              <div className="space-y-3">
                <div className="flex items-start">
                  <div className="flex-shrink-0">
                    <span className="inline-flex items-center justify-center h-6 w-6 rounded-full bg-primary-100 text-primary-600 text-sm font-medium">1</span>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm text-gray-700">Configurar el perfil de tu barbería</p>
                  </div>
                </div>
                <div className="flex items-start">
                  <div className="flex-shrink-0">
                    <span className="inline-flex items-center justify-center h-6 w-6 rounded-full bg-gray-100 text-gray-600 text-sm font-medium">2</span>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm text-gray-700">Añadir servicios y precios</p>
                  </div>
                </div>
                <div className="flex items-start">
                  <div className="flex-shrink-0">
                    <span className="inline-flex items-center justify-center h-6 w-6 rounded-full bg-gray-100 text-gray-600 text-sm font-medium">3</span>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm text-gray-700">Configurar horarios de atención</p>
                  </div>
                </div>
                <div className="flex items-start">
                  <div className="flex-shrink-0">
                    <span className="inline-flex items-center justify-center h-6 w-6 rounded-full bg-gray-100 text-gray-600 text-sm font-medium">4</span>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm text-gray-700">¡Empezar a recibir reservas!</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
} 