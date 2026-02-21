"use client"

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import api, { getUserData, getAuthToken, clearAuthData } from '@/utils/api'
import { formatTime12h } from '@/utils/formatTime'

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
            setTodayAppointments(todayData.data || [])
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
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 dark:border-blue-400 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Cargando dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 shadow-sm border-b dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                {user?.salonName || 'Mi Barbería'}
              </h1>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-gray-700 dark:text-gray-300">
                Hola, {user?.username || 'Usuario'}
              </span>
              <button
                onClick={handleLogout}
                className="bg-red-600 hover:bg-red-700 dark:bg-red-700 dark:hover:bg-red-600 text-white px-4 py-2 rounded-lg transition-colors"
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
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md hover:shadow-lg transition-all p-6 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 group-hover:border-blue-300 dark:group-hover:border-blue-500">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/40 rounded-lg flex items-center justify-center">
                    <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.415-3.414l5-5A2 2 0 009 8.172V5L8 4z" />
                    </svg>
                  </div>
                </div>
                <div className="ml-4 flex-1">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 group-hover:text-blue-600 dark:group-hover:text-blue-400">
                    Gestionar Servicios
                  </h3>
                  <p className="text-gray-600 dark:text-gray-300">
                    Administra los servicios que ofreces, precios y duraciones
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    {stats.services.totalServices} servicios activos
                  </p>
                </div>
              </div>
            </div>
          </Link>

          <Link href="/dashboard/appointments" className="group">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md hover:shadow-lg transition-all p-6 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 group-hover:border-green-300 dark:group-hover:border-green-500">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-12 h-12 bg-green-100 dark:bg-green-900/40 rounded-lg flex items-center justify-center">
                    <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                </div>
                <div className="ml-4 flex-1">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 group-hover:text-green-600 dark:group-hover:text-green-400">
                    Gestionar Citas
                  </h3>
                  <p className="text-gray-600 dark:text-gray-300">
                    Ve, crea y administra las citas de tus clientes
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    {stats.appointments.today} citas hoy
                  </p>
                </div>
              </div>
            </div>
          </Link>

          <Link href="/dashboard/schedules" className="group">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md hover:shadow-lg transition-all p-6 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 group-hover:border-purple-300 dark:group-hover:border-purple-500">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/40 rounded-lg flex items-center justify-center">
                    <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                </div>
                <div className="ml-4 flex-1">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 group-hover:text-purple-600 dark:group-hover:text-purple-400">
                    Configurar Horarios
                  </h3>
                  <p className="text-gray-600 dark:text-gray-300">
                    Gestiona horarios, descansos y días libres
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    Horarios avanzados
                  </p>
                </div>
              </div>
            </div>
          </Link>
        </div>
        
        {/* Segunda fila de tarjetas de navegación */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Link href="/dashboard/gallery" className="group">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md hover:shadow-lg transition-all p-6 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 group-hover:border-amber-300 dark:group-hover:border-amber-500">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-12 h-12 bg-amber-100 dark:bg-amber-900/40 rounded-lg flex items-center justify-center">
                    <svg className="w-6 h-6 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                </div>
                <div className="ml-4 flex-1">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 group-hover:text-amber-600 dark:group-hover:text-amber-400">
                    Gestionar Galería
                  </h3>
                  <p className="text-gray-600 dark:text-gray-300">
                    Sube y administra las imágenes de tu negocio
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    Personaliza tu perfil público
                  </p>
                </div>
              </div>
            </div>
          </Link>

          <Link href="/dashboard/barbers" className="group">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md hover:shadow-lg transition-all p-6 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 group-hover:border-teal-300 dark:group-hover:border-teal-500">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-12 h-12 bg-teal-100 dark:bg-teal-900/40 rounded-lg flex items-center justify-center">
                    <span className="text-2xl">✂️</span>
                  </div>
                </div>
                <div className="ml-4 flex-1">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 group-hover:text-teal-600 dark:group-hover:text-teal-400">
                    Barberos
                  </h3>
                  <p className="text-gray-600 dark:text-gray-300">
                    Administra el equipo de barberos de tu negocio
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    Asigna citas por barbero
                  </p>
                </div>
              </div>
            </div>
          </Link>

          <Link href="/dashboard/settings" className="group">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md hover:shadow-lg transition-all p-6 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 group-hover:border-indigo-300 dark:group-hover:border-indigo-500">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-12 h-12 bg-indigo-100 dark:bg-indigo-900/40 rounded-lg flex items-center justify-center">
                    <svg className="w-6 h-6 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </div>
                </div>
                <div className="ml-4 flex-1">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400">
                    Configuración
                  </h3>
                  <p className="text-gray-600 dark:text-gray-300">
                    Perfil, depósito y opciones del negocio
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    Personaliza cómo funcionan las reservas
                  </p>
                </div>
              </div>
            </div>
          </Link>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 border border-transparent dark:border-gray-700">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                  <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Hoy</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{stats.appointments.today}</p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 border border-transparent dark:border-gray-700">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                  <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Esta Semana</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{stats.appointments.thisWeek}</p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 border border-transparent dark:border-gray-700">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                  <svg className="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Este Mes</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{stats.appointments.thisMonth}</p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 border border-transparent dark:border-gray-700">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-yellow-100 rounded-full flex items-center justify-center">
                  <svg className="w-4 h-4 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                  </svg>
                </div>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Ingresos del Mes</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">${stats.revenue.monthlyRevenue}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Perfil Público Card */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-800 rounded-lg shadow-lg mb-8 overflow-hidden">
          <div className="p-6">
            <div className="flex flex-col md:flex-row items-center justify-between gap-6">
              <div className="flex-1 text-white">
                <h2 className="text-2xl font-bold mb-2">Tu Perfil Público</h2>
                <p className="text-blue-100 mb-4">
                  Comparte tu perfil con tus clientes para que puedan ver tus servicios y reservar citas directamente.
                </p>
                <div className="flex flex-wrap gap-4">
                  <Link
                    href={`/${user?.username}`}
                    target="_blank"
                    className="bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-300 px-6 py-3 rounded-lg font-semibold hover:bg-blue-50 dark:hover:bg-gray-600 transition-all duration-200 flex items-center gap-2"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                    Ver Perfil Público
                  </Link>
                  <button
                    onClick={() => {
                      const profileUrl = `${window.location.origin}/${user?.username}`;
                      navigator.clipboard.writeText(profileUrl);
                      alert('¡Link copiado al portapapeles!');
                    }}
                    className="bg-blue-700 dark:bg-blue-800 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-800 dark:hover:bg-blue-700 transition-all duration-200 flex items-center gap-2"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                    </svg>
                    Compartir Link
                  </button>
                </div>
              </div>
              <div className="hidden md:block">
                <div className="w-32 h-32 bg-white bg-opacity-20 rounded-full flex items-center justify-center">
                  <svg className="w-16 h-16 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Today's Appointments */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md border border-transparent dark:border-gray-700">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Citas de Hoy</h2>
          </div>
          <div className="p-6">
            {todayAppointments.length === 0 ? (
              <div className="text-center py-8">
                <svg className="w-12 h-12 text-gray-400 dark:text-gray-500 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <p className="text-gray-500 dark:text-gray-400">No tienes citas programadas para hoy</p>
                <Link href="/dashboard/appointments">
                  <span className="inline-block mt-4 bg-blue-600 dark:bg-blue-700 hover:bg-blue-700 dark:hover:bg-blue-600 text-white px-4 py-2 rounded-lg transition-colors cursor-pointer">
                    Programar Cita
                  </span>
                </Link>
              </div>
            ) : (
              <div className="space-y-4">
                {todayAppointments.map((appointment) => (
                  <div key={appointment.id || appointment._id} className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4 border border-gray-200 dark:border-gray-600 hover:border-blue-300 dark:hover:border-blue-500 transition-colors">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <div className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium">
                            {formatTime12h(appointment.time)}
                          </div>
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            appointment.status === 'CONFIRMADA' ? 'bg-green-100 text-green-800' :
                            appointment.status === 'PENDIENTE' ? 'bg-yellow-100 text-yellow-800' :
                            appointment.status === 'COMPLETADA' ? 'bg-blue-100 text-blue-800' :
                            appointment.status === 'CANCELADA' ? 'bg-red-100 text-red-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {appointment.status}
                          </span>
                        </div>
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-1">
                          {appointment.clientName}
                        </h3>
                        <div className="text-sm text-gray-600 dark:text-gray-300 mb-2">
                          {appointment.service?.name || appointment.serviceId?.name}
                          {appointment.staffMember && (
                            <span className="ml-2">• con {appointment.staffMember}</span>
                          )}
                        </div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                          <div className="flex items-center gap-2">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                            </svg>
                            {appointment.clientEmail}
                          </div>
                          <div className="flex items-center gap-2 mt-1">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                            </svg>
                            {appointment.clientPhone}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Link
                          href={`/dashboard/appointments?date=${new Date().toISOString().split('T')[0]}`}
                          className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                        </Link>
                      </div>
                    </div>
                  </div>
                ))}
                <div className="mt-4 text-center">
                  <Link
                    href="/dashboard/appointments"
                    className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 font-medium inline-flex items-center gap-2"
                  >
                    Ver todas las citas
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </Link>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}

export default Dashboard 