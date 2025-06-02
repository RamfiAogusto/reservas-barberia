'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'

const BookingPage = () => {
  const params = useParams()
  const router = useRouter()
  const username = params.usuario

  // Estados principales
  const [currentStep, setCurrentStep] = useState(1)
  const [salon, setSalon] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  // Estados del formulario
  const [selectedService, setSelectedService] = useState(null)
  const [selectedDate, setSelectedDate] = useState('')
  const [selectedTime, setSelectedTime] = useState('')
  const [availableSlots, setAvailableSlots] = useState([])
  const [loadingSlots, setLoadingSlots] = useState(false)
  const [daysStatus, setDaysStatus] = useState([])
  const [loadingDays, setLoadingDays] = useState(false)
  
  const [clientData, setClientData] = useState({
    name: '',
    email: '',
    phone: '',
    notes: ''
  })

  // Cargar datos del salón al inicio
  useEffect(() => {
    const handleLoadSalon = async () => {
      try {
        setLoading(true)
        const response = await fetch(`${API_BASE_URL}/public/salon/${username}`)
        const data = await response.json()

        if (data.success) {
          setSalon(data.data)
        } else {
          setError('Salón no encontrado')
        }
      } catch (error) {
        console.error('Error cargando salón:', error)
        setError('Error al cargar el salón')
      } finally {
        setLoading(false)
      }
    }

    if (username) {
      handleLoadSalon()
    }
  }, [username])

  // Cargar estado de días disponibles cuando se selecciona un servicio
  useEffect(() => {
    const handleLoadDaysStatus = async () => {
      if (!selectedService) return

      try {
        setLoadingDays(true)
        const today = new Date()
        const futureDate = new Date()
        futureDate.setDate(today.getDate() + 30) // Próximos 30 días

        const startDate = today.toISOString().split('T')[0]
        const endDate = futureDate.toISOString().split('T')[0]

        const response = await fetch(
          `${API_BASE_URL}/public/salon/${username}/days-status?startDate=${startDate}&endDate=${endDate}`
        )
        const data = await response.json()

        if (data.success) {
          setDaysStatus(data.data.days)
        } else {
          setError('Error al cargar disponibilidad de días')
          setDaysStatus([])
        }
      } catch (error) {
        console.error('Error cargando días:', error)
        setError('Error al cargar disponibilidad')
        setDaysStatus([])
      } finally {
        setLoadingDays(false)
      }
    }

    handleLoadDaysStatus()
  }, [selectedService, username])

  // Cargar slots disponibles cuando se selecciona fecha
  useEffect(() => {
    const handleLoadAvailableSlots = async () => {
      if (!selectedDate || !selectedService) return

      try {
        setLoadingSlots(true)
        const response = await fetch(
          `${API_BASE_URL}/public/salon/${username}/availability/advanced?date=${selectedDate}&serviceId=${selectedService._id}`
        )
        const data = await response.json()

        if (data.success) {
          if (data.data.isBusinessDay) {
            setAvailableSlots(data.data.availableSlots)
          } else {
            setAvailableSlots([])
            setError(`${selectedDate}: ${data.data.reason}`)
          }
        } else {
          setError('Error al cargar horarios disponibles')
          setAvailableSlots([])
        }
      } catch (error) {
        console.error('Error cargando slots:', error)
        setError('Error al cargar horarios')
        setAvailableSlots([])
      } finally {
        setLoadingSlots(false)
      }
    }

    handleLoadAvailableSlots()
  }, [selectedDate, selectedService, username])

  // Función para avanzar al siguiente paso
  const handleNextStep = () => {
    if (currentStep < 4) {
      setCurrentStep(currentStep + 1)
    }
  }

  // Función para retroceder
  const handlePreviousStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1)
    }
  }

  // Función para seleccionar servicio
  const handleSelectService = (service) => {
    setSelectedService(service)
    setSelectedDate('')
    setSelectedTime('')
    setAvailableSlots([])
    handleNextStep()
  }

  // Función para seleccionar hora
  const handleSelectTime = async (time) => {
    try {
      setLoadingSlots(true)
      setError('')

      // Verificar disponibilidad en tiempo real
      const response = await fetch(
        `${API_BASE_URL}/public/salon/${username}/availability/advanced?date=${selectedDate}&serviceId=${selectedService._id}`
      )
      const data = await response.json()

      if (data.success && data.data.isBusinessDay) {
        // Verificar si el horario seleccionado sigue disponible
        const isStillAvailable = data.data.availableSlots.includes(time)
        
        if (!isStillAvailable) {
          setError('Lo sentimos, este horario ya no está disponible. Por favor, selecciona otro horario.')
          // Actualizar la lista de slots disponibles
          setAvailableSlots(data.data.availableSlots)
          return
        }

        // Si el horario sigue disponible, proceder
        setSelectedTime(time)
        handleNextStep()
      } else {
        setError('Error al verificar disponibilidad. Por favor, intenta nuevamente.')
      }
    } catch (error) {
      console.error('Error verificando disponibilidad:', error)
      setError('Error al verificar disponibilidad')
    } finally {
      setLoadingSlots(false)
    }
  }

  // Función para confirmar la reserva
  const handleConfirmBooking = async () => {
    try {
      setSubmitting(true)
      setError('')

      const bookingData = {
        serviceId: selectedService._id,
        clientName: clientData.name,
        clientEmail: clientData.email,
        clientPhone: clientData.phone,
        date: selectedDate,
        time: selectedTime,
        notes: clientData.notes
      }

      const response = await fetch(`${API_BASE_URL}/public/salon/${username}/book`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(bookingData)
      })

      const data = await response.json()

      if (data.success) {
        // Redirigir a página de confirmación o mostrar mensaje
        alert(`¡Reserva confirmada! ID: ${data.data.appointmentId}`)
        router.push(`/${username}`)
      } else {
        setError(data.message || 'Error al crear la reserva')
      }
    } catch (error) {
      console.error('Error creando reserva:', error)
      setError('Error interno del servidor')
    } finally {
      setSubmitting(false)
    }
  }

  // Función para obtener el estado visual de un día
  const getDayStatus = (dateString) => {
    // Si aún no tenemos datos, devolver estado de loading
    if (daysStatus.length === 0) {
      return { available: false, reason: 'Cargando...', type: 'loading' }
    }
    
    const dayInfo = daysStatus.find(day => day.date === dateString)
    
    // Si no encontramos el día en los datos, asumir que no está disponible
    if (!dayInfo) {
      return { available: false, reason: 'Información no disponible', type: 'closed' }
    }
    
    return dayInfo
  }

  // Función para obtener las clases CSS según el estado del día
  const getDayClasses = (dayInfo) => {
    const baseClasses = "p-3 border rounded-lg text-left transition-all relative"
    
    if (dayInfo.type === 'loading') {
      return `${baseClasses} border-gray-200 bg-gray-50 text-gray-400 cursor-not-allowed`
    }
    
    if (!dayInfo.available) {
      switch (dayInfo.type) {
        case 'closed':
          return `${baseClasses} border-gray-300 bg-gray-100 text-gray-500 cursor-not-allowed`
        case 'vacation':
          return `${baseClasses} border-purple-300 bg-purple-50 text-purple-700 cursor-not-allowed`
        case 'holiday':
          return `${baseClasses} border-red-300 bg-red-50 text-red-700 cursor-not-allowed`
        case 'day_off':
          return `${baseClasses} border-orange-300 bg-orange-50 text-orange-700 cursor-not-allowed`
        default:
          return `${baseClasses} border-gray-300 bg-gray-100 text-gray-500 cursor-not-allowed`
      }
    }
    
    if (dayInfo.type === 'special_hours') {
      return `${baseClasses} border-blue-300 bg-blue-50 text-blue-700 hover:border-blue-500 hover:bg-blue-100 cursor-pointer`
    }
    
    // Día disponible normal
    return `${baseClasses} border-gray-200 hover:border-blue-500 hover:bg-blue-50 cursor-pointer`
  }

  // Función para obtener el icono según el tipo de día
  const getDayIcon = (dayInfo) => {
    if (!dayInfo.available) {
      switch (dayInfo.type) {
        case 'closed': return '🚫'
        case 'vacation': return '🏖️'
        case 'holiday': return '🎉'
        case 'day_off': return '📅'
        default: return '❌'
      }
    }
    
    if (dayInfo.type === 'special_hours') {
      return '⏰'
    }
    
    return '✅'
  }

  // Función para obtener fechas para mostrar (próximos 30 días)
  const getDisplayDates = () => {
    const dates = []
    const today = new Date()
    // Asegurar que la fecha comience al inicio del día en la zona horaria local
    today.setHours(0, 0, 0, 0)
    
    for (let i = 0; i < 30; i++) {
      const targetDate = new Date(today)
      targetDate.setDate(today.getDate() + i)
      dates.push(targetDate)
    }
    
    return dates
  }

  // Función para formatear fecha
  const formatDate = (date) => {
    // Asegurar que trabajamos con un objeto Date
    let dateObj
    if (typeof date === 'string') {
      // Si es string, usar parsing manual para evitar problemas de zona horaria
      const [year, month, day] = date.split('-').map(Number)
      dateObj = new Date(year, month - 1, day)
    } else {
      dateObj = new Date(date)
    }
    
    // Asegurar que la fecha está al inicio del día
    dateObj.setHours(0, 0, 0, 0)
    
    return dateObj.toLocaleDateString('es-ES', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  // Función para obtener el string de fecha en formato YYYY-MM-DD
  const getDateString = (date) => {
    const d = new Date(date)
    d.setHours(0, 0, 0, 0)
    const year = d.getFullYear()
    const month = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }

  // Función para formatear precio
  const formatPrice = (price) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN'
    }).format(price)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Cargando...</p>
        </div>
      </div>
    )
  }

  if (error && !salon) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Error</h1>
          <p className="text-gray-600 mb-4">{error}</p>
          <Link
            href="/"
            className="inline-block bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700"
          >
            Volver al inicio
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <Link
                href={`/${username}`}
                className="text-blue-600 hover:text-blue-800 flex items-center"
              >
                ← Volver al perfil
              </Link>
              <h1 className="text-2xl font-bold text-gray-900 mt-2">
                Reservar cita en {salon?.salonName}
              </h1>
            </div>
            
            {/* Indicador de pasos */}
            <div className="flex items-center space-x-2">
              {[1, 2, 3, 4].map((step) => (
                <div
                  key={step}
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                    step === currentStep
                      ? 'bg-blue-600 text-white'
                      : step < currentStep
                      ? 'bg-green-600 text-white'
                      : 'bg-gray-300 text-gray-600'
                  }`}
                >
                  {step < currentStep ? '✓' : step}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8">
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <p className="text-red-800">{error}</p>
          </div>
        )}

        {/* Paso 1: Seleccionar Servicio */}
        {currentStep === 1 && (
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-xl font-semibold mb-6">Paso 1: Selecciona tu servicio</h2>
            
            <div className="grid gap-4 md:grid-cols-2">
              {salon?.services?.map((service) => (
                <div
                  key={service._id}
                  onClick={() => handleSelectService(service)}
                  className="border border-gray-200 rounded-lg p-4 cursor-pointer hover:border-blue-500 hover:shadow-md transition-all"
                >
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-semibold text-lg">{service.name}</h3>
                    <span className="text-blue-600 font-bold">{formatPrice(service.price)}</span>
                  </div>
                  
                  {service.description && (
                    <p className="text-gray-600 text-sm mb-2">{service.description}</p>
                  )}
                  
                  <div className="flex justify-between items-center text-sm text-gray-500">
                    <span>⏱️ {service.duration} minutos</span>
                    <span className="bg-gray-100 px-2 py-1 rounded">
                      {service.category}
                    </span>
                  </div>
                  
                  {service.requiresDeposit && (
                    <div className="mt-2 text-sm text-orange-600">
                      💳 Requiere depósito: {formatPrice(service.depositAmount)}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Paso 2: Seleccionar Fecha */}
        {currentStep === 2 && (
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-xl font-semibold mb-6">Paso 2: Selecciona la fecha</h2>
            
            {/* Servicio seleccionado */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="font-semibold">{selectedService?.name}</h3>
                  <p className="text-sm text-gray-600">
                    {selectedService?.duration} min • {formatPrice(selectedService?.price)}
                  </p>
                </div>
                <button
                  onClick={handlePreviousStep}
                  className="text-blue-600 hover:text-blue-800 text-sm"
                >
                  Cambiar servicio
                </button>
              </div>
            </div>

            {/* Leyenda */}
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-6">
              <h3 className="text-sm font-semibold mb-3">Leyenda:</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                <div className="flex items-center space-x-1">
                  <span>✅</span>
                  <span>Disponible</span>
                </div>
                <div className="flex items-center space-x-1">
                  <span>⏰</span>
                  <span>Horario especial</span>
                </div>
                <div className="flex items-center space-x-1">
                  <span>🚫</span>
                  <span>Cerrado</span>
                </div>
                <div className="flex items-center space-x-1">
                  <span>🏖️</span>
                  <span>Vacaciones</span>
                </div>
                <div className="flex items-center space-x-1">
                  <span>🎉</span>
                  <span>Día festivo</span>
                </div>
                <div className="flex items-center space-x-1">
                  <span>📅</span>
                  <span>Día libre</span>
                </div>
              </div>
            </div>

            {loadingDays ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                <p className="mt-2 text-gray-600">Cargando disponibilidad...</p>
              </div>
            ) : daysStatus.length > 0 ? (
              <div className="grid gap-3 md:grid-cols-3 lg:grid-cols-4">
                {getDisplayDates().map((date) => {
                  const dateString = getDateString(date)
                  const dayInfo = getDayStatus(dateString)
                  
                  return (
                    <button
                      key={dateString}
                      onClick={() => {
                        if (dayInfo.available) {
                          setSelectedDate(dateString)
                          setSelectedTime('')
                          setError('')
                          handleNextStep()
                        }
                      }}
                      disabled={!dayInfo.available}
                      className={getDayClasses(dayInfo)}
                      title={dayInfo.available ? 'Día disponible' : dayInfo.reason}
                    >
                      <div className="font-semibold">{date.getDate()}</div>
                      <div className="text-sm text-gray-600">
                        {date.toLocaleDateString('es-ES', { month: 'short' })}
                      </div>
                      <div className="text-xs text-gray-500">
                        {date.toLocaleDateString('es-ES', { weekday: 'short' })}
                      </div>
                      <div className="absolute top-1 right-1 text-xs">
                        {getDayIcon(dayInfo)}
                      </div>
                      
                      {/* Información adicional para días especiales */}
                      {dayInfo.type === 'special_hours' && (
                        <div className="text-xs text-blue-600 mt-1">
                          Horario especial
                        </div>
                      )}
                      {!dayInfo.available && (
                        <div className="text-xs mt-1 font-medium">
                          {dayInfo.reason}
                        </div>
                      )}
                    </button>
                  )
                })}
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-gray-600">No se pudieron cargar los días disponibles.</p>
                <button
                  onClick={() => window.location.reload()}
                  className="mt-2 text-blue-600 hover:text-blue-800"
                >
                  Recargar página
                </button>
              </div>
            )}

            <div className="mt-6 flex justify-between">
              <button
                onClick={handlePreviousStep}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Anterior
              </button>
            </div>
          </div>
        )}

        {/* Paso 3: Seleccionar Hora */}
        {currentStep === 3 && (
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-xl font-semibold mb-6">Paso 3: Selecciona la hora</h2>
            
            {/* Resumen */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="font-semibold">{selectedService?.name}</h3>
                  <p className="text-sm text-gray-600">
                    {formatDate(selectedDate)}
                  </p>
                </div>
                <button
                  onClick={handlePreviousStep}
                  className="text-blue-600 hover:text-blue-800 text-sm"
                >
                  Cambiar fecha
                </button>
              </div>
            </div>

            {loadingSlots ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                <p className="mt-2 text-gray-600">Verificando disponibilidad...</p>
              </div>
            ) : availableSlots.length > 0 ? (
              <div className="grid gap-3 md:grid-cols-4 lg:grid-cols-6">
                {availableSlots.map((slot) => (
                  <button
                    key={slot}
                    onClick={() => handleSelectTime(slot)}
                    className="p-3 border border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 text-center transition-all"
                  >
                    {slot}
                  </button>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-gray-600">No hay horarios disponibles para esta fecha.</p>
                <button
                  onClick={handlePreviousStep}
                  className="mt-4 text-blue-600 hover:text-blue-800"
                >
                  Seleccionar otra fecha
                </button>
              </div>
            )}

            {error && (
              <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
                {error}
              </div>
            )}

            <div className="mt-6 flex justify-between">
              <button
                onClick={handlePreviousStep}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Anterior
              </button>
            </div>
          </div>
        )}

        {/* Paso 4: Datos del Cliente */}
        {currentStep === 4 && (
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-xl font-semibold mb-6">Paso 4: Tus datos</h2>
            
            {/* Resumen de la reserva */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <h3 className="font-semibold mb-2">Resumen de tu reserva</h3>
              <div className="text-sm space-y-1">
                <p><strong>Servicio:</strong> {selectedService?.name}</p>
                <p><strong>Fecha:</strong> {formatDate(selectedDate)}</p>
                <p><strong>Hora:</strong> {selectedTime}</p>
                <p><strong>Duración:</strong> {selectedService?.duration} minutos</p>
                <p><strong>Precio:</strong> {formatPrice(selectedService?.price)}</p>
                {selectedService?.requiresDeposit && (
                  <p className="text-orange-600">
                    <strong>Depósito requerido:</strong> {formatPrice(selectedService?.depositAmount)}
                  </p>
                )}
              </div>
              <button
                onClick={() => setCurrentStep(1)}
                className="mt-2 text-blue-600 hover:text-blue-800 text-sm"
              >
                Modificar reserva
              </button>
            </div>

            {/* Formulario de datos */}
            <form onSubmit={(e) => {
              e.preventDefault()
              handleConfirmBooking()
            }} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nombre completo *
                </label>
                <input
                  type="text"
                  required
                  value={clientData.name}
                  onChange={(e) => setClientData({...clientData, name: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Tu nombre completo"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email *
                </label>
                <input
                  type="email"
                  required
                  value={clientData.email}
                  onChange={(e) => setClientData({...clientData, email: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="tu@email.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Teléfono *
                </label>
                <input
                  type="tel"
                  required
                  value={clientData.phone}
                  onChange={(e) => setClientData({...clientData, phone: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="55 1234 5678"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Notas adicionales (opcional)
                </label>
                <textarea
                  value={clientData.notes}
                  onChange={(e) => setClientData({...clientData, notes: e.target.value})}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Alguna preferencia o comentario..."
                />
              </div>

              <div className="mt-6 flex justify-between">
                <button
                  type="button"
                  onClick={handlePreviousStep}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Anterior
                </button>
                
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submitting ? 'Confirmando...' : 'Confirmar Reserva'}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  )
}

export default BookingPage 