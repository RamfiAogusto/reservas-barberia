'use client'

import { useState, useEffect, useMemo, useRef, Fragment } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { useSalonDataOptimized } from '@/utils/SalonContext'
import { useDaysStatus, useAvailableSlots } from '@/utils/useSalonData'
import { cachedRequest, invalidateCache } from '@/utils/cache'
import { formatTime12h } from '@/utils/formatTime'
import { toast } from 'sonner'
import {
  Ban, Palmtree, PartyPopper, CalendarOff, XCircle, Clock, CheckCircle2,
  Scissors, Calendar, Shuffle, AlertCircle, Timer, MapPin
} from 'lucide-react'

// Mensajes de error del backend que indican que el horario ya fue tomado
// por otro cliente (condición de carrera TOCTOU) — ver backend/routes/public.js
const SLOT_CONFLICT_MESSAGES = [
  'ya no está disponible',
  'no hay barberos disponibles',
]
const isSlotConflictError = (message) => {
  if (!message) return false
  const normalized = message.toLowerCase()
  return SLOT_CONFLICT_MESSAGES.some((fragment) => normalized.includes(fragment))
}

const BookingPage = () => {
  const params = useParams()
  const router = useRouter()
  const searchParams = useSearchParams()
  const username = params.usuario

  // Estados principales
  const [currentStep, setCurrentStep] = useState(1)
  const [submitting, setSubmitting] = useState(false)
  const [bookingError, setBookingError] = useState('')
  const [checkingTime, setCheckingTime] = useState(false)
  // Confirmación persistente tras reservar (null = wizard activo)
  const [confirmation, setConfirmation] = useState(null)

  // Foco accesible: al cambiar de paso movemos el foco al título del paso
  const stepHeadingRef = useRef(null)
  const prevStepRef = useRef(currentStep)

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
    setAllSlots,
    refetch: refetchSlots
  } = useAvailableSlots(username, selectedDate, primaryService, selectedBarber?.id || null, selectedServices.length > 1 ? totalDuration : null)

  // Helper: marca un horario como no disponible localmente, invalida la
  // caché de disponibilidad y vuelve a pedir los slots frescos al backend.
  // Se usa cuando una verificación en tiempo real o el envío final detectan
  // que el horario fue tomado por otro cliente (condición de carrera TOCTOU).
  const markSlotTakenAndRefresh = (time) => {
    setAllSlots(prev => prev.map(slot => (
      slot.time === time ? { ...slot, available: false, reason: 'Este horario acaba de ocuparse' } : slot
    )))
    setAvailableSlots(prev => prev.filter(t => t !== time))

    const cacheParams = { date: selectedDate, serviceId: primaryService?._id || primaryService?.id }
    if (selectedBarber?.id) cacheParams.barberId = selectedBarber.id
    if (selectedServices.length > 1 && totalDuration > 0) cacheParams.totalDuration = totalDuration
    invalidateCache(`/public/salon/${username}/availability/advanced`, cacheParams)
    refetchSlots()
  }

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

  // Mover el foco al título del paso al navegar el wizard (a11y)
  useEffect(() => {
    if (prevStepRef.current !== currentStep) {
      prevStepRef.current = currentStep
      stepHeadingRef.current?.focus()
    }
  }, [currentStep])

  // Al mostrar la confirmación, enfocar su título y subir al inicio
  useEffect(() => {
    if (confirmation) {
      window.scrollTo({ top: 0 })
      stepHeadingRef.current?.focus()
    }
  }, [confirmation])

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
        setCurrentStep(STEPS.TIME)
        markSlotTakenAndRefresh(time)
        setBookingError('Ese horario acaba de ocuparse — elige otro')
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
      setBookingError('No se pudo verificar la disponibilidad. Intenta de nuevo.')
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
        const mode = data.data?.bookingMode || 'LIBRE'

        if (mode === 'PREPAGO' && data.data?.paymentUrl) {
          // Redirigir al pago inmediatamente
          toast.success('Redirigiendo al pago...')
          window.location.href = data.data.paymentUrl
          return
        } else if (mode === 'PREPAGO' && data.data?.paymentToken) {
          toast.success('¡Reserva creada! Completa el pago para asegurar tu cita.')
          setTimeout(() => {
            router.push(`/pay/${data.data.paymentToken}`)
          }, 2000)
          return
        }

        // LIBRE y PAGO_POST_APROBACION: pantalla de confirmación persistente
        // (sin redirección automática — el cliente decide cuándo volver)
        setConfirmation({
          mode,
          barberName: data.data?.barber?.name || null,
        })
      } else if (isSlotConflictError(data.message)) {
        const takenTime = selectedTime
        setSelectedTime('')
        setCurrentStep(STEPS.TIME)
        if (takenTime) markSlotTakenAndRefresh(takenTime)
        setBookingError('Ese horario acaba de ocuparse — elige otro')
      } else {
        setBookingError(data.message || 'No se pudo completar la reserva. Intenta de nuevo.')
      }
    } catch (error) {
      console.error('Error creando reserva:', error)
      if (isSlotConflictError(error.message)) {
        const takenTime = selectedTime
        setSelectedTime('')
        setCurrentStep(STEPS.TIME)
        if (takenTime) markSlotTakenAndRefresh(takenTime)
        setBookingError('Ese horario acaba de ocuparse — elige otro')
      } else {
        setBookingError('No se pudo completar la reserva. Intenta de nuevo.')
      }
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

  // Función para obtener el icono según el tipo de día (lucide)
  const getDayIcon = (dayInfo) => {
    if (!dayInfo.available) {
      switch (dayInfo.type) {
        case 'closed': return Ban
        case 'vacation': return Palmtree
        case 'holiday': return PartyPopper
        case 'day_off': return CalendarOff
        default: return XCircle
      }
    }

    if (dayInfo.type === 'special_hours') {
      return Clock
    }

    return CheckCircle2
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
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-2 border-primary-600 border-t-transparent mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Cargando...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center">
        <div className="text-center max-w-md px-4">
          <Ban className="w-14 h-14 text-stone-400 dark:text-gray-500 mx-auto mb-4" aria-hidden="true" />
          <h1 className="text-2xl font-bold text-gray-800 dark:text-white mb-2">Salón no encontrado</h1>
          <p className="text-gray-600 dark:text-gray-400 mb-6">{error}</p>
          <Link
            href="/"
            className="inline-block bg-primary-600 text-white px-6 py-2 rounded-lg hover:bg-primary-700 transition-colors active:scale-[0.98]"
          >
            Volver al inicio
          </Link>
        </div>
      </div>
    )
  }

  // Pantalla de confirmación persistente (P2-2): sin redirección automática
  if (confirmation) {
    const isApproval = confirmation.mode === 'PAGO_POST_APROBACION'
    const confirmedBarber = confirmation.barberName
      || (selectedBarber && !isAnyBarberMode ? selectedBarber.name : null)

    return (
      <div className="min-h-screen bg-slate-50 dark:bg-gray-950">
        <div className="max-w-2xl mx-auto px-4 py-10 sm:py-16">
          <section
            role="status"
            aria-live="polite"
            className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-slate-200 dark:border-gray-700 p-6 sm:p-8"
          >
            <div className="w-14 h-14 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="w-7 h-7 text-primary-700 dark:text-primary-400" aria-hidden="true" />
            </div>
            <h1
              ref={stepHeadingRef}
              tabIndex={-1}
              className="text-2xl font-bold text-slate-900 dark:text-white text-center focus:outline-none"
            >
              {isApproval ? 'Solicitud enviada' : 'Reserva enviada'}
            </h1>
            <p className="text-slate-500 dark:text-gray-400 text-center mt-2 mb-8">
              {isApproval
                ? 'El salón revisará tu solicitud. Cuando sea aprobada recibirás un enlace de pago por correo.'
                : 'Te enviamos un correo con los detalles. El salón confirmará tu cita.'}
            </p>

            {/* Resumen completo de la cita */}
            <div className="bg-slate-50 dark:bg-gray-900 rounded-xl border border-slate-100 dark:border-gray-700 p-5 mb-6">
              <h2 className="text-sm font-medium text-slate-500 dark:text-gray-400 uppercase tracking-wide mb-4">
                Resumen de tu cita
              </h2>
              <dl className="space-y-3 text-sm">
                <div className="flex items-start gap-3">
                  <Calendar className="w-4 h-4 mt-0.5 text-slate-400 dark:text-gray-500 shrink-0" aria-hidden="true" />
                  <div>
                    <dt className="sr-only">Fecha y hora</dt>
                    <dd className="text-slate-900 dark:text-white font-medium capitalize">{formatDate(selectedDate)}</dd>
                    <dd className="text-slate-600 dark:text-gray-400">{formatTime12h(selectedTime)}</dd>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Scissors className="w-4 h-4 mt-0.5 text-slate-400 dark:text-gray-500 shrink-0" aria-hidden="true" />
                  <div className="flex-1">
                    <dt className="sr-only">Servicios</dt>
                    {selectedServices.map((s) => (
                      <dd key={s._id || s.id} className="flex justify-between gap-4 text-slate-900 dark:text-white">
                        <span>{s.name}</span>
                        <span className="text-slate-600 dark:text-gray-400">{formatPrice(s.price)}</span>
                      </dd>
                    ))}
                    <dd className="flex justify-between gap-4 pt-2 mt-2 border-t border-slate-200 dark:border-gray-700 font-semibold text-slate-900 dark:text-white">
                      <span>Total{totalDuration > 0 ? ` · ${totalDuration} min` : ''}</span>
                      <span>{formatPrice(totalPrice)}</span>
                    </dd>
                    {confirmedBarber && (
                      <dd className="text-slate-600 dark:text-gray-400 mt-1.5">Con {confirmedBarber}</dd>
                    )}
                  </div>
                </div>
                {salon?.address && (
                  <div className="flex items-start gap-3">
                    <MapPin className="w-4 h-4 mt-0.5 text-slate-400 dark:text-gray-500 shrink-0" aria-hidden="true" />
                    <div>
                      <dt className="sr-only">Dirección del salón</dt>
                      <dd className="text-slate-900 dark:text-white">{salon.salonName}</dd>
                      <dd className="text-slate-600 dark:text-gray-400">{salon.address}</dd>
                    </div>
                  </div>
                )}
              </dl>
            </div>

            {/* Recordatorio de depósito y cancelación */}
            {salon?.requiresDeposit && salon?.depositAmount > 0 && (
              <div className="bg-amber-50 dark:bg-amber-950/20 rounded-xl border border-amber-100 dark:border-amber-800 p-4 mb-6 text-sm text-amber-900 dark:text-amber-300">
                <p className="font-medium mb-1">
                  Depósito de {formatPrice(salon.depositAmount)}
                  {isApproval ? ' — se cobra cuando el salón apruebe tu solicitud.' : ' para asegurar tu horario.'}
                </p>
                <ul className="list-disc list-inside space-y-0.5 text-amber-800 dark:text-amber-400">
                  <li>El depósito no es reembolsable si no asistes</li>
                  <li>Cancela o reprograma con al menos 24 h de anticipación</li>
                  <li>El precio del servicio se paga al llegar</li>
                </ul>
              </div>
            )}

            <p className="text-xs text-slate-500 dark:text-gray-400 text-center mb-6">
              Guarda esta información o consulta el correo que te enviamos.
            </p>

            <Link
              href={`/${username}`}
              className="block w-full text-center px-6 py-3 bg-primary-600 text-white font-semibold rounded-xl hover:bg-primary-700 transition-[background-color,transform] duration-150 active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 dark:ring-offset-gray-800"
            >
              Volver al perfil del salón
            </Link>
          </section>
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

  // Acción primaria del paso actual para la barra fija móvil (P2-3).
  // En los pasos barbero/fecha/hora la selección avanza sola, así que la
  // barra solo muestra el total; en servicio/confirmar lleva el CTA.
  const confirmLabel = salon?.bookingMode === 'PREPAGO'
    ? 'Reservar y pagar depósito'
    : salon?.bookingMode === 'PAGO_POST_APROBACION'
      ? 'Enviar solicitud'
      : 'Confirmar reserva'

  let stickyAction = null
  if (currentStep === STEPS.SERVICE) {
    stickyAction = { label: 'Continuar', onClick: handleConfirmServices, disabled: selectedServices.length === 0 }
  } else if (currentStep === STEPS.TIME && isAnyBarberMode && selectedTime) {
    stickyAction = { label: 'Continuar', onClick: () => setCurrentStep(STEPS.CONFIRM), disabled: false }
  } else if (currentStep === STEPS.CONFIRM) {
    stickyAction = { label: submitting ? 'Procesando...' : confirmLabel, submit: true, disabled: submitting }
  }

  const showStickyBar = selectedServices.length > 0

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-gray-950">
      {/* Header limpio */}
      <header className="bg-white dark:bg-gray-900 border-b border-slate-200 dark:border-gray-700 sticky top-0 z-40">
        <div className="max-w-3xl mx-auto px-4 py-4">
          <Link
            href={`/${username}`}
            className="inline-flex items-center gap-2 text-slate-600 dark:text-gray-400 hover:text-slate-900 dark:hover:text-white text-sm mb-4 transition-colors"
            aria-label="Volver al perfil del salón"
          >
            <span aria-hidden>←</span> {salon?.salonName}
          </Link>
          <h1 className="text-xl font-semibold text-slate-900 dark:text-white">Reservar cita</h1>

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
                        ? 'bg-primary-600 text-white ring-4 ring-primary-100 dark:ring-primary-900'
                        : step.num < currentStep
                          ? 'bg-primary-600 text-white'
                          : 'bg-slate-200 dark:bg-gray-700 text-slate-500 dark:text-gray-400'
                    }`}
                  >
                    {step.num < currentStep ? '✓' : step.num}
                  </div>
                  <span className={`mt-1.5 text-xs font-medium truncate w-full text-center hidden sm:block ${
                    step.num === currentStep ? 'text-primary-700 dark:text-primary-400' : step.num < currentStep ? 'text-slate-600 dark:text-gray-400' : 'text-slate-400 dark:text-gray-500'
                  }`}>
                    {step.label}
                  </span>
                </li>
              ))}
            </ol>
          </nav>
        </div>
      </header>

      {/* pb extra en móvil para que la barra fija no tape el contenido */}
      <div className="max-w-3xl mx-auto px-4 pt-8 pb-32 md:pb-8">
        {(error || bookingError) && (
          <div
            className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-xl p-4 mb-6 flex items-start gap-3"
            role="alert"
          >
            <AlertCircle className="w-5 h-5 text-red-500 shrink-0" aria-hidden="true" />
            <p className="text-red-800 dark:text-red-400 text-sm">{bookingError || error}</p>
          </div>
        )}

        {/* Resumen flotante - siempre visible cuando hay selección */}
        {(selectedServices.length > 0 || selectedDate || selectedTime) && currentStep > 1 && (
          <div
            className="bg-white dark:bg-gray-800 rounded-xl border border-slate-200 dark:border-gray-700 p-4 mb-6 shadow-sm"
            aria-label="Resumen de tu selección"
          >
            <p className="text-xs font-medium text-slate-500 dark:text-gray-400 uppercase tracking-wide mb-2">Tu selección</p>
            <div className="flex flex-wrap gap-x-2 gap-y-1 text-sm -mx-2">
              {selectedServices.length > 0 && (
                <button
                  type="button"
                  onClick={() => setCurrentStep(STEPS.SERVICE)}
                  className="text-left text-slate-700 dark:text-gray-300 rounded-lg px-2 py-1 hover:bg-slate-100 dark:hover:bg-gray-700 transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-ring"
                  aria-label={`Cambiar servicios: ${selectedServices.map(s => s.name).join(' + ')}`}
                >
                  <strong>{selectedServices.map(s => s.name).join(' + ')}</strong> · {formatPrice(totalPrice)}
                  {selectedServices.length > 1 && (
                    <span className="text-slate-400 dark:text-gray-500 ml-1">({totalDuration} min total)</span>
                  )}
                </button>
              )}
              {selectedBarber && hasBarbers && (
                <button
                  type="button"
                  onClick={() => setCurrentStep(STEPS.BARBER)}
                  className="inline-flex items-center gap-1.5 text-slate-600 dark:text-gray-400 rounded-lg px-2 py-1 hover:bg-slate-100 dark:hover:bg-gray-700 transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-ring"
                  aria-label={`Cambiar barbero: ${isAnyBarberMode ? 'Cualquier barbero' : selectedBarber.name}`}
                >
                  <Scissors className="w-3.5 h-3.5" aria-hidden="true" />
                  {isAnyBarberMode ? 'Cualquier barbero' : selectedBarber.name}
                </button>
              )}
              {selectedDate && (
                <button
                  type="button"
                  onClick={() => setCurrentStep(STEPS.DATE)}
                  className="inline-flex items-center gap-1.5 text-slate-600 dark:text-gray-400 rounded-lg px-2 py-1 hover:bg-slate-100 dark:hover:bg-gray-700 transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-ring"
                  aria-label={`Cambiar fecha: ${formatDate(selectedDate)}`}
                >
                  <Calendar className="w-3.5 h-3.5" aria-hidden="true" />
                  {formatDate(selectedDate)}
                </button>
              )}
              {selectedTime && (
                <button
                  type="button"
                  onClick={() => setCurrentStep(STEPS.TIME)}
                  className="inline-flex items-center gap-1.5 text-slate-600 dark:text-gray-400 rounded-lg px-2 py-1 hover:bg-slate-100 dark:hover:bg-gray-700 transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-ring"
                  aria-label={`Cambiar hora: ${formatTime12h(selectedTime)}`}
                >
                  <Clock className="w-3.5 h-3.5" aria-hidden="true" />
                  {formatTime12h(selectedTime)}
                </button>
              )}
            </div>
            <p className="mt-2 text-xs text-slate-400 dark:text-gray-500">
              Toca cualquier dato para cambiarlo
            </p>
          </div>
        )}

        {/* Paso 1: Seleccionar Servicio(s) */}
        {currentStep === STEPS.SERVICE && (
          <section
            className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-slate-200 dark:border-gray-700 p-6 sm:p-8"
            aria-labelledby="step1-title"
          >
            <h2 id="step1-title" ref={stepHeadingRef} tabIndex={-1} className="text-lg font-semibold text-slate-900 dark:text-white mb-1 focus:outline-none">
              ¿Qué servicios deseas?
            </h2>
            <p className="text-slate-500 dark:text-gray-400 text-sm mb-6">Puedes seleccionar uno o varios servicios para la misma cita</p>
            
            <div className="grid gap-3 sm:grid-cols-2">
              {salon?.services?.map((service) => {
                const sid = service._id || service.id
                const isSelected = selectedServices.some(s => (s._id || s.id) === sid)
                return (
                  <button
                    key={sid}
                    type="button"
                    onClick={() => handleToggleService(service)}
                    className={`text-left rounded-xl p-4 sm:p-5 border-2 transition-[background-color,border-color,color,box-shadow] duration-150 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 dark:ring-offset-gray-800 ${
                      isSelected
                        ? 'border-primary-500 bg-primary-50 dark:bg-primary-950/20 shadow-sm'
                        : 'border-slate-200 dark:border-gray-700 hover:border-slate-300 dark:hover:border-gray-500 bg-white dark:bg-gray-800 hover:bg-slate-50 dark:hover:bg-gray-700/50'
                    }`}
                    aria-pressed={isSelected}
                    aria-label={`${isSelected ? 'Quitar' : 'Agregar'} ${service.name}, ${formatPrice(service.price)}`}
                  >
                    <div className="flex justify-between items-start gap-3">
                      <h3 className="font-semibold text-slate-900 dark:text-white">{service.name}</h3>
                      <span className={`font-bold shrink-0 ${isSelected ? 'text-primary-700 dark:text-primary-400' : 'text-slate-700 dark:text-gray-300'}`}>
                        {formatPrice(service.price)}
                      </span>
                    </div>
                    {service.description && (
                      <p className="text-slate-500 dark:text-gray-400 text-sm mt-1 line-clamp-2">{service.description}</p>
                    )}
                    <div className="flex items-center justify-between mt-3 text-xs text-slate-400 dark:text-gray-500">
                      {service.showDuration !== false && (
                        <span className="inline-flex items-center gap-1">
                          <Timer className="w-3.5 h-3.5" aria-hidden="true" /> {service.duration} min
                        </span>
                      )}
                      <span className="bg-slate-100 dark:bg-gray-800 dark:bg-gray-700 text-slate-600 dark:text-gray-400 px-2 py-0.5 rounded-full capitalize">
                        {service.category}
                      </span>
                    </div>
                    {salon?.requiresDeposit && salon?.depositAmount > 0 && (
                      <p className="mt-2 text-xs text-amber-600">
                        Depósito: {formatPrice(salon.depositAmount)}
                        {salon?.bookingMode === 'PREPAGO' && ' (se cobra al reservar)'}
                        {salon?.bookingMode === 'PAGO_POST_APROBACION' && ' (se cobra al aprobar)'}
                      </p>
                    )}
                    {isSelected && (
                      <div className="mt-3 flex items-center gap-1.5 text-primary-700 dark:text-primary-400 text-sm font-medium">
                        <span>✓</span> Seleccionado
                      </div>
                    )}
                  </button>
                )
              })}
            </div>

            {/* Resumen de selección y botón continuar */}
            {selectedServices.length > 0 && (
              <div className="mt-6 p-4 bg-primary-50 dark:bg-primary-950/20 border border-primary-200 dark:border-primary-800 rounded-xl">
                <div className="flex flex-wrap gap-2 mb-3">
                  {selectedServices.map(s => (
                    <span
                      key={s._id || s.id}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-gray-800 rounded-lg border border-primary-200 dark:border-primary-800 text-sm font-medium text-slate-700 dark:text-gray-300 shadow-sm"
                    >
                      {s.name}
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); handleToggleService(s) }}
                        className="text-slate-400 dark:text-gray-500 hover:text-red-500 ml-1"
                        aria-label={`Quitar ${s.name}`}
                      >
                        ✕
                      </button>
                    </span>
                  ))}
                </div>
                <div className="flex items-center justify-between text-sm mb-3">
                  <span className="text-slate-600 dark:text-gray-400">
                    {selectedServices.length} servicio{selectedServices.length > 1 ? 's' : ''} · {totalDuration} min
                  </span>
                  <span className="font-bold text-primary-700 dark:text-primary-400 text-base">{formatPrice(totalPrice)}</span>
                </div>
                <button
                  type="button"
                  onClick={handleConfirmServices}
                  className="hidden md:inline-flex px-6 py-3 bg-primary-600 text-white font-semibold rounded-xl hover:bg-primary-700 transition-[background-color,transform] duration-150 active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
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
            className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-slate-200 dark:border-gray-700 p-6 sm:p-8"
            aria-labelledby="step-barber-title"
          >
            <h2 id="step-barber-title" ref={stepHeadingRef} tabIndex={-1} className="text-lg font-semibold text-slate-900 dark:text-white mb-1 focus:outline-none">
              ¿Con quién prefieres?
            </h2>
            <p className="text-slate-500 dark:text-gray-400 text-sm mb-6">Elige tu barbero preferido o déjanos asignarte al primero disponible</p>

            <div className="grid gap-3 sm:grid-cols-2">
              {/* Opción: Cualquier barbero disponible */}
              <button
                type="button"
                onClick={() => handleSelectBarber({ id: 'any', _id: 'any', name: 'Cualquier barbero disponible' })}
                className={`text-left rounded-xl p-4 sm:p-5 border-2 transition-[background-color,border-color,color,box-shadow] duration-150 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 dark:ring-offset-gray-800 sm:col-span-2 ${
                  selectedBarber?.id === 'any'
                    ? 'border-primary-500 bg-primary-50 dark:bg-primary-950/20 shadow-sm'
                    : 'border-slate-200 dark:border-gray-700 hover:border-slate-300 dark:hover:border-gray-500 bg-white dark:bg-gray-800 hover:bg-slate-50 dark:hover:bg-gray-700/50'
                }`}
                aria-pressed={selectedBarber?.id === 'any'}
                aria-label="Cualquier barbero disponible"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center text-primary-700 dark:text-primary-400 shrink-0">
                    <Shuffle className="w-5 h-5" aria-hidden="true" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-slate-900 dark:text-white">Cualquier barbero disponible</h3>
                    <p className="text-slate-500 dark:text-gray-400 text-sm">Te asignamos al barbero con más disponibilidad</p>
                  </div>
                  {selectedBarber?.id === 'any' && (
                    <span className="text-primary-700 dark:text-primary-400 text-sm font-medium shrink-0">✓</span>
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
                    className={`text-left rounded-xl p-4 sm:p-5 border-2 transition-[background-color,border-color,color,box-shadow] duration-150 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 dark:ring-offset-gray-800 ${
                      isSelected
                        ? 'border-primary-500 bg-primary-50 dark:bg-primary-950/20 shadow-sm'
                        : 'border-slate-200 dark:border-gray-700 hover:border-slate-300 dark:hover:border-gray-500 bg-white dark:bg-gray-800 hover:bg-slate-50 dark:hover:bg-gray-700/50'
                    }`}
                    aria-pressed={isSelected}
                    aria-label={`Seleccionar barbero ${barber.name}`}
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center text-xl shrink-0">
                        {barber.avatar ? (
                          <img src={barber.avatar} alt={barber.name} className="w-full h-full rounded-full object-cover" />
                        ) : (
                          <Scissors className="w-5 h-5 text-primary-700 dark:text-primary-400" aria-hidden="true" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-slate-900 dark:text-white">{barber.name}</h3>
                        {barber.specialty && (
                          <p className="text-slate-500 dark:text-gray-400 text-sm truncate">{barber.specialty}</p>
                        )}
                      </div>
                      {isSelected && (
                        <span className="text-primary-700 dark:text-primary-400 text-sm font-medium shrink-0">✓</span>
                      )}
                    </div>
                  </button>
                )
              })}
            </div>

            <div className="mt-8 pt-6 border-t border-slate-100 dark:border-gray-700">
              <button
                type="button"
                onClick={handlePreviousStep}
                className="text-slate-600 dark:text-gray-400 hover:text-slate-900 dark:hover:text-white text-sm font-medium flex items-center gap-2"
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
            className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-slate-200 dark:border-gray-700 p-6 sm:p-8"
            aria-labelledby="step2-title"
          >
            <h2 id="step2-title" ref={stepHeadingRef} tabIndex={-1} className="text-lg font-semibold text-slate-900 dark:text-white mb-1 focus:outline-none">
              ¿Cuándo prefieres?
            </h2>
            <p className="text-slate-500 dark:text-gray-400 text-sm mb-6">
              {selectedServices.map(s => s.name).join(' + ')} · {formatPrice(totalPrice)}
              {selectedServices.length > 1 && (
                <span className="text-slate-400 dark:text-gray-500"> · {totalDuration} min total</span>
              )}
            </p>

            {/* Leyenda compacta */}
            <details className="mb-6 group">
              <summary className="text-sm text-slate-500 dark:text-gray-400 cursor-pointer hover:text-slate-700 dark:hover:text-gray-300 list-none flex items-center gap-1">
                <span className="group-open:rotate-90 transition-transform">▸</span> Ver significado de los iconos
              </summary>
              <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500 dark:text-gray-400">
                <span className="inline-flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5" aria-hidden="true" /> Disponible</span>
                <span className="inline-flex items-center gap-1"><Clock className="w-3.5 h-3.5" aria-hidden="true" /> Horario especial</span>
                <span className="inline-flex items-center gap-1"><Ban className="w-3.5 h-3.5" aria-hidden="true" /> Cerrado</span>
                <span className="inline-flex items-center gap-1"><Palmtree className="w-3.5 h-3.5" aria-hidden="true" /> Vacaciones</span>
                <span className="inline-flex items-center gap-1"><PartyPopper className="w-3.5 h-3.5" aria-hidden="true" /> Festivo</span>
                <span className="inline-flex items-center gap-1"><CalendarOff className="w-3.5 h-3.5" aria-hidden="true" /> Día libre</span>
              </div>
            </details>

            {loadingDays ? (
              <div className="py-12 flex flex-col items-center justify-center">
                <div className="w-10 h-10 border-2 border-primary-600 border-t-transparent rounded-full animate-spin" />
                <p className="mt-3 text-slate-500 dark:text-gray-400 text-sm">Buscando días disponibles...</p>
              </div>
            ) : daysStatus.length > 0 ? (
              <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 gap-2">
                {getDisplayDates().map((date, idx, dates) => {
                  const dateString = getDateString(date)
                  const dayInfo = getDayStatus(dateString)
                  const isToday = getDateString(new Date()) === dateString
                  const isAvailable = dayInfo.available
                  // Marcador de inicio de mes: el grid de 30 días cruza meses
                  const isNewMonth = idx === 0 || date.getMonth() !== dates[idx - 1].getMonth()
                  return (
                    <Fragment key={dateString}>
                    {isNewMonth && (
                      <p className="col-span-full mt-2 first:mt-0 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-gray-400">
                        <span className="capitalize">{date.toLocaleDateString('es-ES', { month: 'long' })}</span> {date.getFullYear()}
                      </p>
                    )}
                    <button
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
                        relative p-3 rounded-xl text-center transition-[background-color,border-color,color,box-shadow] duration-150 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 dark:ring-offset-gray-800
                        ${isAvailable
                          ? 'bg-white dark:bg-gray-800 border-2 border-slate-200 dark:border-gray-700 hover:border-primary-400 hover:bg-primary-50 dark:hover:bg-primary-950/20 cursor-pointer'
                          : 'bg-slate-50 dark:bg-gray-900/50 border-2 border-slate-100 dark:border-gray-700 text-slate-400 dark:text-gray-500 cursor-not-allowed'
                        }
                        ${isToday && isAvailable ? 'ring-2 ring-primary-200 dark:ring-primary-800' : ''}
                      `}
                      title={isAvailable ? 'Seleccionar este día' : dayInfo.reason}
                      aria-label={isAvailable ? `${date.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })} - Disponible` : dayInfo.reason}
                    >
                      <span className="text-xs text-slate-400 dark:text-gray-500 block">{date.toLocaleDateString('es-ES', { weekday: 'short' })}</span>
                      <span className="text-lg font-semibold text-slate-900 dark:text-white block">{date.getDate()}</span>
                      <span className="text-xs text-slate-500 dark:text-gray-400 block">{date.toLocaleDateString('es-ES', { month: 'short' })}</span>
                      {!isAvailable && (() => {
                        const DayIcon = getDayIcon(dayInfo)
                        return (
                          <span className="absolute top-1 right-1 text-slate-400 dark:text-gray-500" aria-hidden="true">
                            <DayIcon className="w-3.5 h-3.5" />
                          </span>
                        )
                      })()}
                    </button>
                    </Fragment>
                  )
                })}
              </div>
            ) : (
              <div className="py-12 text-center">
                <p className="text-slate-500 dark:text-gray-400">No se pudieron cargar los días.</p>
                <button
                  type="button"
                  onClick={() => window.location.reload()}
                  className="mt-3 text-primary-700 dark:text-primary-400 hover:text-primary-800 dark:hover:text-primary-300 text-sm font-medium"
                >
                  Recargar
                </button>
              </div>
            )}

            <div className="mt-8 pt-6 border-t border-slate-100 dark:border-gray-700">
              <button
                type="button"
                onClick={handlePreviousStep}
                className="text-slate-600 dark:text-gray-400 hover:text-slate-900 dark:hover:text-white text-sm font-medium flex items-center gap-2"
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
            className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-slate-200 dark:border-gray-700 p-6 sm:p-8"
            aria-labelledby="step3-title"
          >
            <h2 id="step3-title" ref={stepHeadingRef} tabIndex={-1} className="text-lg font-semibold text-slate-900 dark:text-white mb-1 focus:outline-none">
              ¿A qué hora?
            </h2>
            <p className="text-slate-500 dark:text-gray-400 text-sm mb-2">
              {formatDate(selectedDate)}
              {selectedBarber && !isAnyBarberMode && (
                <span className="text-slate-600 dark:text-gray-400"> · <Scissors className="inline w-3.5 h-3.5 align-[-2px]" aria-hidden="true" /> {selectedBarber.name}</span>
              )}
              {isAnyBarberMode && (
                <span className="text-primary-700 dark:text-primary-400 font-medium"> · Cualquier barbero disponible</span>
              )}
            </p>

            {primaryService?.showDuration !== false && totalDuration > 0 && (
              <p className="text-xs text-slate-400 dark:text-gray-500 mb-5">
                Cada bloque reserva {totalDuration} min{selectedServices.length > 1 ? ` (${selectedServices.map(s => s.name).join(' + ')})` : ''}
              </p>
            )}

            {bookingError && (
              <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-xl p-3 mb-4 flex items-start gap-2" role="alert">
                <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" aria-hidden="true" />
                <p className="text-red-800 dark:text-red-400 text-sm">{bookingError}</p>
              </div>
            )}

            {loadingSlots ? (
              <div className="py-12 flex flex-col items-center justify-center">
                <div className="w-10 h-10 border-2 border-primary-600 border-t-transparent rounded-full animate-spin" />
                <p className="mt-3 text-slate-500 dark:text-gray-400 text-sm">Buscando horarios disponibles...</p>
              </div>
            ) : allSlots.length > 0 ? (
              <>
                {isAnyBarberMode && (
                  <p className="text-xs text-slate-500 dark:text-gray-400 mb-3 flex items-center gap-1.5">
                    <span className="inline-block w-2 h-2 rounded-full bg-primary-500"></span>
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
                          p-3 sm:p-4 rounded-xl text-center transition-[background-color,border-color,color,box-shadow] duration-150 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 dark:ring-offset-gray-800
                          ${isSelected
                            ? 'border-2 border-primary-500 bg-primary-50 dark:bg-primary-950/20 ring-2 ring-primary-200 dark:ring-primary-800 shadow-sm'
                            : slot.available
                              ? 'bg-white dark:bg-gray-800 border-2 border-slate-200 dark:border-gray-700 hover:border-primary-400 hover:bg-primary-50 dark:hover:bg-primary-950/20 cursor-pointer'
                              : 'bg-slate-50 dark:bg-gray-900/50 border-2 border-slate-100 dark:border-gray-700 text-slate-400 dark:text-gray-500 cursor-not-allowed'
                          }
                        `}
                        title={slot.available ? `Reservar a las ${formatTime12h(slot.time)}` : slot.reason}
                        aria-label={slot.available ? `Horario disponible: ${formatTime12h(slot.time)}` : `No disponible: ${slot.reason}`}
                      >
                        <span className={`block font-semibold text-base ${isSelected ? 'text-primary-700 dark:text-primary-400' : slot.available ? 'text-slate-900 dark:text-white' : 'text-slate-400 dark:text-gray-500'}`}>
                          {formatTime12h(slot.time)}
                        </span>
                        {showEndTime && (
                          <span className="block text-xs text-slate-500 dark:text-gray-400 mt-0.5">
                            hasta {formatTime12h(endTime)}
                          </span>
                        )}
                        {isAnyBarberMode && slot.available && (
                          <span className={`flex items-center justify-center gap-1 text-xs mt-1 font-medium ${isSelected ? 'text-primary-700 dark:text-primary-400' : 'text-slate-400 dark:text-gray-500'}`}>
                            <Scissors className="w-3 h-3" aria-hidden="true" /> {barberCount}/{slot.totalBarbers}
                          </span>
                        )}
                        {!slot.available && (
                          <span className="block text-xs mt-1 text-slate-400 dark:text-gray-500 truncate" title={slot.reason}>
                            {slot.reason}
                          </span>
                        )}
                      </button>
                    )
                  })}
                </div>

                {/* Panel informativo: barberos disponibles (solo modo "cualquier barbero") */}
                {isAnyBarberMode && selectedTime && (
                  <div className="mt-6 p-5 bg-primary-50 dark:bg-primary-950/20 border border-primary-200 dark:border-primary-800 rounded-xl">
                    <div className="flex items-center gap-3 mb-3">
                      <span className="w-9 h-9 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center text-primary-700 dark:text-primary-400 font-bold">✓</span>
                      <div>
                        <h3 className="font-semibold text-slate-900 dark:text-white">
                          {formatTime12h(selectedTime)}
                        </h3>
                        <p className="text-xs text-slate-500 dark:text-gray-400">{formatDate(selectedDate)}</p>
                      </div>
                    </div>

                    <p className="text-sm font-medium text-slate-700 dark:text-gray-300 mb-2">
                      Barberos disponibles a esta hora:
                    </p>
                    <div className="flex flex-wrap gap-2 mb-4">
                      {getAvailableBarbersForTime(selectedTime).map(barber => (
                        <span
                          key={barber.id}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-gray-800 rounded-lg border border-primary-200 dark:border-primary-800 text-sm font-medium text-slate-700 dark:text-gray-300 shadow-sm"
                        >
                          <Scissors className="w-3.5 h-3.5 text-primary-700 dark:text-primary-400" aria-hidden="true" /> {barber.name}
                        </span>
                      ))}
                    </div>

                    <p className="text-xs text-slate-500 dark:text-gray-400 mb-4">
                      Se te asignará automáticamente al barbero con mayor disponibilidad.
                    </p>

                    <button
                      type="button"
                      onClick={() => setCurrentStep(STEPS.CONFIRM)}
                      className="hidden md:inline-flex px-6 py-3 bg-primary-600 text-white font-semibold rounded-xl hover:bg-primary-700 transition-[background-color,transform] duration-150 active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                    >
                      Continuar →
                    </button>
                  </div>
                )}

                {checkingTime && (
                  <div className="mt-4 flex items-center gap-2 text-slate-500 dark:text-gray-400 text-sm">
                    <div className="w-4 h-4 border-2 border-primary-600 border-t-transparent rounded-full animate-spin" />
                    Verificando disponibilidad...
                  </div>
                )}
              </>
            ) : (
              <div className="py-12 text-center">
                <p className="text-slate-500 dark:text-gray-400">No hay horarios para esta fecha.</p>
                <button
                  type="button"
                  onClick={handlePreviousStep}
                  className="mt-3 text-primary-700 dark:text-primary-400 hover:text-primary-800 dark:hover:text-primary-300 text-sm font-medium"
                >
                  Elegir otra fecha
                </button>
              </div>
            )}

            <div className="mt-8 pt-6 border-t border-slate-100 dark:border-gray-700">
              <button
                type="button"
                onClick={handlePreviousStep}
                className="text-slate-600 dark:text-gray-400 hover:text-slate-900 dark:hover:text-white text-sm font-medium flex items-center gap-2"
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
            className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-slate-200 dark:border-gray-700 p-6 sm:p-8"
            aria-labelledby="step4-title"
          >
            <h2 id="step4-title" ref={stepHeadingRef} tabIndex={-1} className="text-lg font-semibold text-slate-900 dark:text-white mb-1 focus:outline-none">
              Tus datos para confirmar
            </h2>
            <p className="text-slate-500 dark:text-gray-400 text-sm mb-6">Te enviaremos un correo con los detalles de la reserva</p>
            
            {/* Resumen compacto */}
            <div className="bg-slate-50 dark:bg-gray-900 rounded-xl p-4 mb-6 border border-slate-100 dark:border-gray-700">
              <div className="space-y-1 text-sm text-slate-700 dark:text-gray-300">
                {selectedServices.length > 1 ? (
                  <>
                    <p className="font-medium text-slate-900 dark:text-white mb-2">Servicios seleccionados:</p>
                    {selectedServices.map((s, i) => (
                      <div key={s._id || s.id} className="flex justify-between">
                        <span>{s.name}</span>
                        <span className="text-slate-500 dark:text-gray-400">{formatPrice(s.price)} · {s.duration} min</span>
                      </div>
                    ))}
                    <div className="flex justify-between pt-2 mt-2 border-t border-slate-200 dark:border-gray-700 font-bold">
                      <span>Total</span>
                      <span>{formatPrice(totalPrice)} · {totalDuration} min</span>
                    </div>
                  </>
                ) : (
                  <span><strong>{selectedServices[0]?.name}</strong> · {formatPrice(totalPrice)}</span>
                )}
                <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2">
                  {selectedBarber && (
                    <span className="inline-flex items-center gap-1.5">
                      <Scissors className="w-3.5 h-3.5" aria-hidden="true" />
                      {isAnyBarberMode ? 'Asignación automática' : selectedBarber.name}
                    </span>
                  )}
                  <span className="inline-flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5" aria-hidden="true" /> {formatDate(selectedDate)}
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5" aria-hidden="true" /> {formatTime12h(selectedTime)}
                  </span>
                </div>
              </div>
              {salon?.requiresDeposit && salon?.depositAmount > 0 && (
                <p className="text-amber-600 text-sm mt-2">
                  Depósito: {formatPrice(salon.depositAmount)}
                  {salon?.bookingMode === 'PREPAGO' && ' — se cobra ahora'}
                  {salon?.bookingMode === 'PAGO_POST_APROBACION' && ' — se cobra cuando el salón apruebe'}
                  {(!salon?.bookingMode || salon?.bookingMode === 'LIBRE') && ' — se paga al llegar'}
                </p>
              )}
            </div>

            {/* Info del modo de reserva */}
            {salon?.bookingMode && salon.bookingMode !== 'LIBRE' && (
              <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-xl text-sm text-blue-800 dark:text-blue-400">
                {salon.bookingMode === 'PREPAGO' && (
                  <p><strong>Prepago requerido.</strong> Al confirmar, serás redirigido a pagar el depósito de {formatPrice(salon.depositAmount)}. Tu horario queda reservado por {salon.holdDurationMinutes || 15} minutos.</p>
                )}
                {salon.bookingMode === 'PAGO_POST_APROBACION' && (
                  <p><strong>Requiere aprobación.</strong> Tu solicitud será revisada. Si el salón la aprueba, recibirás un enlace de pago por email.</p>
                )}
              </div>
            )}

            {/* Política de No-Show - solo si hay depósito */}
            {salon?.requiresDeposit && salon?.depositAmount > 0 && (
              <details className="mb-6 group">
                <summary className="text-sm text-slate-600 dark:text-gray-400 cursor-pointer hover:text-slate-800 dark:hover:text-gray-200 flex items-center gap-2 list-none">
                  <span className="group-open:rotate-90 transition-transform">▸</span>
                  Política de depósito e inasistencia (importante)
                </summary>
                <div className="mt-3 p-4 bg-amber-50 dark:bg-amber-950/20 rounded-xl border border-amber-100 dark:border-amber-800 text-sm text-amber-900 dark:text-amber-400">
                  <p className="font-medium mb-2">Depósito de {formatPrice(salon.depositAmount)} para reservar tu horario.</p>
                  <ul className="list-disc list-inside space-y-1 text-amber-800 dark:text-amber-300 dark:text-amber-400">
                    <li>El depósito <strong>no es reembolsable</strong> bajo ninguna circunstancia</li>
                    <li>Si no asistes, pierdes el depósito</li>
                    <li>El precio del servicio ({formatPrice(totalPrice)}) se paga al llegar</li>
                  </ul>
                  <p className="mt-2 font-medium">Al confirmar, aceptas estas condiciones.</p>
                </div>
              </details>
            )}

            <form
              id="booking-form"
              onSubmit={(e) => {
                e.preventDefault()
                handleConfirmBooking()
              }}
              className="space-y-4"
            >
              <div>
                <label htmlFor="client-name" className="block text-sm font-medium text-slate-700 dark:text-gray-300 mb-1.5">
                  Nombre completo
                </label>
                <input
                  id="client-name"
                  type="text"
                  required
                  value={clientData.name}
                  onChange={(e) => setClientData({ ...clientData, name: e.target.value })}
                  className="w-full px-4 py-3 border border-slate-300 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 rounded-xl focus:ring-2 focus:ring-ring focus:border-primary-500 transition-shadow dark:placeholder-gray-500"
                  placeholder="Tu nombre"
                  autoComplete="name"
                  aria-required="true"
                />
              </div>

              <div>
                <label htmlFor="client-email" className="block text-sm font-medium text-slate-700 dark:text-gray-300 mb-1.5">
                  Correo electrónico
                </label>
                <input
                  id="client-email"
                  type="email"
                  required
                  value={clientData.email}
                  onChange={(e) => setClientData({ ...clientData, email: e.target.value })}
                  className="w-full px-4 py-3 border border-slate-300 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 rounded-xl focus:ring-2 focus:ring-ring focus:border-primary-500 transition-shadow dark:placeholder-gray-500"
                  placeholder="tu@correo.com"
                  autoComplete="email"
                  aria-required="true"
                />
              </div>

              <div>
                <label htmlFor="client-phone" className="block text-sm font-medium text-slate-700 dark:text-gray-300 mb-1.5">
                  Teléfono
                </label>
                <input
                  id="client-phone"
                  type="tel"
                  required
                  value={clientData.phone}
                  onChange={(e) => setClientData({ ...clientData, phone: e.target.value })}
                  className="w-full px-4 py-3 border border-slate-300 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 rounded-xl focus:ring-2 focus:ring-ring focus:border-primary-500 transition-shadow dark:placeholder-gray-500"
                  placeholder="55 1234 5678"
                  autoComplete="tel"
                  aria-required="true"
                />
              </div>

              <div>
                <label htmlFor="client-notes" className="block text-sm font-medium text-slate-700 dark:text-gray-300 mb-1.5">
                  Notas (opcional)
                </label>
                <textarea
                  id="client-notes"
                  value={clientData.notes}
                  onChange={(e) => setClientData({ ...clientData, notes: e.target.value })}
                  rows={2}
                  className="w-full px-4 py-3 border border-slate-300 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 rounded-xl focus:ring-2 focus:ring-ring focus:border-primary-500 transition-shadow resize-none dark:placeholder-gray-500"
                  placeholder="Alguna preferencia o comentario..."
                />
              </div>

              <div className="flex flex-col-reverse sm:flex-row gap-3 sm:justify-between sm:items-center pt-6 border-t border-slate-100 dark:border-gray-700">
                <button
                  type="button"
                  onClick={handlePreviousStep}
                  className="text-slate-600 dark:text-gray-400 hover:text-slate-900 dark:hover:text-white text-sm font-medium"
                  aria-label="Volver a seleccionar hora"
                >
                  ← Cambiar hora
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full sm:w-auto px-6 py-3 bg-primary-600 text-white font-semibold rounded-xl hover:bg-primary-700 disabled:opacity-60 disabled:cursor-not-allowed transition-[background-color,transform] duration-150 active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                  aria-busy={submitting}
                >
                  {submitting ? 'Procesando...' : (
                    salon?.bookingMode === 'PREPAGO' ? 'Reservar y pagar depósito' :
                    salon?.bookingMode === 'PAGO_POST_APROBACION' ? 'Enviar solicitud' :
                    'Confirmar reserva'
                  )}
                </button>
              </div>
            </form>
          </section>
        )}
      </div>

      {/* Barra fija móvil (P2-3): total corrido + acción primaria del paso */}
      {showStickyBar && (
        <div className="fixed bottom-0 inset-x-0 z-40 md:hidden bg-white/95 dark:bg-gray-900/95 backdrop-blur border-t border-slate-200 dark:border-gray-700 px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs text-slate-500 dark:text-gray-400 truncate">
                {selectedServices.length} servicio{selectedServices.length > 1 ? 's' : ''}
                {totalDuration > 0 && ` · ${totalDuration} min`}
              </p>
              <p className="font-bold text-slate-900 dark:text-white" aria-live="polite">{formatPrice(totalPrice)}</p>
            </div>
            {stickyAction && (
              stickyAction.submit ? (
                <button
                  type="submit"
                  form="booking-form"
                  disabled={stickyAction.disabled}
                  aria-busy={submitting}
                  className="shrink-0 px-5 py-3 bg-primary-600 text-white font-semibold rounded-xl hover:bg-primary-700 disabled:opacity-60 disabled:cursor-not-allowed transition-[background-color,transform] duration-150 active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 dark:ring-offset-gray-900"
                >
                  {stickyAction.label}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={stickyAction.onClick}
                  disabled={stickyAction.disabled}
                  className="shrink-0 px-5 py-3 bg-primary-600 text-white font-semibold rounded-xl hover:bg-primary-700 disabled:opacity-60 disabled:cursor-not-allowed transition-[background-color,transform] duration-150 active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 dark:ring-offset-gray-900"
                >
                  {stickyAction.label} →
                </button>
              )
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default BookingPage 