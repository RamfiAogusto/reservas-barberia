'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { useSalonDataOptimized } from '@/utils/SalonContext'
import { useDaysStatus, useAvailableSlots } from '@/utils/useSalonData'
import { cachedRequest } from '@/utils/cache'
import { formatTime12h } from '@/utils/formatTime'

const BookingPage = () => {
  const params = useParams()
  const router = useRouter()
  const searchParams = useSearchParams()
  const username = params.usuario

  // Estados principales
  const [currentStep, setCurrentStep] = useState(1)
  const [submitting, setSubmitting] = useState(false)
  const [successMessage, setSuccessMessage] = useState(null)

  // Estados del formulario
  const [selectedService, setSelectedService] = useState(null)
  const [selectedDate, setSelectedDate] = useState('')
  const [selectedTime, setSelectedTime] = useState('')
  
  const [clientData, setClientData] = useState({
    name: '',
    email: '',
    phone: '',
    notes: ''
  })

  // Hooks optimizados con caché
  const { salon, loading, error } = useSalonDataOptimized(username)
  const { daysStatus, loading: loadingDays } = useDaysStatus(username, selectedService)
  const { 
    availableSlots, 
    allSlots, 
    loading: loadingSlots, 
    checkRealTimeAvailability,
    setAvailableSlots,
    setAllSlots,
    setError
  } = useAvailableSlots(username, selectedDate, selectedService)

  // Efecto para manejar servicio preseleccionado desde URL
  useEffect(() => {
    const serviceId = searchParams.get('service')
    if (serviceId && salon?.services && !selectedService) {
      const service = salon.services.find(s => (s._id || s.id) === serviceId)
      if (service) {
        setSelectedService(service)
        setCurrentStep(2) // Ir directamente al paso de selección de fecha
      }
    }
  }, [salon, searchParams, selectedService])

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
    setAllSlots([])
    handleNextStep()
  }

  // Función para seleccionar hora
  const handleSelectTime = async (time) => {
    try {
      // Verificar disponibilidad en tiempo real usando el hook
      const isStillAvailable = await checkRealTimeAvailability(time)
      
      if (!isStillAvailable) {
        setError('Lo sentimos, este horario ya no está disponible. Por favor, selecciona otro horario.')
        return
      }

      // Si el horario sigue disponible, proceder
      setSelectedTime(time)
      handleNextStep()
    } catch (error) {
      console.error('Error verificando disponibilidad:', error)
      setError('Error al verificar disponibilidad')
    }
  }

  // Función para confirmar la reserva
  const handleConfirmBooking = async () => {
    try {
      setSubmitting(true)
      setError('')

      const bookingData = {
        serviceId: selectedService._id || selectedService.id,
        clientName: clientData.name,
        clientEmail: clientData.email,
        clientPhone: clientData.phone,
        date: selectedDate,
        time: selectedTime,
        notes: clientData.notes
      }

      const data = await cachedRequest(`/public/salon/${username}/book`, {}, null, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(bookingData)
      })

      if (data.success) {
        setSuccessMessage(`¡Reserva confirmada! Te hemos enviado un correo con los detalles.`)
        setTimeout(() => {
          router.push(`/${username}`)
        }, 2500)
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

  // Mostrar loading: mientras carga O cuando aún no hay datos ni error (evitar flash de error)
  const isInitialOrLoading = loading || (!salon && !error)

  if (isInitialOrLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-2 border-blue-600 border-t-transparent mx-auto"></div>
          <p className="mt-4 text-gray-600">Cargando...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md px-4">
          <div className="text-6xl mb-4">🚫</div>
          <h1 className="text-2xl font-bold text-gray-800 mb-2">Salón no encontrado</h1>
          <p className="text-gray-600 mb-6">{error}</p>
          <Link
            href="/"
            className="inline-block bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Volver al inicio
          </Link>
        </div>
      </div>
    )
  }

  const steps = [
    { num: 1, label: 'Servicio', short: 'Servicio' },
    { num: 2, label: 'Fecha', short: 'Fecha' },
    { num: 3, label: 'Hora', short: 'Hora' },
    { num: 4, label: 'Confirmar', short: 'Datos' }
  ]

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Toast de éxito */}
      {successMessage && (
        <div
          className="fixed top-4 left-1/2 -translate-x-1/2 z-50 max-w-md mx-4 px-6 py-4 bg-emerald-600 text-white rounded-xl shadow-lg flex items-center gap-3"
          role="status"
          aria-live="polite"
        >
          <span className="text-2xl">✓</span>
          <p className="font-medium">{successMessage}</p>
        </div>
      )}

      {/* Header limpio */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40">
        <div className="max-w-3xl mx-auto px-4 py-4">
          <Link
            href={`/${username}`}
            className="inline-flex items-center gap-2 text-slate-600 hover:text-slate-900 text-sm mb-4 transition-colors"
            aria-label="Volver al perfil del salón"
          >
            <span aria-hidden>←</span> {salon?.salonName}
          </Link>
          <h1 className="text-xl font-semibold text-slate-900">Reservar cita</h1>

          {/* Stepper con etiquetas */}
          <nav aria-label="Progreso de la reserva" className="mt-4">
            <ol className="flex justify-between gap-2">
              {steps.map((step) => (
                <li
                  key={step.num}
                  className="flex flex-col items-center flex-1 min-w-0"
                  aria-current={step.num === currentStep ? 'step' : undefined}
                >
                  <div
                    className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-semibold shrink-0 transition-colors ${
                      step.num === currentStep
                        ? 'bg-emerald-600 text-white ring-4 ring-emerald-100'
                        : step.num < currentStep
                          ? 'bg-emerald-600 text-white'
                          : 'bg-slate-200 text-slate-500'
                    }`}
                  >
                    {step.num < currentStep ? '✓' : step.num}
                  </div>
                  <span className={`mt-1.5 text-xs font-medium truncate w-full text-center hidden sm:block ${
                    step.num === currentStep ? 'text-emerald-600' : step.num < currentStep ? 'text-slate-600' : 'text-slate-400'
                  }`}>
                    {step.label}
                  </span>
                </li>
              ))}
            </ol>
          </nav>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-4 py-8">
        {error && (
          <div
            className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6 flex items-start gap-3"
            role="alert"
          >
            <span className="text-red-500 text-lg shrink-0">⚠</span>
            <p className="text-red-800 text-sm">{error}</p>
          </div>
        )}

        {/* Resumen flotante - siempre visible cuando hay selección */}
        {(selectedService || selectedDate || selectedTime) && currentStep > 1 && (
          <div
            className="bg-white rounded-xl border border-slate-200 p-4 mb-6 shadow-sm"
            aria-label="Resumen de tu selección"
          >
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-2">Tu selección</p>
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
              {selectedService && (
                <span className="text-slate-700">
                  <strong>{selectedService.name}</strong> · {formatPrice(selectedService.price)}
                </span>
              )}
              {selectedDate && (
                <span className="text-slate-600">
                  📅 {formatDate(selectedDate)}
                </span>
              )}
              {selectedTime && (
                <span className="text-slate-600">
                  🕐 {formatTime12h(selectedTime)}
                </span>
              )}
            </div>
            <button
              type="button"
              onClick={() => setCurrentStep(1)}
              className="mt-2 text-emerald-600 hover:text-emerald-700 text-sm font-medium"
              aria-label="Modificar selección"
            >
              Cambiar reserva
            </button>
          </div>
        )}

        {/* Paso 1: Seleccionar Servicio */}
        {currentStep === 1 && (
          <section
            className="bg-white rounded-2xl shadow-sm border border-slate-200/60 p-6 sm:p-8"
            aria-labelledby="step1-title"
          >
            <h2 id="step1-title" className="text-lg font-semibold text-slate-900 mb-1">
              ¿Qué servicio deseas?
            </h2>
            <p className="text-slate-500 text-sm mb-6">Elige el servicio que mejor se adapte a ti</p>
            
            <div className="grid gap-3 sm:grid-cols-2">
              {salon?.services?.map((service) => {
                const isSelected = (selectedService?._id || selectedService?.id) === (service._id || service.id)
                return (
                  <button
                    key={service._id || service.id}
                    type="button"
                    onClick={() => handleSelectService(service)}
                    className={`text-left rounded-xl p-4 sm:p-5 border-2 transition-all focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 ${
                      isSelected
                        ? 'border-emerald-500 bg-emerald-50/50 shadow-sm'
                        : 'border-slate-200 hover:border-slate-300 bg-white hover:bg-slate-50/50'
                    }`}
                    aria-pressed={isSelected}
                    aria-label={`Seleccionar ${service.name}, ${formatPrice(service.price)}`}
                  >
                    <div className="flex justify-between items-start gap-3">
                      <h3 className="font-semibold text-slate-900">{service.name}</h3>
                      <span className={`font-bold shrink-0 ${isSelected ? 'text-emerald-600' : 'text-slate-700'}`}>
                        {formatPrice(service.price)}
                      </span>
                    </div>
                    {service.description && (
                      <p className="text-slate-500 text-sm mt-1 line-clamp-2">{service.description}</p>
                    )}
                    <div className="flex items-center justify-between mt-3 text-xs text-slate-400">
                      {service.showDuration !== false && (
                        <span>⏱ {service.duration} min</span>
                      )}
                      <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full capitalize">
                        {service.category}
                      </span>
                    </div>
                    {salon?.requiresDeposit && salon?.depositAmount > 0 && (
                      <p className="mt-2 text-xs text-amber-600">
                        Depósito: {formatPrice(salon.depositAmount)}
                      </p>
                    )}
                    {isSelected && (
                      <div className="mt-3 flex items-center gap-1.5 text-emerald-600 text-sm font-medium">
                        <span>✓</span> Seleccionado
                      </div>
                    )}
                  </button>
                )
              })}
            </div>
          </section>
        )}

        {/* Paso 2: Seleccionar Fecha */}
        {currentStep === 2 && (
          <section
            className="bg-white rounded-2xl shadow-sm border border-slate-200/60 p-6 sm:p-8"
            aria-labelledby="step2-title"
          >
            <h2 id="step2-title" className="text-lg font-semibold text-slate-900 mb-1">
              ¿Cuándo prefieres?
            </h2>
            <p className="text-slate-500 text-sm mb-6">
              {selectedService?.name} · {formatPrice(selectedService?.price)}
            </p>

            {/* Leyenda compacta */}
            <details className="mb-6 group">
              <summary className="text-sm text-slate-500 cursor-pointer hover:text-slate-700 list-none flex items-center gap-1">
                <span className="group-open:rotate-90 transition-transform">▸</span> Ver significado de los iconos
              </summary>
              <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
                <span>✅ Disponible</span>
                <span>⏰ Horario especial</span>
                <span>🚫 Cerrado</span>
                <span>🏖️ Vacaciones</span>
                <span>🎉 Festivo</span>
                <span>📅 Día libre</span>
              </div>
            </details>

            {loadingDays ? (
              <div className="py-12 flex flex-col items-center justify-center">
                <div className="w-10 h-10 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin" />
                <p className="mt-3 text-slate-500 text-sm">Buscando días disponibles...</p>
              </div>
            ) : daysStatus.length > 0 ? (
              <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 gap-2">
                {getDisplayDates().map((date) => {
                  const dateString = getDateString(date)
                  const dayInfo = getDayStatus(dateString)
                  const isToday = getDateString(new Date()) === dateString
                  const isAvailable = dayInfo.available
                  return (
                    <button
                      key={dateString}
                      type="button"
                      onClick={() => {
                        if (isAvailable) {
                          setSelectedDate(dateString)
                          setSelectedTime('')
                          setError('')
                          handleNextStep()
                        }
                      }}
                      disabled={!isAvailable}
                      className={`
                        relative p-3 rounded-xl text-center transition-all focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2
                        ${isAvailable
                          ? 'bg-white border-2 border-slate-200 hover:border-emerald-400 hover:bg-emerald-50/30 cursor-pointer'
                          : 'bg-slate-50 border-2 border-slate-100 text-slate-400 cursor-not-allowed'
                        }
                        ${isToday && isAvailable ? 'ring-2 ring-emerald-200' : ''}
                      `}
                      title={isAvailable ? 'Seleccionar este día' : dayInfo.reason}
                      aria-label={isAvailable ? `${date.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })} - Disponible` : dayInfo.reason}
                    >
                      <span className="text-xs text-slate-400 block">{date.toLocaleDateString('es-ES', { weekday: 'short' })}</span>
                      <span className="text-lg font-semibold text-slate-900 block">{date.getDate()}</span>
                      <span className="text-xs text-slate-500 block">{date.toLocaleDateString('es-ES', { month: 'short' })}</span>
                      {!isAvailable && (
                        <span className="absolute top-1 right-1 text-xs" aria-hidden>{getDayIcon(dayInfo)}</span>
                      )}
                    </button>
                  )
                })}
              </div>
            ) : (
              <div className="py-12 text-center">
                <p className="text-slate-500">No se pudieron cargar los días.</p>
                <button
                  type="button"
                  onClick={() => window.location.reload()}
                  className="mt-3 text-emerald-600 hover:text-emerald-700 text-sm font-medium"
                >
                  Recargar
                </button>
              </div>
            )}

            <div className="mt-8 pt-6 border-t border-slate-100">
              <button
                type="button"
                onClick={handlePreviousStep}
                className="text-slate-600 hover:text-slate-900 text-sm font-medium flex items-center gap-2"
                aria-label="Volver a seleccionar servicio"
              >
                ← Cambiar servicio
              </button>
            </div>
          </section>
        )}

        {/* Paso 3: Seleccionar Hora */}
        {currentStep === 3 && (
          <section
            className="bg-white rounded-2xl shadow-sm border border-slate-200/60 p-6 sm:p-8"
            aria-labelledby="step3-title"
          >
            <h2 id="step3-title" className="text-lg font-semibold text-slate-900 mb-1">
              ¿A qué hora?
            </h2>
            <p className="text-slate-500 text-sm mb-6">
              {formatDate(selectedDate)}
              {selectedService?.showDuration !== false && selectedService?.duration != null && (
                <span className="text-slate-400"> · {selectedService.duration} min</span>
              )}
            </p>

            {selectedService?.showDuration !== false && selectedService?.duration != null && (
              <p className="text-xs text-slate-500 mb-4">
                Cada horario reserva {selectedService?.duration} minutos. El servicio termina {selectedService?.duration} min después de la hora elegida.
              </p>
            )}

            {loadingSlots ? (
              <div className="py-12 flex flex-col items-center justify-center">
                <div className="w-10 h-10 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin" />
                <p className="mt-3 text-slate-500 text-sm">Buscando horarios disponibles...</p>
              </div>
            ) : allSlots.length > 0 ? (
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
                {allSlots.map((slot) => {
                  const [hour, min] = slot.time.split(':').map(Number)
                  const startMinutes = hour * 60 + min
                  const endMinutes = startMinutes + (selectedService?.duration || 30)
                  const endHour = Math.floor(endMinutes / 60)
                  const endMin = endMinutes % 60
                  const endTime = `${endHour.toString().padStart(2, '0')}:${endMin.toString().padStart(2, '0')}`
                  const showEndTime = selectedService?.showDuration !== false && selectedService?.duration != null
                  return (
                    <button
                      key={slot.time}
                      type="button"
                      onClick={() => slot.available && handleSelectTime(slot.time)}
                      disabled={!slot.available}
                      className={`
                        p-3 sm:p-4 rounded-xl text-center transition-all focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2
                        ${slot.available
                          ? 'bg-white border-2 border-slate-200 hover:border-emerald-400 hover:bg-emerald-50/30 cursor-pointer'
                          : 'bg-slate-50 border-2 border-slate-100 text-slate-400 cursor-not-allowed'
                        }
                      `}
                      title={slot.available ? `Reservar a las ${formatTime12h(slot.time)}` : slot.reason}
                      aria-label={slot.available ? `Horario disponible: ${formatTime12h(slot.time)}` : `No disponible: ${slot.reason}`}
                    >
                      <span className={`block font-semibold text-base ${slot.available ? 'text-slate-900' : 'text-slate-400'}`}>
                        {formatTime12h(slot.time)}
                      </span>
                      {showEndTime && (
                        <span className="block text-xs text-slate-500 mt-0.5">
                          hasta {formatTime12h(endTime)}
                        </span>
                      )}
                      {!slot.available && (
                        <span className="block text-xs mt-1 text-slate-400 truncate" title={slot.reason}>
                          {slot.reason}
                        </span>
                      )}
                    </button>
                  )
                })}
              </div>
            ) : (
              <div className="py-12 text-center">
                <p className="text-slate-500">No hay horarios para esta fecha.</p>
                <button
                  type="button"
                  onClick={handlePreviousStep}
                  className="mt-3 text-emerald-600 hover:text-emerald-700 text-sm font-medium"
                >
                  Elegir otra fecha
                </button>
              </div>
            )}

            <div className="mt-8 pt-6 border-t border-slate-100">
              <button
                type="button"
                onClick={handlePreviousStep}
                className="text-slate-600 hover:text-slate-900 text-sm font-medium flex items-center gap-2"
                aria-label="Volver a seleccionar fecha"
              >
                ← Cambiar fecha
              </button>
            </div>
          </section>
        )}

        {/* Paso 4: Datos del Cliente */}
        {currentStep === 4 && (
          <section
            className="bg-white rounded-2xl shadow-sm border border-slate-200/60 p-6 sm:p-8"
            aria-labelledby="step4-title"
          >
            <h2 id="step4-title" className="text-lg font-semibold text-slate-900 mb-1">
              Tus datos para confirmar
            </h2>
            <p className="text-slate-500 text-sm mb-6">Te enviaremos un correo con los detalles de la reserva</p>
            
            {/* Resumen compacto */}
            <div className="bg-slate-50 rounded-xl p-4 mb-6 border border-slate-100">
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-slate-700">
                <span><strong>{selectedService?.name}</strong> · {formatPrice(selectedService?.price)}</span>
                <span>📅 {formatDate(selectedDate)}</span>
                <span>🕐 {formatTime12h(selectedTime)}</span>
              </div>
              {salon?.requiresDeposit && salon?.depositAmount > 0 && (
                <p className="text-amber-600 text-sm mt-2">
                  Depósito: {formatPrice(salon.depositAmount)} (para confirmar)
                </p>
              )}
            </div>

            {/* Política de No-Show - solo si hay depósito */}
            {salon?.requiresDeposit && salon?.depositAmount > 0 && (
              <details className="mb-6 group">
                <summary className="text-sm text-slate-600 cursor-pointer hover:text-slate-800 flex items-center gap-2 list-none">
                  <span className="group-open:rotate-90 transition-transform">▸</span>
                  Política de inasistencia (importante)
                </summary>
                <div className="mt-3 p-4 bg-amber-50 rounded-xl border border-amber-100 text-sm text-amber-900">
                  <p className="font-medium mb-2">Se requiere depósito de {formatPrice(salon.depositAmount)} para confirmar.</p>
                  <ul className="list-disc list-inside space-y-1 text-amber-800">
                    <li>Si no asistes, el depósito no se reembolsa</li>
                    <li>Cancelar o reprogramar: mínimo 24 h antes</li>
                    <li>El precio completo ({formatPrice(selectedService?.price)}) se paga al llegar</li>
                  </ul>
                  <p className="mt-2 font-medium">Al confirmar, aceptas estas condiciones.</p>
                </div>
              </details>
            )}

            <form
              onSubmit={(e) => {
                e.preventDefault()
                handleConfirmBooking()
              }}
              className="space-y-4"
            >
              <div>
                <label htmlFor="client-name" className="block text-sm font-medium text-slate-700 mb-1.5">
                  Nombre completo
                </label>
                <input
                  id="client-name"
                  type="text"
                  required
                  value={clientData.name}
                  onChange={(e) => setClientData({ ...clientData, name: e.target.value })}
                  className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-shadow"
                  placeholder="Tu nombre"
                  autoComplete="name"
                  aria-required="true"
                />
              </div>

              <div>
                <label htmlFor="client-email" className="block text-sm font-medium text-slate-700 mb-1.5">
                  Correo electrónico
                </label>
                <input
                  id="client-email"
                  type="email"
                  required
                  value={clientData.email}
                  onChange={(e) => setClientData({ ...clientData, email: e.target.value })}
                  className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-shadow"
                  placeholder="tu@correo.com"
                  autoComplete="email"
                  aria-required="true"
                />
              </div>

              <div>
                <label htmlFor="client-phone" className="block text-sm font-medium text-slate-700 mb-1.5">
                  Teléfono
                </label>
                <input
                  id="client-phone"
                  type="tel"
                  required
                  value={clientData.phone}
                  onChange={(e) => setClientData({ ...clientData, phone: e.target.value })}
                  className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-shadow"
                  placeholder="55 1234 5678"
                  autoComplete="tel"
                  aria-required="true"
                />
              </div>

              <div>
                <label htmlFor="client-notes" className="block text-sm font-medium text-slate-700 mb-1.5">
                  Notas (opcional)
                </label>
                <textarea
                  id="client-notes"
                  value={clientData.notes}
                  onChange={(e) => setClientData({ ...clientData, notes: e.target.value })}
                  rows={2}
                  className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-shadow resize-none"
                  placeholder="Alguna preferencia o comentario..."
                />
              </div>

              <div className="flex flex-col-reverse sm:flex-row gap-3 sm:justify-between sm:items-center pt-6 border-t border-slate-100">
                <button
                  type="button"
                  onClick={handlePreviousStep}
                  className="text-slate-600 hover:text-slate-900 text-sm font-medium"
                  aria-label="Volver a seleccionar hora"
                >
                  ← Cambiar hora
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full sm:w-auto px-6 py-3 bg-emerald-600 text-white font-semibold rounded-xl hover:bg-emerald-700 disabled:opacity-60 disabled:cursor-not-allowed transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2"
                  aria-busy={submitting}
                >
                  {submitting ? 'Confirmando...' : 'Confirmar reserva'}
                </button>
              </div>
            </form>
          </section>
        )}
      </div>
    </div>
  )
}

export default BookingPage 