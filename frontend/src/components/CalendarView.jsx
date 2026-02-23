'use client'

import { useState, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog'
import { ChevronLeft, ChevronRight, Clock, User, Scissors, CreditCard } from 'lucide-react'
import { formatTime12h } from '@/utils/formatTime'
import { cn } from '@/lib/utils'

const STATUS_COLORS = {
  PENDIENTE:      'bg-amber-100 dark:bg-amber-900/40 border-amber-300 dark:border-amber-700 text-amber-800 dark:text-amber-200',
  CONFIRMADA:     'bg-emerald-100 dark:bg-emerald-900/40 border-emerald-300 dark:border-emerald-700 text-emerald-800 dark:text-emerald-200',
  ESPERANDO_PAGO: 'bg-orange-100 dark:bg-orange-900/40 border-orange-300 dark:border-orange-700 text-orange-800 dark:text-orange-200',
  COMPLETADA:     'bg-blue-100 dark:bg-blue-900/40 border-blue-300 dark:border-blue-700 text-blue-800 dark:text-blue-200',
  CANCELADA:      'bg-red-100 dark:bg-red-900/40 border-red-300 dark:border-red-700 text-red-800 dark:text-red-200',
  EXPIRADA:       'bg-gray-100 dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400',
  NO_ASISTIO:     'bg-gray-100 dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400',
}

const STATUS_LABELS = {
  PENDIENTE: 'Pendiente', CONFIRMADA: 'Confirmada', ESPERANDO_PAGO: 'Esperando pago',
  COMPLETADA: 'Completada', CANCELADA: 'Cancelada', EXPIRADA: 'Expirada', NO_ASISTIO: 'No asistió',
}

const STATUS_BADGE_VARIANT = {
  PENDIENTE: 'warning', CONFIRMADA: 'success', ESPERANDO_PAGO: 'orange',
  COMPLETADA: 'info', CANCELADA: 'destructive', EXPIRADA: 'muted', NO_ASISTIO: 'secondary',
}

const HOURS = Array.from({ length: 15 }, (_, i) => i + 7)
const DAY_NAMES = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']
const DAY_NAMES_FULL = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']
const MONTH_NAMES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']

const getWeekDays = (date) => {
  const d = new Date(date)
  const day = d.getDay()
  const start = new Date(d)
  start.setDate(d.getDate() - day + 1)

  return Array.from({ length: 7 }, (_, i) => {
    const dayDate = new Date(start)
    dayDate.setDate(start.getDate() + i)
    return dayDate
  })
}

const getMonthDays = (date) => {
  const year = date.getFullYear()
  const month = date.getMonth()
  const firstDay = new Date(year, month, 1)
  const lastDay = new Date(year, month + 1, 0)
  const startPad = (firstDay.getDay() + 6) % 7
  const days = []

  for (let i = startPad - 1; i >= 0; i--) {
    const d = new Date(year, month, -i)
    days.push({ date: d, isCurrentMonth: false })
  }
  for (let i = 1; i <= lastDay.getDate(); i++) {
    days.push({ date: new Date(year, month, i), isCurrentMonth: true })
  }
  const remaining = 42 - days.length
  for (let i = 1; i <= remaining; i++) {
    days.push({ date: new Date(year, month + 1, i), isCurrentMonth: false })
  }

  return days
}

const isSameDay = (d1, d2) => {
  return d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate()
}

const parseTime = (timeStr) => {
  if (!timeStr) return { hours: 0, minutes: 0 }
  const [h, m] = timeStr.split(':').map(Number)
  return { hours: h || 0, minutes: m || 0 }
}

const CalendarView = ({ appointments = [], onEdit, onUpdateStatus, onRespondToBooking }) => {
  const [viewMode, setViewMode] = useState('week')
  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedAppointment, setSelectedAppointment] = useState(null)
  const [selectedDay, setSelectedDay] = useState(null)

  const today = new Date()

  const handlePrev = () => {
    const d = new Date(currentDate)
    if (viewMode === 'week') d.setDate(d.getDate() - 7)
    else if (viewMode === 'day') d.setDate(d.getDate() - 1)
    else d.setMonth(d.getMonth() - 1)
    setCurrentDate(d)
  }

  const handleNext = () => {
    const d = new Date(currentDate)
    if (viewMode === 'week') d.setDate(d.getDate() + 7)
    else if (viewMode === 'day') d.setDate(d.getDate() + 1)
    else d.setMonth(d.getMonth() + 1)
    setCurrentDate(d)
  }

  const handleToday = () => {
    setCurrentDate(new Date())
    setSelectedDay(null)
  }

  const appointmentsByDate = useMemo(() => {
    const map = {}
    appointments.forEach(apt => {
      const dateKey = new Date(apt.date).toISOString().split('T')[0]
      if (!map[dateKey]) map[dateKey] = []
      map[dateKey].push(apt)
    })
    Object.values(map).forEach(arr => arr.sort((a, b) => {
      const ta = parseTime(a.time), tb = parseTime(b.time)
      return (ta.hours * 60 + ta.minutes) - (tb.hours * 60 + tb.minutes)
    }))
    return map
  }, [appointments])

  const getAptsForDate = (date) => {
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
    return appointmentsByDate[key] || []
  }

  const weekDays = useMemo(() => getWeekDays(currentDate), [currentDate])
  const monthDays = useMemo(() => getMonthDays(currentDate), [currentDate])

  const headerLabel = useMemo(() => {
    if (viewMode === 'day') {
      return `${DAY_NAMES_FULL[currentDate.getDay()]} ${currentDate.getDate()} de ${MONTH_NAMES[currentDate.getMonth()]}, ${currentDate.getFullYear()}`
    }
    if (viewMode === 'week') {
      const start = weekDays[0]
      const end = weekDays[6]
      if (start.getMonth() === end.getMonth()) {
        return `${start.getDate()} – ${end.getDate()} de ${MONTH_NAMES[start.getMonth()]}, ${start.getFullYear()}`
      }
      return `${start.getDate()} ${MONTH_NAMES[start.getMonth()].slice(0, 3)} – ${end.getDate()} ${MONTH_NAMES[end.getMonth()].slice(0, 3)}, ${end.getFullYear()}`
    }
    return `${MONTH_NAMES[currentDate.getMonth()]} ${currentDate.getFullYear()}`
  }, [viewMode, currentDate, weekDays])

  const AppointmentBlock = ({ apt, compact = false }) => {
    const colorClass = STATUS_COLORS[apt.status] || STATUS_COLORS.PENDIENTE
    const serviceName = apt.services?.length > 1
      ? apt.services.map(s => s.name).join(' + ')
      : (apt.service?.name || apt.serviceId?.name || 'Servicio')

    return (
      <button
        onClick={() => setSelectedAppointment(apt)}
        className={cn(
          "w-full text-left rounded-lg border px-2 py-1 transition-all hover:shadow-md hover:scale-[1.02] cursor-pointer",
          colorClass,
          compact ? "text-[10px]" : "text-xs"
        )}
        aria-label={`Cita: ${apt.clientName} - ${serviceName}`}
        tabIndex={0}
      >
        <div className="font-semibold truncate">{apt.clientName}</div>
        {!compact && (
          <>
            <div className="truncate opacity-80">{serviceName}</div>
            <div className="opacity-70">{formatTime12h(apt.time)}</div>
          </>
        )}
        {compact && <div className="opacity-70">{formatTime12h(apt.time)}</div>}
      </button>
    )
  }

  const WeekView = () => (
    <div className="overflow-x-auto">
      <div className="min-w-[800px]">
        <div className="grid grid-cols-[60px_repeat(7,1fr)] border-b border-gray-200 dark:border-gray-700">
          <div className="p-2" />
          {weekDays.map((day, idx) => {
            const isToday = isSameDay(day, today)
            const dayApts = getAptsForDate(day)
            return (
              <div
                key={idx}
                className={cn(
                  "p-2 text-center border-l border-gray-200 dark:border-gray-700",
                  isToday && "bg-primary-50/50 dark:bg-primary-950/20"
                )}
              >
                <div className="text-xs text-gray-500 dark:text-gray-400">{DAY_NAMES[(idx + 1) % 7]}</div>
                <div className={cn(
                  "text-lg font-bold mt-0.5",
                  isToday
                    ? "text-primary-600 dark:text-primary-400"
                    : "text-gray-900 dark:text-gray-100"
                )}>
                  {day.getDate()}
                </div>
                {dayApts.length > 0 && (
                  <div className="text-[10px] text-gray-500 dark:text-gray-400">{dayApts.length} cita{dayApts.length !== 1 ? 's' : ''}</div>
                )}
              </div>
            )
          })}
        </div>

        <div className="relative max-h-[600px] overflow-y-auto">
          {HOURS.map((hour) => (
            <div key={hour} className="grid grid-cols-[60px_repeat(7,1fr)] border-b border-gray-100 dark:border-gray-800 min-h-[60px]">
              <div className="p-1 text-right pr-2 text-xs text-gray-400 dark:text-gray-500 pt-1">
                {hour === 0 ? '12 AM' : hour < 12 ? `${hour} AM` : hour === 12 ? '12 PM' : `${hour - 12} PM`}
              </div>
              {weekDays.map((day, dayIdx) => {
                const dayApts = getAptsForDate(day)
                const hourApts = dayApts.filter(apt => {
                  const { hours } = parseTime(apt.time)
                  return hours === hour
                })

                return (
                  <div
                    key={dayIdx}
                    className={cn(
                      "border-l border-gray-100 dark:border-gray-800 p-0.5 space-y-0.5",
                      isSameDay(day, today) && "bg-primary-50/30 dark:bg-primary-950/10"
                    )}
                  >
                    {hourApts.map(apt => (
                      <AppointmentBlock key={apt.id || apt._id} apt={apt} />
                    ))}
                  </div>
                )
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  )

  const DayView = () => {
    const dayApts = getAptsForDate(currentDate)

    return (
      <div className="max-h-[600px] overflow-y-auto">
        {HOURS.map((hour) => {
          const hourApts = dayApts.filter(apt => {
            const { hours } = parseTime(apt.time)
            return hours === hour
          })

          return (
            <div key={hour} className="flex border-b border-gray-100 dark:border-gray-800 min-h-[70px]">
              <div className="w-16 flex-shrink-0 p-2 text-right pr-3 text-xs text-gray-400 dark:text-gray-500 pt-2">
                {hour === 0 ? '12 AM' : hour < 12 ? `${hour} AM` : hour === 12 ? '12 PM' : `${hour - 12} PM`}
              </div>
              <div className="flex-1 border-l border-gray-100 dark:border-gray-800 p-1 space-y-1">
                {hourApts.map(apt => (
                  <AppointmentBlock key={apt.id || apt._id} apt={apt} />
                ))}
              </div>
            </div>
          )
        })}
      </div>
    )
  }

  const MonthView = () => (
    <div>
      <div className="grid grid-cols-7 border-b border-gray-200 dark:border-gray-700">
        {['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'].map(d => (
          <div key={d} className="p-2 text-center text-xs font-medium text-gray-500 dark:text-gray-400">{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {monthDays.map(({ date, isCurrentMonth }, idx) => {
          const dayApts = getAptsForDate(date)
          const isToday = isSameDay(date, today)

          return (
            <button
              key={idx}
              onClick={() => {
                setCurrentDate(date)
                if (dayApts.length > 0) {
                  setSelectedDay(date)
                }
              }}
              className={cn(
                "min-h-[80px] p-1 border border-gray-100 dark:border-gray-800 text-left transition-colors hover:bg-gray-50 dark:hover:bg-gray-800/50",
                !isCurrentMonth && "opacity-40"
              )}
              aria-label={`${date.getDate()} de ${MONTH_NAMES[date.getMonth()]}, ${dayApts.length} citas`}
              tabIndex={0}
            >
              <div className={cn(
                "text-sm font-medium mb-1 w-7 h-7 flex items-center justify-center rounded-full",
                isToday && "bg-primary-600 text-white"
              )}>
                {date.getDate()}
              </div>
              <div className="space-y-0.5">
                {dayApts.slice(0, 3).map(apt => (
                  <AppointmentBlock key={apt.id || apt._id} apt={apt} compact />
                ))}
                {dayApts.length > 3 && (
                  <div className="text-[10px] text-gray-500 dark:text-gray-400 px-1">
                    +{dayApts.length - 3} más
                  </div>
                )}
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )

  const AppointmentDetailDialog = () => {
    const apt = selectedAppointment
    if (!apt) return null

    const serviceName = apt.services?.length > 1
      ? apt.services.map(s => s.name).join(' + ')
      : (apt.service?.name || apt.serviceId?.name || 'Servicio')

    return (
      <Dialog open={!!selectedAppointment} onOpenChange={(open) => { if (!open) setSelectedAppointment(null) }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              Detalle de Cita
              <Badge variant={STATUS_BADGE_VARIANT[apt.status] || 'default'}>
                {STATUS_LABELS[apt.status] || apt.status}
              </Badge>
            </DialogTitle>
            <DialogDescription>
              {new Date(apt.date).toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="flex items-start gap-3">
              <User className="w-4 h-4 mt-1 text-gray-400" />
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{apt.clientName}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">{apt.clientEmail}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">{apt.clientPhone}</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Scissors className="w-4 h-4 mt-1 text-gray-400" />
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{serviceName}</p>
                {apt.barber && <p className="text-xs text-gray-500 dark:text-gray-400">con {apt.barber.name}</p>}
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Clock className="w-4 h-4 mt-1 text-gray-400" />
              <p className="text-sm text-gray-900 dark:text-gray-100">{formatTime12h(apt.time)}</p>
            </div>

            {apt.totalAmount && (
              <div className="flex items-start gap-3">
                <CreditCard className="w-4 h-4 mt-1 text-gray-400" />
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100">${apt.totalAmount}</p>
              </div>
            )}

            {apt.notes && (
              <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3">
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Notas</p>
                <p className="text-sm text-gray-700 dark:text-gray-300">{apt.notes}</p>
              </div>
            )}
          </div>

          <div className="flex flex-wrap gap-2 pt-2">
            {apt.status === 'PENDIENTE' && (
              <>
                <Button size="sm" variant="outline" className="text-green-600 border-green-200" onClick={() => { onRespondToBooking?.(apt.id || apt._id, 'IN_PERSON'); setSelectedAppointment(null) }}>
                  En persona
                </Button>
                <Button size="sm" variant="outline" className="text-orange-600 border-orange-200" onClick={() => { onRespondToBooking?.(apt.id || apt._id, 'ONLINE'); setSelectedAppointment(null) }}>
                  Pago online
                </Button>
              </>
            )}
            {apt.status === 'CONFIRMADA' && (
              <Button size="sm" variant="outline" className="text-blue-600 border-blue-200" onClick={() => { onUpdateStatus?.(apt.id || apt._id, 'COMPLETADA'); setSelectedAppointment(null) }}>
                Completar
              </Button>
            )}
            <Button size="sm" variant="outline" onClick={() => { onEdit?.(apt); setSelectedAppointment(null) }}>
              Editar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    )
  }

  const DayDetailDialog = () => {
    if (!selectedDay) return null
    const dayApts = getAptsForDate(selectedDay)

    return (
      <Dialog open={!!selectedDay} onOpenChange={(open) => { if (!open) setSelectedDay(null) }}>
        <DialogContent className="sm:max-w-md max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {selectedDay.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}
            </DialogTitle>
            <DialogDescription>
              {dayApts.length} cita{dayApts.length !== 1 ? 's' : ''} programada{dayApts.length !== 1 ? 's' : ''}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-2">
            {dayApts.map(apt => (
              <AppointmentBlock key={apt.id || apt._id} apt={apt} />
            ))}
          </div>
          <div className="pt-2">
            <Button
              size="sm"
              variant="outline"
              className="w-full"
              onClick={() => { setSelectedDay(null); setViewMode('day'); setCurrentDate(selectedDay) }}
            >
              Ver vista de día completo
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <Card className="overflow-hidden">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/30">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={handlePrev} aria-label="Anterior">
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={handleToday}>Hoy</Button>
          <Button variant="outline" size="icon" onClick={handleNext} aria-label="Siguiente">
            <ChevronRight className="w-4 h-4" />
          </Button>
          <h2 className="text-sm sm:text-base font-semibold text-gray-900 dark:text-gray-100 ml-2">
            {headerLabel}
          </h2>
        </div>
        <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 p-1 rounded-lg">
          {[
            { key: 'day', label: 'Día' },
            { key: 'week', label: 'Semana' },
            { key: 'month', label: 'Mes' },
          ].map(({ key, label }) => (
            <Button
              key={key}
              variant={viewMode === key ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode(key)}
              className={cn("text-xs h-7", viewMode === key && "shadow-sm")}
            >
              {label}
            </Button>
          ))}
        </div>
      </div>

      {viewMode === 'week' && <WeekView />}
      {viewMode === 'day' && <DayView />}
      {viewMode === 'month' && <MonthView />}

      <AppointmentDetailDialog />
      <DayDetailDialog />
    </Card>
  )
}

export default CalendarView
