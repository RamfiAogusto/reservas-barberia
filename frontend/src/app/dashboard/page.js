"use client"

import { useState, useEffect, useCallback, useMemo } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  format, startOfMonth, endOfMonth, startOfWeek, endOfWeek,
  addMonths, subMonths,
} from 'date-fns'
import { es } from 'date-fns/locale'
import api, { getUserData, getAuthToken, clearAuthData } from '@/utils/api'
import { formatTime12h } from '@/utils/formatTime'
import { useSocketEvent } from '@/contexts/SocketContext'
import { cn } from '@/lib/utils'

import AppointmentCalendar from '@/components/AppointmentCalendar'
import AppointmentDetailCard, { getAppointmentStatus } from '@/components/AppointmentDetailCard'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

import {
  CalendarDays, CalendarCheck2, Clock, DollarSign, TrendingUp,
  CreditCard, UserCircle, Scissors,
} from 'lucide-react'

const Dashboard = () => {
  const router = useRouter()
  const [user, setUser] = useState(null)
  const [stats, setStats] = useState({
    appointments: { today: 0, thisWeek: 0, thisMonth: 0 },
    services: { totalServices: 0 },
    revenue: { monthlyRevenue: 0 }
  })
  const [loading, setLoading] = useState(true)
  const [calendarAppointments, setCalendarAppointments] = useState([])
  const [selectedAppointment, setSelectedAppointment] = useState(null)
  const [calendarDate, setCalendarDate] = useState(new Date())
  const [error, setError] = useState('')
  const [actionLoading, setActionLoading] = useState(false)

  // ─── Load appointments for calendar date range ───
  const loadCalendarRange = useCallback(async (refDate) => {
    try {
      const monthStart = startOfMonth(refDate)
      const monthEnd = endOfMonth(refDate)
      const rangeStart = startOfWeek(monthStart, { locale: es })
      const rangeEnd = endOfWeek(monthEnd, { locale: es })
      const result = await api.get(
        `/appointments?startDate=${format(rangeStart, 'yyyy-MM-dd')}&endDate=${format(rangeEnd, 'yyyy-MM-dd')}`
      )
      if (result?.success) setCalendarAppointments(result.data || [])
    } catch (err) { console.error('Error loading calendar:', err) }
  }, [])

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true)
        const token = getAuthToken()
        if (!token) { router.push('/login'); return }
        const userData = getUserData()
        if (!userData) { router.push('/login'); return }
        setUser(userData)

        const [aptStats, svcStats] = await Promise.all([
          api.get('/appointments/stats/summary').catch(() => null),
          api.get('/services/stats/summary').catch(() => null),
        ])
        if (aptStats?.success) {
          setStats(prev => ({ ...prev, appointments: aptStats.stats, revenue: { monthlyRevenue: aptStats.stats.monthlyRevenue || 0 } }))
        }
        if (svcStats?.success) {
          setStats(prev => ({ ...prev, services: svcStats.stats }))
        }
        await loadCalendarRange(new Date())
      } catch (err) {
        console.error('Error loading dashboard:', err)
        if (err.message?.includes('Token') || err.message?.includes('401')) { clearAuthData(); router.push('/login') }
        setError('Error al cargar el dashboard')
      } finally { setLoading(false) }
    }
    load()
  }, [router, loadCalendarRange])

  // ─── Real-time refresh ───
  const refreshAll = useCallback(async () => {
    const [aptStats] = await Promise.all([
      api.get('/appointments/stats/summary').catch(() => null),
      loadCalendarRange(calendarDate),
    ])
    if (aptStats?.success) {
      setStats(prev => ({ ...prev, appointments: aptStats.stats, revenue: { monthlyRevenue: aptStats.stats.monthlyRevenue || 0 } }))
    }
  }, [calendarDate, loadCalendarRange])

  useSocketEvent('appointment:new', refreshAll)
  useSocketEvent('appointment:statusChanged', refreshAll)
  useSocketEvent('appointment:deleted', refreshAll)
  useSocketEvent('appointment:responded', refreshAll)
  useSocketEvent('appointment:paymentConfirmed', refreshAll)
  useSocketEvent('appointment:holdExpired', refreshAll)

  // ─── Actions ───
  const handleUpdateStatus = async (id, status) => {
    try {
      setActionLoading(true)
      const res = await api.put(`/appointments/${id}/status`, { status })
      if (res.success) {
        setCalendarAppointments(prev => prev.map(a => a.id === id ? { ...a, status } : a))
        if (selectedAppointment?.id === id) setSelectedAppointment(prev => ({ ...prev, status }))
      }
    } catch (e) { console.error(e) } finally { setActionLoading(false) }
  }
  const handleRespondBooking = async (id, action) => {
    try {
      setActionLoading(true)
      const res = await api.put(`/appointments/${id}/respond`, { action })
      if (res.success) {
        const ns = res.data?.status || (action === 'RECHAZAR' ? 'CANCELADA' : 'CONFIRMADA')
        setCalendarAppointments(prev => prev.map(a => a.id === id ? { ...a, status: ns } : a))
        if (selectedAppointment?.id === id) setSelectedAppointment(prev => ({ ...prev, status: ns }))
      }
    } catch (e) { console.error(e) } finally { setActionLoading(false) }
  }

  const handleDateSelect = useCallback((d) => setCalendarDate(d), [])

  // Derived data
  const todayAppts = useMemo(() => {
    const t = format(new Date(), 'yyyy-MM-dd')
    return calendarAppointments.filter(a => (typeof a.date === 'string' ? a.date.split('T')[0] : format(new Date(a.date), 'yyyy-MM-dd')) === t)
  }, [calendarAppointments])
  const pendingCount = useMemo(() => calendarAppointments.filter(a => a.status === 'PENDIENTE').length, [calendarAppointments])
  const waitingPaymentCount = useMemo(() => calendarAppointments.filter(a => a.status === 'ESPERANDO_PAGO').length, [calendarAppointments])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-2 border-primary-600 border-t-transparent mx-auto" />
          <p className="mt-3 text-sm text-gray-500 dark:text-gray-400">Cargando dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* ─── Welcome ─── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            ¡Hola, {user?.salonName || user?.name || user?.username}!
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 capitalize">
            {format(new Date(), "EEEE, d 'de' MMMM yyyy", { locale: es })}
          </p>
        </div>
        <Link href="/dashboard/appointments">
          <Button size="sm"><CalendarDays className="w-4 h-4 mr-1.5" />Ver todas las citas</Button>
        </Link>
      </div>

      {/* ─── Stats ─── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card><CardContent className="p-4"><div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-blue-50 dark:bg-blue-900/30"><CalendarDays className="w-5 h-5 text-blue-600 dark:text-blue-400" /></div>
          <div><p className="text-xs font-medium text-gray-500 dark:text-gray-400">Hoy</p><p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.appointments.today}</p></div>
        </div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-emerald-50 dark:bg-emerald-900/30"><TrendingUp className="w-5 h-5 text-emerald-600 dark:text-emerald-400" /></div>
          <div><p className="text-xs font-medium text-gray-500 dark:text-gray-400">Esta semana</p><p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.appointments.thisWeek}</p></div>
        </div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-amber-50 dark:bg-amber-900/30"><Clock className="w-5 h-5 text-amber-600 dark:text-amber-400" /></div>
          <div><p className="text-xs font-medium text-gray-500 dark:text-gray-400">Pendientes</p><p className="text-2xl font-bold text-gray-900 dark:text-white">{pendingCount}</p></div>
        </div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-purple-50 dark:bg-purple-900/30"><DollarSign className="w-5 h-5 text-purple-600 dark:text-purple-400" /></div>
          <div><p className="text-xs font-medium text-gray-500 dark:text-gray-400">Ingresos mes</p><p className="text-2xl font-bold text-gray-900 dark:text-white">${stats.revenue.monthlyRevenue}</p></div>
        </div></CardContent></Card>
      </div>

      {/* ─── Alert badges ─── */}
      {(pendingCount > 0 || waitingPaymentCount > 0) && (
        <div className="flex flex-wrap gap-2">
          {pendingCount > 0 && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
              <Clock className="w-4 h-4 text-amber-600 dark:text-amber-400" />
              <span className="text-sm font-medium text-amber-800 dark:text-amber-300">{pendingCount} cita{pendingCount > 1 ? 's' : ''} sin confirmar</span>
            </div>
          )}
          {waitingPaymentCount > 0 && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800">
              <CreditCard className="w-4 h-4 text-orange-600 dark:text-orange-400" />
              <span className="text-sm font-medium text-orange-800 dark:text-orange-300">{waitingPaymentCount} esperando pago</span>
            </div>
          )}
        </div>
      )}

      {/* ─── Calendar + Side panel ─── */}
      <div className="grid grid-cols-1 xl:grid-cols-[1fr_380px] gap-6">
        <Card className="overflow-hidden">
          <CardContent className="p-4 sm:p-6">
            <AppointmentCalendar
              appointments={calendarAppointments}
              onSelectDate={handleDateSelect}
              onSelectAppointment={setSelectedAppointment}
              selectedDate={calendarDate}
            />
          </CardContent>
        </Card>

        <div className="space-y-4">
          {selectedAppointment ? (
            <AppointmentDetailCard
              appointment={selectedAppointment}
              onClose={() => setSelectedAppointment(null)}
              onUpdateStatus={handleUpdateStatus}
              onRespond={handleRespondBooking}
              actionLoading={actionLoading}
            />
          ) : (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <CalendarCheck2 className="w-4 h-4 text-primary-600" />Citas de hoy
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {todayAppts.length === 0 ? (
                  <p className="text-sm text-gray-500 dark:text-gray-400 py-4 text-center">Sin citas programadas hoy</p>
                ) : todayAppts.slice(0, 8).map(apt => {
                  const st = getAppointmentStatus(apt.status)
                  return (
                    <button key={apt.id} onClick={() => setSelectedAppointment(apt)}
                      className="flex items-center gap-3 w-full p-2.5 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 text-left transition-colors">
                      <div className="text-center w-12 flex-shrink-0">
                        <p className="text-xs font-bold text-gray-900 dark:text-gray-100">{formatTime12h(apt.time)}</p>
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{apt.clientName}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{apt.service?.name || 'Servicio'}</p>
                      </div>
                      <Badge variant={st.variant} className="text-[11px] flex-shrink-0">{st.label}</Badge>
                    </button>
                  )
                })}
                {todayAppts.length > 8 && (
                  <Link href="/dashboard/appointments" className="block text-center">
                    <Button variant="ghost" size="sm" className="text-xs">Ver todas ({todayAppts.length})</Button>
                  </Link>
                )}
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-base">Acciones rápidas</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-2 gap-2">
              <Link href="/dashboard/appointments"><Button variant="outline" size="sm" className="w-full justify-start text-xs"><CalendarDays className="w-3.5 h-3.5 mr-1.5" />Citas</Button></Link>
              <Link href="/dashboard/services"><Button variant="outline" size="sm" className="w-full justify-start text-xs"><Scissors className="w-3.5 h-3.5 mr-1.5" />Servicios</Button></Link>
              <Link href="/dashboard/schedules"><Button variant="outline" size="sm" className="w-full justify-start text-xs"><Clock className="w-3.5 h-3.5 mr-1.5" />Horarios</Button></Link>
              <Link href="/dashboard/settings"><Button variant="outline" size="sm" className="w-full justify-start text-xs"><UserCircle className="w-3.5 h-3.5 mr-1.5" />Ajustes</Button></Link>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

export default Dashboard