'use client'

import { useState, useEffect, useMemo } from 'react'
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
  const [bookingError, setBookingError] = useState('')
  const [checkingTime, setCheckingTime] = useState(false)

  // Estados del formulario
  const [selectedServices, setSelectedServices] = useState([])
  const [selectedBarber, setSelectedBarber] = useState(null)
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

  // Derivados multi-servicio
  const primaryService = selectedServices.length > 0 ? selectedServices[0] : null
  const totalDuration = useMemo(() => selectedServices.reduce((sum, s) => sum + (s.duration || 0), 0), [selectedServices])
  const totalPrice = useMemo(() => selectedServices.reduce((sum, s) => sum + (s.price || 0), 0), [selectedServices])

  const { daysStatus, loading: loadingDays } = useDaysStatus(username, primaryService)

  // Determinar si hay barberos y modo de asignación
  const hasBarbers = salon?.barbers && salon.barbers.length > 0
  const isAnyBarberMode = hasBarbers && selectedBarber?.id === 'any'

  // Calcular pasos dinámicos (memoizar para evitar re-renders innecesarios)
  const STEPS = useMemo(() => hasBarbers
    ? { SERVICE: 1, BARBER: 2, DATE: 3, TIME: 4, CONFIRM: 5 }
    : { SERVICE: 1, BARBER: -1, DATE: 2, TIME: 3, CONFIRM: 4 }, [hasBarbers])
  const totalSteps = hasBarbers ? 5 : 4

  const { 
    availableSlots, 
    allSlots, 
    loading: loadingSlots, 
    checkRealTimeAvailability,
    setAvailableSlots,
    setAllSlots
  } = useAvailableSlots(username, selectedDate, primaryService, selectedBarber?.id || null, selectedServices.length > 1 ? totalDuration : null)

  // Efecto para manejar servicio preseleccionado desde URL
  useEffect(() => {
    const serviceId = searchParams.get('service')
    if (serviceId && salon?.services && selectedServices.length === 0) {
      const service = salon.services.find(s => (s._id || s.id) === serviceId)
      if (service) {
        setSelectedServices([service])
        setCurrentStep(STEPS.BARBER > 0 ? STEPS.BARBER : STEPS.DATE)
      }
    }
  }, [salon, searchParams, selectedServices.length, STEPS])

  // Función para avanzar al siguiente paso
  const handleNextStep = () => {
    if (currentStep < totalSteps) {
      setCurrentStep(currentStep + 1)
    }
  }

  // Función para retroceder
  const handlePreviousStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1)
    }
  }

  // Función para toggle de servicio (multi-select)
  const handleToggleService = (service) => {
    const serviceId = service._id || service.id
    setSelectedServices(prev => {
      const exists = prev.find(s => (s._id || s.id) === serviceId)
      if (exists) {
        return prev.filter(s => (s._id || s.id) !== serviceId)
      }
      return [...prev, service]
    })
    // Limpiar pasos siguientes al cambiar servicios
    setSelectedDate('')
    setSelectedTime('')
    setBookingError('')
    setAvailableSlots([])
    setAllSlots([])
  }

  // Función para continuar después de seleccionar servicios
  const handleConfirmServices = () => {
    if (selectedServices.length === 0) return
    setSelectedBarber(null)
    setCurrentStep(STEPS.BARBER > 0 ? STEPS.BARBER : STEPS.DATE)
  }

  // Función para seleccionar barbero
  const handleSelectBarber = (barber) => {
    setSelectedBarber(barber)
    setSelectedDate('')
    setSelectedTime('')
    setBookingError('')
    setAvailableSlots([])
    setAllSlots([])
    setCurrentStep(STEPS.DATE)
  }

  // Función para seleccionar hora
  const handleSelectTime = async (time) => {
    try {
      setCheckingTime(true)
      setBookingError('')
      const isStillAvailable = await checkRealTimeAvailability(time)

      if (!isStillAvailable) {
        setBookingError('Este horario ya no está disponible. Selecciona otro.')
        return
      }

      setSelectedTime(time)
      // En modo "cualquier barbero", mostrar info de barberos antes de avanzar
      // En modo barbero específico, avanzar directamente a confirmación
      if (!isAnyBarberMode) {
        handleNextStep()
      }
    } catch (error) {
      console.error('Error verificando disponibilidad:', error)
      setBookingError('Error al verificar disponibilidad')
    } finally {
      setCheckingTime(false)
    }
  }

  // Obtener barberos disponibles para un horario (modo "cualquier barbero")
  const getAvailableBarbersForTime = (time) => {
    if (!isAnyBarberMode || !time || !allSlots.length) return []
    const slot = allSlots.find(s => s.time === time)
    return slot?.availableBarbers || []
  }

  // Función para confirmar la reserva
  const handleConfirmBooking = async () => {
    try {
      setSubmitting(true)
      setBookingError('')

      const serviceIds = selectedServices.map(s => s._id || s.id)

      const bookingData = {
        serviceIds,
        serviceId: serviceIds[0], // Compatibilidad con backend
        clientName: clientData.name,
        clientEmail: clientData.email,
        clientPhone: clientData.phone,
        date: selectedDate,
        time: selectedTime,
        notes: clientData.notes,
        ...(selectedBarber && { barberId: selectedBarber._id || selectedBarber.id })
      }

      const data = await cachedRequest(`/public/salon/${username}/book`, {}, null, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(bookingData)
      })

      if (data.success) {
        const barberInfo = data.barber ? ` Tu barbero asignado: ${data.barber.name}.` : ''
        setSuccessMessage(`¡Reserva confirmada!${barberInfo} Te hemos enviado un correo con los detalles.`)
        setTimeout(() => {
          router.push(`/${username}`)
        }, 3000)
      } else {
        setBookingError(data.message || 'Error al crear la reserva')
      }
    } catch (error) {
      console.error('Error creando reserva:', error)
      setBookingError(error.message || 'Error interno del servidor')
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

  const steps = hasBarbers
    ? [
        { num: 1, label: 'Servicio', short: 'Servicio' },
        { num: 2, label: 'Barbero', short: 'Barbero' },
        { num: 3, label: 'Fecha', short: 'Fecha' },
        { num: 4, label: 'Hora', short: 'Hora' },
        { num: 5, label: 'Confirmar', short: 'Datos' }
      ]
    : [
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
        {(error || bookingError) && (
          <div
            className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6 flex items-start gap-3"
            role="alert"
          >
            <span className="text-red-500 text-lg shrink-0">⚠</span>
            <p className="text-red-800 text-sm">{bookingError || error}</p>
          </div>
        )}

        {/* Resumen flotante - siempre visible cuando hay selección */}
        {(selectedServices.length > 0 || selectedDate || selectedTime) && currentStep > 1 && (
          <div
            className="bg-white rounded-xl border border-slate-200 p-4 mb-6 shadow-sm"
            aria-label="Resumen de tu selección"
          >
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-2">Tu selección</p>
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
              {selectedServices.length > 0 && (
                <span className="text-slate-700">
                  <strong>{selectedServices.map(s => s.name).join(' + ')}</strong> · {formatPrice(totalPrice)}
                  {selectedServices.length > 1 && (
                    <span className="text-slate-400 ml-1">({totalDuration} min total)</span>
                  )}
                </span>
              )}
              {selectedBarber && (
                <span className="text-slate-600">
                  ✂️ {isAnyBarberMode ? 'Cualquier barbero' : selectedBarber.name}
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

        {/* Paso 1: Seleccionar Servicio(s) */}
        {currentStep === STEPS.SERVICE && (
          <section
            className="bg-white rounded-2xl shadow-sm border border-slate-200/60 p-6 sm:p-8"
            aria-labelledby="step1-title"
          >
            <h2 id="step1-title" className="text-lg font-semibold text-slate-900 mb-1">
              ¿Qué servicio(s) deseas?
            </h2>
            <p className="text-slate-500 text-sm mb-6">Puedes seleccionar uno o varios servicios para la misma cita</p>
            
            <div className="grid gap-3 sm:grid-cols-2">
              {salon?.services?.map((service) => {
                const sid = service._id || service.id
                const isSelected = selectedServices.some(s => (s._id || s.id) === sid)
                return (
                  <button
                    key={sid}
                    type="button"
                    onClick={() => handleToggleService(service)}
                    className={`text-left rounded-xl p-4 sm:p-5 border-2 transition-all focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 ${
                      isSelected
                        ? 'border-emerald-500 bg-emerald-50/50 shadow-sm'
                        : 'border-slate-200 hover:border-slate-300 bg-white hover:bg-slate-50/50'
                    }`}
                    aria-pressed={isSelected}
                    aria-label={`${isSelected ? 'Quitar' : 'Agregar'} ${service.name}, ${formatPrice(service.price)}`}
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

            {/* Resumen de selección y botón continuar */}
            {selectedServices.length > 0 && (
              <div className="mt-6 p-4 bg-emerald-50 border border-emerald-200 rounded-xl">
                <div className="flex flex-wrap gap-2 mb-3">
                  {selectedServices.map(s => (
                    <span
                      key={s._id || s.id}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white rounded-lg border border-emerald-200 text-sm font-medium text-slate-700 shadow-sm"
                    >
                      {s.name}
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); handleToggleService(s) }}
                        className="text-slate-400 hover:text-red-500 ml-1"
                        aria-label={`Quitar ${s.name}`}
                      >
                        ✕
                      </button>
                    </span>
                  ))}
                </div>
                <div className="flex items-center justify-between text-sm mb-3">
                  <span className="text-slate-600">
                    {selectedServices.length} servicio{selectedServices.length > 1 ? 's' : ''} · {totalDuration} min
                  </span>
                  <span className="font-bold text-emerald-700 text-base">{formatPrice(totalPrice)}</span>
                </div>
                <button
                  type="button"
                  onClick={handleConfirmServices}
                  className="w-full sm:w-auto px-6 py-3 bg-emerald-600 text-white font-semibold rounded-xl hover:bg-emerald-700 transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2"
                >
                  Continuar →
                </button>
              </div>
            )}
          </section>
        )}

        {/* Paso Barbero: Seleccionar Barbero (solo si hay barberos) */}
        {currentStep === STEPS.BARBER && hasBarbers && (
          <section
            className="bg-white rounded-2xl shadow-sm border border-slate-200/60 p-6 sm:p-8"
            aria-labelledby="step-barber-title"
          >
            <h2 id="step-barber-title" className="text-lg font-semibold text-slate-900 mb-1">
              ¿Con quién prefieres?
            </h2>
            <p className="text-slate-500 text-sm mb-6">Elige tu barbero preferido o déjanos asignarte al primero disponible</p>

            <div className="grid gap-3 sm:grid-cols-2">
              {/* Opción: Cualquier barbero disponible */}
              <button
                type="button"
                onClick={() => handleSelectBarber({ id: 'any', _id: 'any', name: 'Cualquier barbero disponible' })}
                className={`text-left rounded-xl p-4 sm:p-5 border-2 transition-all focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 sm:col-span-2 ${
                  selectedBarber?.id === 'any'
                    ? 'border-emerald-500 bg-emerald-50/50 shadow-sm'
                    : 'border-slate-200 hover:border-slate-300 bg-white hover:bg-slate-50/50'
                }`}
                aria-pressed={selectedBarber?.id === 'any'}
                aria-label="Cualquier barbero disponible"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center text-xl shrink-0">
                    🎲
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-slate-900">Cualquier barbero disponible</h3>
                    <p className="text-slate-500 text-sm">Te asignamos al barbero con más disponibilidad</p>
                  </div>
                  {selectedBarber?.id === 'any' && (
                    <span className="text-emerald-600 text-sm font-medium shrink-0">✓</span>
                  )}
                </div>
              </button>

              {salon.barbers.map((barber) => {
                const isSelected = (selectedBarber?._id || selectedBarber?.id) === (barber._id || barber.id)
                return (
                  <button
                    key={barber.id}
                    type="button"
                    onClick={() => handleSelectBarber(barber)}
                    className={`text-left rounded-xl p-4 sm:p-5 border-2 transition-all focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 ${
                      isSelected
                        ? 'border-emerald-500 bg-emerald-50/50 shadow-sm'
                        : 'border-slate-200 hover:border-slate-300 bg-white hover:bg-slate-50/50'
                    }`}
                    aria-pressed={isSelected}
                    aria-label={`Seleccionar barbero ${barber.name}`}
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center text-xl shrink-0">
                        {barber.avatar ? (
                          <img src={barber.avatar} alt={barber.name} className="w-full h-full rounded-full object-cover" />
                        ) : (
                          '✂️'
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-slate-900">{barber.name}</h3>
                        {barber.specialty && (
                          <p className="text-slate-500 text-sm truncate">{barber.specialty}</p>
                        )}
                      </div>
                      {isSelected && (
                        <span className="text-emerald-600 text-sm font-medium shrink-0">✓</span>
                      )}
                    </div>
                  </button>
                )
              })}
            </div>

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

        {/* Paso Fecha: Seleccionar Fecha */}
        {currentStep === STEPS.DATE && (
          <section
            className="bg-white rounded-2xl shadow-sm border border-slate-200/60 p-6 sm:p-8"
            aria-labelledby="step2-title"
          >
            <h2 id="step2-title" className="text-lg font-semibold text-slate-900 mb-1">
              ¿Cuándo prefieres?
            </h2>
            <p className="text-slate-500 text-sm mb-6">
              {selectedServices.map(s => s.name).join(' + ')} · {formatPrice(totalPrice)}
              {selectedServices.length > 1 && (
                <span className="text-slate-400"> · {totalDuration} min total</span>
              )}
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
                          setBookingError('')
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

        {/* Paso Hora: Seleccionar Hora */}
        {currentStep === STEPS.TIME && (
          <section
            className="bg-white rounded-2xl shadow-sm border border-slate-200/60 p-6 sm:p-8"
            aria-labelledby="step3-title"
          >
            <h2 id="step3-title" className="text-lg font-semibold text-slate-900 mb-1">
              ¿A qué hora?
            </h2>
            <p className="text-slate-500 text-sm mb-2">
              {formatDate(selectedDate)}
              {selectedBarber && !isAnyBarberMode && (
                <span className="text-slate-600"> · ✂️ {selectedBarber.name}</span>
              )}
              {isAnyBarberMode && (
                <span className="text-emerald-600 font-medium"> · Cualquier barbero disponible</span>
              )}
            </p>

            {primaryService?.showDuration !== false && totalDuration > 0 && (
              <p className="text-xs text-slate-400 mb-5">
                Cada bloque reserva {totalDuration} min{selectedServices.length > 1 ? ` (${selectedServices.map(s => s.name).join(' + ')})` : ''}
              </p>
            )}

            {bookingError && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-3 mb-4 flex items-start gap-2" role="alert">
                <span className="text-red-500 shrink-0">⚠</span>
                <p className="text-red-800 text-sm">{bookingError}</p>
              </div>
            )}

            {loadingSlots ? (
              <div className="py-12 flex flex-col items-center justify-center">
                <div className="w-10 h-10 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin" />
                <p className="mt-3 text-slate-500 text-sm">Buscando horarios disponibles...</p>
              </div>
            ) : allSlots.length > 0 ? (
              <>
                {isAnyBarberMode && (
                  <p className="text-xs text-slate-500 mb-3 flex items-center gap-1.5">
                    <span className="inline-block w-2 h-2 rounded-full bg-emerald-400"></span>
                    El número en cada horario indica cuántos barberos están libres
                  </p>
                )}
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
                  {allSlots.map((slot) => {
                    const [hour, min] = slot.time.split(':').map(Number)
                    const startMinutes = hour * 60 + min
                    const endMinutes = startMinutes + totalDuration
                    const endHour = Math.floor(endMinutes / 60)
                    const endMin = endMinutes % 60
                    const endTime = `${endHour.toString().padStart(2, '0')}:${endMin.toString().padStart(2, '0')}`
                    const showEndTime = primaryService?.showDuration !== false && totalDuration > 0
                    const isSelected = selectedTime === slot.time
                    const barberCount = slot.availableBarbers?.length || 0
                    return (
                      <button
                        key={slot.time}
                        type="button"
                        onClick={() => slot.available && !checkingTime && handleSelectTime(slot.time)}
                        disabled={!slot.available || checkingTime}
                        className={`
                          p-3 sm:p-4 rounded-xl text-center transition-all focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2
                          ${isSelected
                            ? 'border-2 border-emerald-500 bg-emerald-50 ring-2 ring-emerald-200 shadow-sm'
                            : slot.available
                              ? 'bg-white border-2 border-slate-200 hover:border-emerald-400 hover:bg-emerald-50/30 cursor-pointer'
                              : 'bg-slate-50 border-2 border-slate-100 text-slate-400 cursor-not-allowed'
                          }
                        `}
                        title={slot.available ? `Reservar a las ${formatTime12h(slot.time)}` : slot.reason}
                        aria-label={slot.available ? `Horario disponible: ${formatTime12h(slot.time)}` : `No disponible: ${slot.reason}`}
                      >
                        <span className={`block font-semibold text-base ${isSelected ? 'text-emerald-700' : slot.available ? 'text-slate-900' : 'text-slate-400'}`}>
                          {formatTime12h(slot.time)}
                        </span>
                        {showEndTime && (
                          <span className="block text-xs text-slate-500 mt-0.5">
                            hasta {formatTime12h(endTime)}
                          </span>
                        )}
                        {isAnyBarberMode && slot.available && (
                          <span className={`block text-xs mt-1 font-medium ${isSelected ? 'text-emerald-600' : 'text-slate-400'}`}>
                            ✂️ {barberCount}/{slot.totalBarbers}
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

                {/* Panel informativo: barberos disponibles (solo modo "cualquier barbero") */}
                {isAnyBarberMode && selectedTime && (
                  <div className="mt-6 p-5 bg-emerald-50 border border-emerald-200 rounded-xl">
                    <div className="flex items-center gap-3 mb-3">
                      <span className="w-9 h-9 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 font-bold">✓</span>
                      <div>
                        <h3 className="font-semibold text-slate-900">
                          {formatTime12h(selectedTime)}
                        </h3>
                        <p className="text-xs text-slate-500">{formatDate(selectedDate)}</p>
                      </div>
                    </div>

                    <p className="text-sm font-medium text-slate-700 mb-2">
                      Barberos disponibles a esta hora:
                    </p>
                    <div className="flex flex-wrap gap-2 mb-4">
                      {getAvailableBarbersForTime(selectedTime).map(barber => (
                        <span
                          key={barber.id}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white rounded-lg border border-emerald-200 text-sm font-medium text-slate-700 shadow-sm"
                        >
                          ✂️ {barber.name}
                        </span>
                      ))}
                    </div>

                    <p className="text-xs text-slate-500 mb-4">
                      Se te asignará automáticamente al barbero con mayor disponibilidad.
                    </p>

                    <button
                      type="button"
                      onClick={() => setCurrentStep(STEPS.CONFIRM)}
                      className="w-full sm:w-auto px-6 py-3 bg-emerald-600 text-white font-semibold rounded-xl hover:bg-emerald-700 transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2"
                    >
                      Continuar →
                    </button>
                  </div>
                )}

                {checkingTime && (
                  <div className="mt-4 flex items-center gap-2 text-slate-500 text-sm">
                    <div className="w-4 h-4 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin" />
                    Verificando disponibilidad...
                  </div>
                )}
              </>
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

        {/* Paso Confirmar: Datos del Cliente */}
        {currentStep === STEPS.CONFIRM && (
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
              <div className="space-y-1 text-sm text-slate-700">
                {selectedServices.length > 1 ? (
                  <>
                    <p className="font-medium text-slate-900 mb-2">Servicios seleccionados:</p>
                    {selectedServices.map((s, i) => (
                      <div key={s._id || s.id} className="flex justify-between">
                        <span>{s.name}</span>
                        <span className="text-slate-500">{formatPrice(s.price)} · {s.duration} min</span>
                      </div>
                    ))}
                    <div className="flex justify-between pt-2 mt-2 border-t border-slate-200 font-bold">
                      <span>Total</span>
                      <span>{formatPrice(totalPrice)} · {totalDuration} min</span>
                    </div>
                  </>
                ) : (
                  <span><strong>{selectedServices[0]?.name}</strong> · {formatPrice(totalPrice)}</span>
                )}
                <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2">
                  {selectedBarber && (
                    <span>✂️ {isAnyBarberMode ? 'Asignación automática' : selectedBarber.name}</span>
                  )}
                  <span>📅 {formatDate(selectedDate)}</span>
                  <span>🕐 {formatTime12h(selectedTime)}</span>
                </div>
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
                    <li>El precio completo ({formatPrice(totalPrice)}) se paga al llegar</li>
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