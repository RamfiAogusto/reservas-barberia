"use client"

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import api, { getUserData, getAuthToken, clearAuthData } from '@/utils/api'

const Dashboard = () => {
  const router = useRouter()
  const [user, setUser] = useState(null)
  const [stats, setStats] = useState({
    appointments: { today: 0, thisWeek: 0, thisMonth: 0 },
    services: { totalServices: 0 },
    revenue: { monthlyRevenue: 0 }
  })
  const [loading, setLoading] = useState(true)
  const [todayAppointments, setTodayAppointments] = useState([])
  const [error, setError] = useState('')

  useEffect(() => {
    const handleLoadData = async () => {
      try {
        setLoading(true)
        setError('')
        
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

        // Obtener estadísticas de citas
        try {
          const appointmentStats = await api.get('/appointments/stats/summary')
          if (appointmentStats.success) {
            setStats(prev => ({
              ...prev,
              appointments: appointmentStats.stats,
              revenue: { monthlyRevenue: appointmentStats.stats.monthlyRevenue || 0 }
            }))
          }
        } catch (error) {
          console.error('Error obteniendo estadísticas de citas:', error)
          if (error.message.includes('Token') || error.message.includes('401')) {
            handleAuthError()
            return
          }
        }

        // Obtener estadísticas de servicios
        try {
          const serviceStats = await api.get('/services/stats/summary')
          if (serviceStats.success) {
            setStats(prev => ({
              ...prev,
              services: serviceStats.stats
            }))
          }
        } catch (error) {
          console.error('Error obteniendo estadísticas de servicios:', error)
          if (error.message.includes('Token') || error.message.includes('401')) {
            handleAuthError()
            return
          }
        }

        // Obtener citas de hoy
        try {
          const todayData = await api.get('/appointments/today')
          if (todayData.success) {
            setTodayAppointments(todayData.appointments || [])
          }
        } catch (error) {
          console.error('Error obteniendo citas de hoy:', error)
          if (error.message.includes('Token') || error.message.includes('401')) {
            handleAuthError()
            return
          }
        }

      } catch (error) {
        console.error('Error general en dashboard:', error)
        setError('Error al cargar los datos del dashboard')
      } finally {
        setLoading(false)
      }
    }

    handleLoadData()
  }, [router])

  const handleAuthError = () => {
    clearAuthData()
    router.push('/login')
  }

  const handleLogout = () => {
    clearAuthData()
    router.push('/')
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Cargando dashboard...</p>
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
              <h1 className="text-2xl font-bold text-gray-900">
                {user?.salonName || 'Mi Barbería'}
              </h1>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-gray-700">
                Hola, {user?.username || 'Usuario'}
              </span>
              <button
                onClick={handleLogout}
                className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition-colors"
              >
                Cerrar Sesión
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Navigation Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Link href="/dashboard/services" className="group">
            <div className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow p-6 border border-gray-200 group-hover:border-blue-300">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                    <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.415-3.414l5-5A2 2 0 009 8.172V5L8 4z" />
                    </svg>
                  </div>
                </div>
                <div className="ml-4 flex-1">
                  <h3 className="text-lg font-semibold text-gray-900 group-hover:text-blue-600">
                    Gestionar Servicios
                  </h3>
                  <p className="text-gray-600">
                    Administra los servicios que ofreces, precios y duraciones
                  </p>
                  <p className="text-sm text-gray-500 mt-1">
                    {stats.services.totalServices} servicios activos
                  </p>
                </div>
              </div>
            </div>
          </Link>

          <Link href="/dashboard/appointments" className="group">
            <div className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow p-6 border border-gray-200 group-hover:border-green-300">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                    <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                </div>
                <div className="ml-4 flex-1">
                  <h3 className="text-lg font-semibold text-gray-900 group-hover:text-green-600">
                    Gestionar Citas
                  </h3>
                  <p className="text-gray-600">
                    Ve, crea y administra las citas de tus clientes
                  </p>
                  <p className="text-sm text-gray-500 mt-1">
                    {stats.appointments.today} citas hoy
                  </p>
                </div>
              </div>
            </div>
          </Link>

          <Link href="/dashboard/schedules" className="group">
            <div className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow p-6 border border-gray-200 group-hover:border-purple-300">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                    <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                </div>
                <div className="ml-4 flex-1">
                  <h3 className="text-lg font-semibold text-gray-900 group-hover:text-purple-600">
                    Configurar Horarios
                  </h3>
                  <p className="text-gray-600">
                    Gestiona horarios, descansos y días libres
                  </p>
                  <p className="text-sm text-gray-500 mt-1">
                    Horarios avanzados
                  </p>
                </div>
              </div>
            </div>
          </Link>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                  <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Hoy</p>
                <p className="text-2xl font-bold text-gray-900">{stats.appointments.today}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                  <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Esta Semana</p>
                <p className="text-2xl font-bold text-gray-900">{stats.appointments.thisWeek}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                  <svg className="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Este Mes</p>
                <p className="text-2xl font-bold text-gray-900">{stats.appointments.thisMonth}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-yellow-100 rounded-full flex items-center justify-center">
                  <svg className="w-4 h-4 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                  </svg>
                </div>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Ingresos del Mes</p>
                <p className="text-2xl font-bold text-gray-900">${stats.revenue.monthlyRevenue}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Today's Appointments */}
        <div className="bg-white rounded-lg shadow-md">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Citas de Hoy</h2>
          </div>
          <div className="p-6">
            {todayAppointments.length === 0 ? (
              <div className="text-center py-8">
                <svg className="w-12 h-12 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <p className="text-gray-500">No tienes citas programadas para hoy</p>
                <Link href="/dashboard/appointments">
                  <span className="inline-block mt-4 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors cursor-pointer">
                    Programar Cita
                  </span>
                </Link>
              </div>
            ) : (
              <div className="space-y-4">
                {todayAppointments.map((appointment) => (
                  <div key={appointment._id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                        <span className="text-blue-600 font-semibold">
                          {appointment.time}
                        </span>
                      </div>
                      <div className="ml-4">
                        <p className="font-medium text-gray-900">{appointment.clientName}</p>
                        <p className="text-sm text-gray-600">{appointment.serviceId?.name}</p>
                        <p className="text-sm text-gray-500">{appointment.clientPhone}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        appointment.status === 'confirmada' ? 'bg-green-100 text-green-800' :
                        appointment.status === 'pendiente' ? 'bg-yellow-100 text-yellow-800' :
                        appointment.status === 'completada' ? 'bg-blue-100 text-blue-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {appointment.status}
                      </span>
                      <p className="text-sm text-gray-600 mt-1">${appointment.totalAmount}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}

export default Dashboard 