'use client'

import { useState, useMemo } from 'react'
import {
  format,
  startOfMonth, endOfMonth, startOfWeek, endOfWeek,
  eachDayOfInterval, isSameMonth, isSameDay, isToday,
  addMonths, subMonths, addWeeks, subWeeks,
  parseISO, getHours, getMinutes,
} from 'date-fns'
import { es } from 'date-fns/locale'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  LayoutGrid,
  List
} from 'lucide-react'
import { formatTime12h } from '@/utils/formatTime'

// ───────── Status helpers ─────────
const STATUS_CONFIG = {
  PENDIENTE:       { label: 'Pendiente',        color: 'bg-amber-400',   badgeVariant: 'warning',   dotClass: 'bg-amber-400' },
  CONFIRMADA:      { label: 'Confirmada',       color: 'bg-emerald-500', badgeVariant: 'success',   dotClass: 'bg-emerald-500' },
  ESPERANDO_PAGO:  { label: 'Esperando pago',   color: 'bg-orange-500',  badgeVariant: 'orange',    dotClass: 'bg-orange-500' },
  COMPLETADA:      { label: 'Completada',       color: 'bg-blue-500',    badgeVariant: 'info',      dotClass: 'bg-blue-500' },
  CANCELADA:       { label: 'Cancelada',        color: 'bg-red-400',     badgeVariant: 'destructive', dotClass: 'bg-red-400' },
  EXPIRADA:        { label: 'Expirada',         color: 'bg-gray-400',    badgeVariant: 'muted',     dotClass: 'bg-gray-400' },
  NO_ASISTIO:      { label: 'No asistió',       color: 'bg-gray-500',    badgeVariant: 'secondary', dotClass: 'bg-gray-500' },
}

function getStatusConfig(status) {
  return STATUS_CONFIG[status] || STATUS_CONFIG.PENDIENTE
}

// ─── Time-slot rows for week view (8am–21pm) ───
const HOUR_SLOTS = Array.from({ length: 14 }, (_, i) => i + 8) // 8,9,...,21

// Parse appointment time (HH:MM) to decimal hour for positioning
function timeToDecimal(time) {
  if (!time) return 8
  const [h, m] = time.split(':').map(Number)
  return h + (m || 0) / 60
}

// ────────────────────────────────────────────────
// MAIN CALENDAR COMPONENT
// ────────────────────────────────────────────────
export default function AppointmentCalendar({
  appointments = [],
  onSelectDate,
  onSelectAppointment,
  selectedDate: controlledSelectedDate,
}) {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [view, setView] = useState('week') // 'month' | 'week'
  const [internalSelectedDate, setInternalSelectedDate] = useState(new Date())
  
  const selectedDate = controlledSelectedDate || internalSelectedDate

  // ─── Navigation ───
  const goNext = () => {
    setCurrentDate(prev => view === 'month' ? addMonths(prev, 1) : addWeeks(prev, 1))
  }
  const goPrev = () => {
    setCurrentDate(prev => view === 'month' ? subMonths(prev, 1) : subWeeks(prev, 1))
  }
  const goToday = () => setCurrentDate(new Date())

  // ─── Compute days ───
  const days = useMemo(() => {
    if (view === 'month') {
      const monthStart = startOfMonth(currentDate)
      const monthEnd = endOfMonth(currentDate)
      const calStart = startOfWeek(monthStart, { locale: es })
      const calEnd = endOfWeek(monthEnd, { locale: es })
      return eachDayOfInterval({ start: calStart, end: calEnd })
    } else {
      const weekStart = startOfWeek(currentDate, { locale: es })
      const weekEnd = endOfWeek(currentDate, { locale: es })
      return eachDayOfInterval({ start: weekStart, end: weekEnd })
    }
  }, [currentDate, view])

  // ─── Group appointments by date string ───
  const appointmentsByDate = useMemo(() => {
    const map = {}
    appointments.forEach(apt => {
      if (!apt.date) return
      const dateStr = typeof apt.date === 'string'
        ? apt.date.split('T')[0]
        : format(new Date(apt.date), 'yyyy-MM-dd')
      if (!map[dateStr]) map[dateStr] = []
      map[dateStr].push(apt)
    })
    // Sort each day's appointments by time
    Object.values(map).forEach(list => list.sort((a, b) => (a.time || '').localeCompare(b.time || '')))
    return map
  }, [appointments])

  const handleDayClick = (day) => {
    setInternalSelectedDate(day)
    onSelectDate?.(day)
  }

  const title = view === 'month'
    ? format(currentDate, 'MMMM yyyy', { locale: es })
    : (() => {
        const ws = startOfWeek(currentDate, { locale: es })
        const we = endOfWeek(currentDate, { locale: es })
        return `${format(ws, "d MMM", { locale: es })} – ${format(we, "d MMM yyyy", { locale: es })}`
      })()

  return (
    <div className="flex flex-col h-full">
      {/* ─── Header / Toolbar ─── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={goPrev}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={goToday}>
            Hoy
          </Button>
          <Button variant="outline" size="sm" onClick={goNext}>
            <ChevronRight className="w-4 h-4" />
          </Button>
          <h2 className="ml-2 text-lg font-semibold text-gray-900 dark:text-gray-100 capitalize">
            {title}
          </h2>
        </div>

        {/* View toggle */}
        <div className="flex items-center bg-gray-100 dark:bg-gray-800 rounded-lg p-1 gap-0.5">
          <button
            onClick={() => setView('week')}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors",
              view === 'week'
                ? "bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm"
                : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
            )}
          >
            <List className="w-4 h-4" />
            Semana
          </button>
          <button
            onClick={() => setView('month')}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors",
              view === 'month'
                ? "bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm"
                : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
            )}
          >
            <LayoutGrid className="w-4 h-4" />
            Mes
          </button>
        </div>
      </div>

      {/* ─── Status legend ─── */}
      <div className="flex flex-wrap gap-3 mb-4">
        {['PENDIENTE','CONFIRMADA','ESPERANDO_PAGO','COMPLETADA','CANCELADA','EXPIRADA'].map(status => {
          const cfg = getStatusConfig(status)
          return (
            <div key={status} className="flex items-center gap-1.5 text-xs text-gray-600 dark:text-gray-400">
              <span className={cn("w-2.5 h-2.5 rounded-full", cfg.dotClass)} />
              {cfg.label}
            </div>
          )
        })}
      </div>

      {/* ─── Calendar body ─── */}
      {view === 'month' ? (
        <MonthView
          days={days}
          currentDate={currentDate}
          selectedDate={selectedDate}
          appointmentsByDate={appointmentsByDate}
          onDayClick={handleDayClick}
          onSelectAppointment={onSelectAppointment}
        />
      ) : (
        <WeekView
          days={days}
          selectedDate={selectedDate}
          appointmentsByDate={appointmentsByDate}
          onDayClick={handleDayClick}
          onSelectAppointment={onSelectAppointment}
        />
      )}
    </div>
  )
}

// ─────────────────────────────────────
// MONTH VIEW
// ─────────────────────────────────────
function MonthView({ days, currentDate, selectedDate, appointmentsByDate, onDayClick, onSelectAppointment }) {
  const dayHeaders = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']

  return (
    <div className="flex-1 overflow-auto">
      {/* Day headers */}
      <div className="grid grid-cols-7 mb-1">
        {dayHeaders.map(d => (
          <div key={d} className="text-center text-xs font-medium text-gray-500 dark:text-gray-400 py-2">
            {d}
          </div>
        ))}
      </div>
      {/* Day cells */}
      <div className="grid grid-cols-7 gap-px bg-gray-200 dark:bg-gray-700 rounded-lg overflow-hidden">
        {days.map(day => {
          const dateStr = format(day, 'yyyy-MM-dd')
          const dayAppts = appointmentsByDate[dateStr] || []
          const inMonth = isSameMonth(day, currentDate)
          const today = isToday(day)
          const selected = isSameDay(day, selectedDate)

          return (
            <div
              key={dateStr}
              onClick={() => onDayClick(day)}
              className={cn(
                "bg-white dark:bg-gray-900 min-h-[90px] p-1.5 cursor-pointer transition-colors",
                !inMonth && "bg-gray-50 dark:bg-gray-900/50",
                selected && "ring-2 ring-inset ring-primary-500",
                "hover:bg-gray-50 dark:hover:bg-gray-800"
              )}
            >
              <div className={cn(
                "flex items-center justify-center w-7 h-7 rounded-full text-sm mb-0.5",
                today && "bg-primary-600 text-white font-bold",
                !today && inMonth && "text-gray-900 dark:text-gray-100",
                !today && !inMonth && "text-gray-400 dark:text-gray-500"
              )}>
                {format(day, 'd')}
              </div>
              {/* Appointment pills */}
              <div className="space-y-0.5">
                {dayAppts.slice(0, 3).map((apt) => {
                  const cfg = getStatusConfig(apt.status)
                  return (
                    <button
                      key={apt.id}
                      onClick={(e) => {
                        e.stopPropagation()
                        onSelectAppointment?.(apt)
                      }}
                      className={cn(
                        "flex items-center gap-1 w-full text-left rounded px-1 py-0.5 text-[10px] leading-tight truncate transition-opacity hover:opacity-80",
                        cfg.color.replace('bg-', 'bg-opacity-20 bg-')
                      )}
                      style={{ backgroundColor: `var(--apt-bg)` }}
                    >
                      <span className={cn("w-1.5 h-1.5 rounded-full flex-shrink-0", cfg.dotClass)} />
                      <span className="truncate text-gray-700 dark:text-gray-300 font-medium">
                        {formatTime12h(apt.time)} {apt.clientName}
                      </span>
                    </button>
                  )
                })}
                {dayAppts.length > 3 && (
                  <p className="text-[10px] text-gray-500 dark:text-gray-400 pl-1">
                    +{dayAppts.length - 3} más
                  </p>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─────────────────────────────────────
// WEEK VIEW (Time-grid)
// ─────────────────────────────────────
function WeekView({ days, selectedDate, appointmentsByDate, onDayClick, onSelectAppointment }) {
  return (
    <div className="flex-1 overflow-auto rounded-lg border border-gray-200 dark:border-gray-700">
      <div className="min-w-[700px]">
        {/* ─ Day headers ─ */}
        <div className="grid grid-cols-[60px_repeat(7,1fr)] sticky top-0 z-10 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
          <div className="border-r border-gray-200 dark:border-gray-700" /> {/* time gutter */}
          {days.map(day => {
            const today = isToday(day)
            const selected = isSameDay(day, selectedDate)
            return (
              <div
                key={day.toISOString()}
                onClick={() => onDayClick(day)}
                className={cn(
                  "px-2 py-3 text-center cursor-pointer border-r border-gray-200 dark:border-gray-700 last:border-r-0 transition-colors",
                  selected && "bg-primary-50 dark:bg-primary-900/20",
                  "hover:bg-gray-50 dark:hover:bg-gray-800"
                )}
              >
                <div className="text-xs text-gray-500 dark:text-gray-400 uppercase">
                  {format(day, 'EEE', { locale: es })}
                </div>
                <div className={cn(
                  "inline-flex items-center justify-center w-8 h-8 rounded-full text-sm font-semibold mt-0.5",
                  today && "bg-primary-600 text-white",
                  !today && "text-gray-900 dark:text-gray-100"
                )}>
                  {format(day, 'd')}
                </div>
              </div>
            )
          })}
        </div>

        {/* ─ Time grid ─ */}
        <div className="relative">
          {HOUR_SLOTS.map(hour => (
            <div key={hour} className="grid grid-cols-[60px_repeat(7,1fr)] border-b border-gray-100 dark:border-gray-800">
              {/* Time label */}
              <div className="border-r border-gray-200 dark:border-gray-700 text-right pr-2 py-1">
                <span className="text-[11px] text-gray-400 dark:text-gray-500 -mt-2 block">
                  {formatTime12h(`${hour.toString().padStart(2, '0')}:00`)}
                </span>
              </div>
              {/* Day columns */}
              {days.map(day => {
                const dateStr = format(day, 'yyyy-MM-dd')
                const dayAppts = appointmentsByDate[dateStr] || []
                // Get appointments for this hour
                const hourAppts = dayAppts.filter(apt => {
                  const decimal = timeToDecimal(apt.time)
                  return Math.floor(decimal) === hour
                })

                return (
                  <div
                    key={`${dateStr}-${hour}`}
                    className="border-r border-gray-100 dark:border-gray-800 last:border-r-0 min-h-[52px] relative px-0.5 py-0.5"
                  >
                    {hourAppts.map(apt => {
                      const cfg = getStatusConfig(apt.status)
                      const duration = apt.service?.duration || apt.totalDuration || 30
                      const heightSlots = Math.max(duration / 60, 0.4) // minimum visual height
                      const minuteOffset = timeToDecimal(apt.time) - hour
                      
                      return (
                        <button
                          key={apt.id}
                          onClick={() => onSelectAppointment?.(apt)}
                          className={cn(
                            "absolute left-0.5 right-0.5 rounded-md px-1.5 py-0.5 text-left transition-all hover:ring-2 hover:ring-primary-300 dark:hover:ring-primary-600 group overflow-hidden z-[1]",
                            apt.status === 'CANCELADA' || apt.status === 'EXPIRADA'
                              ? "opacity-50"
                              : "opacity-95 hover:opacity-100"
                          )}
                          style={{
                            top: `${minuteOffset * 100}%`,
                            minHeight: `${Math.max(heightSlots * 52, 24)}px`,
                            height: `${heightSlots * 52}px`,
                          }}
                        >
                          {/* Color bar on left edge */}
                          <div className={cn("absolute left-0 top-0 bottom-0 w-1 rounded-l-md", cfg.color)} />
                          <div className="pl-2">
                            <p className="text-[11px] font-semibold text-gray-800 dark:text-gray-200 truncate leading-tight">
                              {apt.clientName}
                            </p>
                            <p className="text-[10px] text-gray-500 dark:text-gray-400 truncate leading-tight">
                              {formatTime12h(apt.time)} · {apt.service?.name || 'Servicio'}
                            </p>
                          </div>
                          {/* Subtle background */}
                          <div className={cn("absolute inset-0 rounded-md opacity-10", cfg.color)} />
                        </button>
                      )
                    })}
                  </div>
                )
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
