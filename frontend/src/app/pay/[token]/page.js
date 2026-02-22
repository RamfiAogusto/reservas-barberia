"use client"

import { useState, useEffect, useCallback, useRef } from 'react'
import { useParams, useSearchParams } from 'next/navigation'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { formatTime12h } from '@/utils/formatTime'
import {
  CheckCircle2, Clock, AlertTriangle, CreditCard, Scissors,
  Calendar, MapPin, Phone, User, DollarSign, ShieldCheck, XCircle,
  Loader2
} from 'lucide-react'

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'

// ─── Estado visual de la página ───
const PAGE_STATES = {
  LOADING: 'LOADING',
  AWAITING_PAYMENT: 'AWAITING_PAYMENT',
  PROCESSING: 'PROCESSING',
  SUCCESS: 'SUCCESS',
  EXPIRED: 'EXPIRED',
  ALREADY_PAID: 'ALREADY_PAID',
  NOT_FOUND: 'NOT_FOUND',
  ERROR: 'ERROR'
}

export default function PaymentPage() {
  const { token } = useParams()
  const searchParams = useSearchParams()
  const [pageState, setPageState] = useState(PAGE_STATES.LOADING)
  const [appointment, setAppointment] = useState(null)
  const [timeLeft, setTimeLeft] = useState(null)
  const [error, setError] = useState('')
  const timerRef = useRef(null)

  // ─── Cargar datos de la cita ───
  const fetchAppointment = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/payments/appointment/${token}`)
      const json = await res.json()

      if (!res.ok) {
        if (res.status === 404) return setPageState(PAGE_STATES.NOT_FOUND)
        throw new Error(json.message || 'Error cargando datos')
      }

      const data = json.data
      setAppointment(data)

      // Determinar estado de la página según el estado de la cita
      if (data.status === 'ESPERANDO_PAGO') {
        // Verificar si ya expiró
        if (data.holdExpiresAt && new Date(data.holdExpiresAt) < new Date()) {
          setPageState(PAGE_STATES.EXPIRED)
        } else {
          setPageState(PAGE_STATES.AWAITING_PAYMENT)
        }
      } else if (data.status === 'CONFIRMADA' || data.status === 'COMPLETADA') {
        setPageState(PAGE_STATES.ALREADY_PAID)
      } else if (data.status === 'PENDIENTE') {
        // Pago recibido pero barber aún no confirma (PREPAGO sin auto-confirm)
        setPageState(PAGE_STATES.SUCCESS)
      } else if (data.status === 'EXPIRADA' || data.status === 'CANCELADA') {
        setPageState(PAGE_STATES.EXPIRED)
      } else {
        setPageState(PAGE_STATES.AWAITING_PAYMENT)
      }
    } catch (err) {
      console.error('Error cargando pago:', err)
      setError(err.message)
      setPageState(PAGE_STATES.ERROR)
    }
  }, [token])

  useEffect(() => {
    if (token) fetchAppointment()
  }, [token, fetchAppointment])

  // Manejar retorno desde pasarela (query params ?status=success/cancelled)
  useEffect(() => {
    const status = searchParams.get('status')
    if (status === 'success') {
      // Refrescar para obtener estado actualizado
      fetchAppointment()
    }
  }, [searchParams, fetchAppointment])

  // ─── Temporizador de cuenta regresiva ───
  useEffect(() => {
    if (pageState !== PAGE_STATES.AWAITING_PAYMENT || !appointment?.holdExpiresAt) return

    const updateTimer = () => {
      const now = new Date()
      const expires = new Date(appointment.holdExpiresAt)
      const diff = expires - now

      if (diff <= 0) {
        setTimeLeft(null)
        setPageState(PAGE_STATES.EXPIRED)
        return
      }

      const minutes = Math.floor(diff / 60000)
      const seconds = Math.floor((diff % 60000) / 1000)
      setTimeLeft({ minutes, seconds, total: diff })
    }

    updateTimer()
    timerRef.current = setInterval(updateTimer, 1000)

    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [pageState, appointment?.holdExpiresAt])

  // ─── Confirmar pago (placeholder / manual) ───
  const handleConfirmPayment = async () => {
    if (!appointment) return
    setPageState(PAGE_STATES.PROCESSING)

    try {
      // Primero intentar crear sesión de pago
      const sessionRes = await fetch(`${API_BASE}/payments/create-session`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paymentToken: token })
      })
      const sessionData = await sessionRes.json()

      if (!sessionRes.ok) {
        throw new Error(sessionData.message || 'Error al procesar pago')
      }

      if (sessionData.data?.gatewayConfigured && sessionData.data?.paymentUrl) {
        // Redirigir a pasarela real
        window.location.href = sessionData.data.paymentUrl
        return
      }

      // Pasarela no configurada — confirmar pago directamente (simulación)
      const confirmRes = await fetch(`${API_BASE}/appointments/${appointment.appointmentId}/confirm-payment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paymentToken: token })
      })
      const confirmData = await confirmRes.json()

      if (!confirmRes.ok) {
        if (confirmRes.status === 410) {
          setPageState(PAGE_STATES.EXPIRED)
          return
        }
        throw new Error(confirmData.message || 'Error confirmando pago')
      }

      setPageState(PAGE_STATES.SUCCESS)
      // Re-fetch para obtener datos actualizados
      setTimeout(() => fetchAppointment(), 500)
    } catch (err) {
      console.error('Error procesando pago:', err)
      setError(err.message)
      setPageState(PAGE_STATES.ERROR)
    }
  }

  // ─── Formatear fecha ───
  const formatDate = (dateStr) => {
    if (!dateStr) return ''
    try {
      return format(new Date(dateStr), "EEEE d 'de' MMMM, yyyy", { locale: es })
    } catch {
      return dateStr
    }
  }

  // ─── Render según estado ───
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 dark:from-gray-950 dark:to-gray-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* ─── Loading ─── */}
        {pageState === PAGE_STATES.LOADING && (
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl p-8 text-center">
            <Loader2 className="w-10 h-10 animate-spin text-blue-500 mx-auto mb-4" />
            <p className="text-gray-600 dark:text-gray-400">Cargando información de pago...</p>
          </div>
        )}

        {/* ─── Not Found ─── */}
        {pageState === PAGE_STATES.NOT_FOUND && (
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl p-8 text-center">
            <XCircle className="w-14 h-14 text-gray-400 mx-auto mb-4" />
            <h1 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Reserva no encontrada</h1>
            <p className="text-gray-500 dark:text-gray-400">
              Este enlace de pago no es válido o la reserva ya no existe.
            </p>
          </div>
        )}

        {/* ─── Expired ─── */}
        {pageState === PAGE_STATES.EXPIRED && (
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl p-8 text-center">
            <AlertTriangle className="w-14 h-14 text-orange-500 mx-auto mb-4" />
            <h1 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Tiempo expirado</h1>
            <p className="text-gray-500 dark:text-gray-400 mb-4">
              El plazo para completar el pago ha finalizado y el horario fue liberado.
            </p>
            {appointment && (
              <p className="text-sm text-gray-400">
                Puedes volver a reservar en el salón para obtener un nuevo horario.
              </p>
            )}
          </div>
        )}

        {/* ─── Already Paid / Confirmed ─── */}
        {pageState === PAGE_STATES.ALREADY_PAID && appointment && (
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl p-8 text-center">
            <CheckCircle2 className="w-14 h-14 text-green-500 mx-auto mb-4" />
            <h1 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Reserva confirmada</h1>
            <p className="text-gray-500 dark:text-gray-400 mb-4">
              Tu pago ya fue procesado y la reserva está confirmada.
            </p>
            <AppointmentSummary appointment={appointment} formatDate={formatDate} />
          </div>
        )}

        {/* ─── Success (just paid) ─── */}
        {pageState === PAGE_STATES.SUCCESS && appointment && (
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl p-8 text-center">
            <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="w-10 h-10 text-green-500" />
            </div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-white mb-2">¡Pago confirmado!</h1>
            <p className="text-gray-500 dark:text-gray-400 mb-6">
              {appointment.bookingMode === 'PREPAGO'
                ? 'Tu depósito fue recibido. El salón confirmará tu reserva pronto.'
                : 'Tu depósito fue procesado exitosamente. Tu reserva está asegurada.'
              }
            </p>
            <AppointmentSummary appointment={appointment} formatDate={formatDate} />
            <div className="mt-6 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <p className="text-sm text-blue-700 dark:text-blue-300">
                <ShieldCheck className="w-4 h-4 inline mr-1" />
                Recibirás un email de confirmación con los detalles.
              </p>
            </div>
          </div>
        )}

        {/* ─── Error ─── */}
        {pageState === PAGE_STATES.ERROR && (
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl p-8 text-center">
            <XCircle className="w-14 h-14 text-red-500 mx-auto mb-4" />
            <h1 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Error</h1>
            <p className="text-gray-500 dark:text-gray-400 mb-4">
              {error || 'Ocurrió un error al procesar tu pago.'}
            </p>
            <button
              onClick={() => {
                setError('')
                setPageState(PAGE_STATES.LOADING)
                fetchAppointment()
              }}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
            >
              Intentar de nuevo
            </button>
          </div>
        )}

        {/* ─── Awaiting Payment (main state) ─── */}
        {pageState === PAGE_STATES.AWAITING_PAYMENT && appointment && (
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-5 text-white">
              <h1 className="text-lg font-bold">{appointment.salonName}</h1>
              <p className="text-blue-100 text-sm mt-1">Completar pago de depósito</p>
            </div>

            {/* Timer */}
            {timeLeft && (
              <div className={`px-6 py-3 flex items-center justify-between text-sm ${
                timeLeft.total < 300000
                  ? 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400'
                  : 'bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-400'
              }`}>
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  <span>Tiempo restante</span>
                </div>
                <span className="font-mono font-bold text-base">
                  {String(timeLeft.minutes).padStart(2, '0')}:{String(timeLeft.seconds).padStart(2, '0')}
                </span>
              </div>
            )}

            {/* Appointment info */}
            <div className="px-6 py-5 space-y-4">
              <AppointmentSummary appointment={appointment} formatDate={formatDate} />

              {/* Divider */}
              <div className="border-t border-gray-100 dark:border-gray-800" />

              {/* Payment breakdown */}
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-green-600" />
                  Resumen de pago
                </h3>
                <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-4 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500 dark:text-gray-400">Total servicios</span>
                    <span className="text-gray-700 dark:text-gray-300">
                      ${appointment.totalServiceAmount?.toFixed(2) || '0.00'}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm font-medium border-t border-gray-200 dark:border-gray-700 pt-2">
                    <span className="text-gray-900 dark:text-white">Depósito a pagar ahora</span>
                    <span className="text-lg text-blue-600 dark:text-blue-400 font-bold">
                      ${appointment.depositAmount?.toFixed(2) || '0.00'}
                    </span>
                  </div>
                  {appointment.totalServiceAmount > appointment.depositAmount && (
                    <div className="flex justify-between text-xs text-gray-400">
                      <span>Restante a pagar en el salón</span>
                      <span>${(appointment.totalServiceAmount - appointment.depositAmount).toFixed(2)}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Non-refundable notice */}
              <div className="flex items-start gap-2 p-3 bg-amber-50 dark:bg-amber-900/15 rounded-lg">
                <AlertTriangle className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
                <p className="text-xs text-amber-700 dark:text-amber-400">
                  El depósito <strong>no es reembolsable</strong>. Si no asistes a tu cita, el depósito no será devuelto.
                </p>
              </div>

              {/* Pay button */}
              <button
                onClick={handleConfirmPayment}
                className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white rounded-xl font-semibold text-base transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-600/25"
              >
                <CreditCard className="w-5 h-5" />
                Pagar ${appointment.depositAmount?.toFixed(2) || '0.00'}
              </button>
            </div>
          </div>
        )}

        {/* ─── Processing overlay ─── */}
        {pageState === PAGE_STATES.PROCESSING && (
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl p-8 text-center">
            <Loader2 className="w-10 h-10 animate-spin text-blue-500 mx-auto mb-4" />
            <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-2">Procesando pago...</h2>
            <p className="text-gray-500 dark:text-gray-400 text-sm">No cierres esta ventana.</p>
          </div>
        )}

        {/* Footer branding */}
        <p className="text-center text-xs text-gray-400 mt-6">
          Pago seguro · Sistema de Reservas
        </p>
      </div>
    </div>
  )
}

// ─── Componente resumen de la cita ───
function AppointmentSummary({ appointment, formatDate }) {
  return (
    <div className="space-y-3">
      {/* Services */}
      <div className="flex items-start gap-3">
        <Scissors className="w-4 h-4 text-gray-400 mt-1 flex-shrink-0" />
        <div>
          <p className="text-sm font-medium text-gray-900 dark:text-white">
            {appointment.services?.length > 1
              ? appointment.services.map(s => s.name).join(' + ')
              : appointment.services?.[0]?.name || 'Servicio'
            }
          </p>
          {appointment.services?.length > 1 && (
            <div className="mt-1 space-y-0.5">
              {appointment.services.map((s, i) => (
                <p key={i} className="text-xs text-gray-400">
                  {s.name} — ${s.price?.toFixed(2)} · {s.duration} min
                </p>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Date & time */}
      <div className="flex items-center gap-3">
        <Calendar className="w-4 h-4 text-gray-400 flex-shrink-0" />
        <div>
          <p className="text-sm text-gray-700 dark:text-gray-300 capitalize">{formatDate(appointment.date)}</p>
          <p className="text-xs text-gray-500">{formatTime12h(appointment.time)}</p>
        </div>
      </div>

      {/* Barber */}
      {appointment.barberName && (
        <div className="flex items-center gap-3">
          <User className="w-4 h-4 text-gray-400 flex-shrink-0" />
          <p className="text-sm text-gray-700 dark:text-gray-300">{appointment.barberName}</p>
        </div>
      )}

      {/* Address */}
      {appointment.salonAddress && appointment.salonAddress !== 'Dirección no especificada' && (
        <div className="flex items-center gap-3">
          <MapPin className="w-4 h-4 text-gray-400 flex-shrink-0" />
          <p className="text-sm text-gray-500 dark:text-gray-400">{appointment.salonAddress}</p>
        </div>
      )}

      {/* Phone */}
      {appointment.salonPhone && appointment.salonPhone !== 'Teléfono no especificado' && (
        <div className="flex items-center gap-3">
          <Phone className="w-4 h-4 text-gray-400 flex-shrink-0" />
          <p className="text-sm text-gray-500 dark:text-gray-400">{appointment.salonPhone}</p>
        </div>
      )}
    </div>
  )
}
