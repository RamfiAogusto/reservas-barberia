'use client'

import { useState, useMemo } from 'react'
import {
  format,
  startOfMonth, endOfMonth, startOfWeek, endOfWeek,
  eachDayOfInterval, isSameMonth, isSameDay, isToday,
  addMonths, subMonths, addWeeks, subWeeks,
} from 'date-fns'
import { es } from 'date-fns/locale'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  ChevronLeft,
  ChevronRight,
  LayoutGrid,
  List,
} from 'lucide-react'
import { formatTime12h } from '@/utils/formatTime'

// ───────── Status helpers ─────────
const STATUS_CONFIG = {
  PENDIENTE:       { label: 'Pendiente',        color: 'bg-amber-400',   dotClass: 'bg-amber-400' },
  CONFIRMADA:      { label: 'Confirmada',       color: 'bg-emerald-500', dotClass: 'bg-emerald-500' },
  ESPERANDO_PAGO:  { label: 'Esperando pago',   color: 'bg-orange-500',  dotClass: 'bg-orange-500' },
  COMPLETADA:      { label: 'Completada',       color: 'bg-blue-500',    dotClass: 'bg-blue-500' },
  CANCELADA:       { label: 'Cancelada',        color: 'bg-red-400',     dotClass: 'bg-red-400' },
  EXPIRADA:        { label: 'Expirada',         color: 'bg-gray-400',    dotClass: 'bg-gray-400' },
  NO_ASISTIO:      { label: 'No asistió',       color: 'bg-gray-500',    dotClass: 'bg-gray-500' },
}

function getStatusConfig(status) {
  return STATUS_CONFIG[status] || STATUS_CONFIG.PENDIENTE
}

// ─── Stable barber color palette ───
const BARBER_COLORS = [
  { bg: 'bg-violet-100 dark:bg-violet-900/30', border: 'border-violet-400 dark:border-violet-500', text: 'text-violet-700 dark:text-violet-300', dot: 'bg-violet-500', stripe: 'bg-violet-500' },
  { bg: 'bg-sky-100 dark:bg-sky-900/30', border: 'border-sky-400 dark:border-sky-500', text: 'text-sky-700 dark:text-sky-300', dot: 'bg-sky-500', stripe: 'bg-sky-500' },
  { bg: 'bg-rose-100 dark:bg-rose-900/30', border: 'border-rose-400 dark:border-rose-500', text: 'text-rose-700 dark:text-rose-300', dot: 'bg-rose-500', stripe: 'bg-rose-500' },
  { bg: 'bg-teal-100 dark:bg-teal-900/30', border: 'border-teal-400 dark:border-teal-500', text: 'text-teal-700 dark:text-teal-300', dot: 'bg-teal-500', stripe: 'bg-teal-500' },
  { bg: 'bg-amber-100 dark:bg-amber-900/30', border: 'border-amber-400 dark:border-amber-500', text: 'text-amber-700 dark:text-amber-300', dot: 'bg-amber-500', stripe: 'bg-amber-500' },
  { bg: 'bg-fuchsia-100 dark:bg-fuchsia-900/30', border: 'border-fuchsia-400 dark:border-fuchsia-500', text: 'text-fuchsia-700 dark:text-fuchsia-300', dot: 'bg-fuchsia-500', stripe: 'bg-fuchsia-500' },
]

function getBarberInitials(name) {
  if (!name) return '?'
  const parts = name.trim().split(/\s+/)
  return parts.length > 1
    ? (parts[0][0] + parts[1][0]).toUpperCase()
    : name.slice(0, 2).toUpperCase()
}

// ─── Time-slot rows for week view (8am–21pm) ───
const HOUR_SLOTS = Array.from({ length: 14 }, (_, i) => i + 8)

function timeToDecimal(time) {
  if (!time) return 8
  const [h, m] = time.split(':').map(Number)
  return h + (m || 0) / 60
}

// Compute side-by-side columns for overlapping appointments in a single hour cell
function computeColumns(appts) {
  if (appts.length <= 1) return appts.map(a => ({ ...a, _col: 0, _totalCols: 1 }))
  const sorted = [...appts].sort((a, b) =>
    (a.time || '').localeCompare(b.time || '') || (a.barber?.id || '').localeCompare(b.barber?.id || '')
  )
  const barberIds = [...new Set(sorted.map(a => a.barber?.id || 'none'))]
  const totalCols = barberIds.length
  return sorted.map(a => ({
    ...a,
    _col: barberIds.indexOf(a.barber?.id || 'none'),
    _totalCols: totalCols,
  }))
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
  const [view, setView] = useState('week')
  const [internalSelectedDate, setInternalSelectedDate] = useState(new Date())

  const selectedDate = controlledSelectedDate || internalSelectedDate

  const goNext = () => setCurrentDate(prev => view === 'month' ? addMonths(prev, 1) : addWeeks(prev, 1))
  const goPrev = () => setCurrentDate(prev => view === 'month' ? subMonths(prev, 1) : subWeeks(prev, 1))
  const goToday = () => setCurrentDate(new Date())

  const days = useMemo(() => {
    if (view === 'month') {
      const calStart = startOfWeek(startOfMonth(currentDate), { locale: es })
      const calEnd = endOfWeek(endOfMonth(currentDate), { locale: es })
      return eachDayOfInterval({ start: calStart, end: calEnd })
    }
    const weekStart = startOfWeek(currentDate, { locale: es })
    const weekEnd = endOfWeek(currentDate, { locale: es })
    return eachDayOfInterval({ start: weekStart, end: weekEnd })
  }, [currentDate, view])

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
    Object.values(map).forEach(list =>
      list.sort((a, b) => (a.time || '').localeCompare(b.time || ''))
    )
    return map
  }, [appointments])

  // Build stable barber→color map from all visible appointments
  const barberColorMap = useMemo(() => {
    const map = {}
    const seen = []
    appointments.forEach(apt => {
      const id = apt.barber?.id
      if (id && !map[id]) {
        map[id] = BARBER_COLORS[seen.length % BARBER_COLORS.length]
        seen.push(id)
      }
    })
    return map
  }, [appointments])

  // Build barber legend entries
  const barberLegend = useMemo(() => {
    const entries = []
    const seen = new Set()
    appointments.forEach(apt => {
      const id = apt.barber?.id
      const name = apt.barber?.name
      if (id && !seen.has(id)) {
        seen.add(id)
        entries.push({ id, name, color: barberColorMap[id] })
      }
    })
    return entries
  }, [appointments, barberColorMap])

  const handleDayClick = (day) => {
    setInternalSelectedDate(day)
    onSelectDate?.(day)
  }

  const title = view === 'month'
    ? format(currentDate, 'MMMM yyyy', { locale: es })
    : (() => {
        const ws = startOfWeek(currentDate, { locale: es })
        const we = endOfWeek(currentDate, { locale: es })
        return `${format(ws, 'd MMM', { locale: es })} – ${format(we, 'd MMM yyyy', { locale: es })}`
      })()

  return (
    <div className="flex flex-col h-full">
      {/* ─── Header / Toolbar ─── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={goPrev}><ChevronLeft className="w-4 h-4" /></Button>
          <Button variant="outline" size="sm" onClick={goToday}>Hoy</Button>
          <Button variant="outline" size="sm" onClick={goNext}><ChevronRight className="w-4 h-4" /></Button>
          <h2 className="ml-2 text-lg font-semibold text-gray-900 dark:text-gray-100 capitalize">{title}</h2>
        </div>
        <div className="flex items-center bg-gray-100 dark:bg-gray-800 rounded-lg p-1 gap-0.5">
          <button onClick={() => setView('week')}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors',
              view === 'week'
                ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
            )}>
            <List className="w-4 h-4" />Semana
          </button>
          <button onClick={() => setView('month')}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors',
              view === 'month'
                ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
            )}>
            <LayoutGrid className="w-4 h-4" />Mes
          </button>
        </div>
      </div>

      {/* ─── Legends: Status + Barbers ─── */}
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2 mb-4">
        {/* Status legend */}
        <div className="flex flex-wrap gap-3">
          {['PENDIENTE', 'CONFIRMADA', 'ESPERANDO_PAGO', 'COMPLETADA', 'CANCELADA'].map(status => {
            const cfg = getStatusConfig(status)
            return (
              <div key={status} className="flex items-center gap-1.5 text-xs text-gray-600 dark:text-gray-400">
                <span className={cn('w-2.5 h-2.5 rounded-full', cfg.dotClass)} />
                {cfg.label}
              </div>
            )
          })}
        </div>
        {/* Barber legend — only when multiple barbers */}
        {barberLegend.length > 1 && (
          <>
            <div className="w-px h-4 bg-gray-300 dark:bg-gray-600 hidden sm:block" />
            <div className="flex flex-wrap gap-2">
              {barberLegend.map(b => (
                <div key={b.id} className="flex items-center gap-1.5 text-xs font-medium">
                  <span className={cn('w-3 h-3 rounded', b.color.dot)} />
                  <span className={b.color.text}>{b.name}</span>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* ─── Calendar body ─── */}
      {view === 'month' ? (
        <MonthView
          days={days} currentDate={currentDate} selectedDate={selectedDate}
          appointmentsByDate={appointmentsByDate} barberColorMap={barberColorMap}
          onDayClick={handleDayClick} onSelectAppointment={onSelectAppointment}
        />
      ) : (
        <WeekView
          days={days} selectedDate={selectedDate}
          appointmentsByDate={appointmentsByDate} barberColorMap={barberColorMap}
          onDayClick={handleDayClick} onSelectAppointment={onSelectAppointment}
        />
      )}
    </div>
  )
}


// ─────────────────────────────────────
// MONTH VIEW
// ─────────────────────────────────────
function MonthView({ days, currentDate, selectedDate, appointmentsByDate, barberColorMap, onDayClick, onSelectAppointment }) {
  const dayHeaders = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']
  const hasMultipleBarbers = Object.keys(barberColorMap).length > 1

  return (
    <div className="flex-1 overflow-auto">
      <div className="grid grid-cols-7 mb-1">
        {dayHeaders.map(d => (
          <div key={d} className="text-center text-xs font-medium text-gray-500 dark:text-gray-400 py-2">{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-px bg-gray-200 dark:bg-gray-700 rounded-lg overflow-hidden">
        {days.map(day => {
          const dateStr = format(day, 'yyyy-MM-dd')
          const dayAppts = appointmentsByDate[dateStr] || []
          const inMonth = isSameMonth(day, currentDate)
          const today = isToday(day)
          const selected = isSameDay(day, selectedDate)

          return (
            <div key={dateStr} onClick={() => onDayClick(day)}
              className={cn(
                'bg-white dark:bg-gray-900 min-h-[90px] p-1.5 cursor-pointer transition-colors',
                !inMonth && 'bg-gray-50 dark:bg-gray-900/50',
                selected && 'ring-2 ring-inset ring-primary-500',
                'hover:bg-gray-50 dark:hover:bg-gray-800'
              )}>
              <div className={cn(
                'flex items-center justify-center w-7 h-7 rounded-full text-sm mb-0.5',
                today && 'bg-primary-600 text-white font-bold',
                !today && inMonth && 'text-gray-900 dark:text-gray-100',
                !today && !inMonth && 'text-gray-400 dark:text-gray-500'
              )}>{format(day, 'd')}</div>
              <div className="space-y-0.5">
                {dayAppts.slice(0, 3).map(apt => {
                  const stCfg = getStatusConfig(apt.status)
                  const bColor = apt.barber?.id ? barberColorMap[apt.barber.id] : null
                  return (
                    <button key={apt.id}
                      onClick={(e) => { e.stopPropagation(); onSelectAppointment?.(apt) }}
                      className={cn(
                        'flex items-center gap-1 w-full text-left rounded px-1 py-0.5 text-[10px] leading-tight truncate transition-opacity hover:opacity-80',
                        bColor ? bColor.bg : 'bg-gray-100 dark:bg-gray-800'
                      )}>
                      <span className={cn('w-1.5 h-1.5 rounded-full flex-shrink-0', stCfg.dotClass)} />
                      {hasMultipleBarbers && bColor && (
                        <span className={cn(
                          'w-3.5 h-3.5 rounded flex-shrink-0 flex items-center justify-center text-[8px] font-bold text-white',
                          bColor.stripe
                        )}>
                          {getBarberInitials(apt.barber?.name)}
                        </span>
                      )}
                      <span className="truncate text-gray-700 dark:text-gray-300 font-medium">
                        {formatTime12h(apt.time)} {apt.clientName}
                      </span>
                    </button>
                  )
                })}
                {dayAppts.length > 3 && (
                  <p className="text-[10px] text-gray-500 dark:text-gray-400 pl-1">+{dayAppts.length - 3} más</p>
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
function WeekView({ days, selectedDate, appointmentsByDate, barberColorMap, onDayClick, onSelectAppointment }) {
  const hasMultipleBarbers = Object.keys(barberColorMap).length > 1

  return (
    <div className="flex-1 overflow-auto rounded-lg border border-gray-200 dark:border-gray-700">
      <div className="min-w-[700px]">
        {/* Day headers */}
        <div className="grid grid-cols-[60px_repeat(7,1fr)] sticky top-0 z-10 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
          <div className="border-r border-gray-200 dark:border-gray-700" />
          {days.map(day => {
            const today = isToday(day)
            const selected = isSameDay(day, selectedDate)
            return (
              <div key={day.toISOString()} onClick={() => onDayClick(day)}
                className={cn(
                  'px-2 py-3 text-center cursor-pointer border-r border-gray-200 dark:border-gray-700 last:border-r-0 transition-colors',
                  selected && 'bg-primary-50 dark:bg-primary-900/20',
                  'hover:bg-gray-50 dark:hover:bg-gray-800'
                )}>
                <div className="text-xs text-gray-500 dark:text-gray-400 uppercase">
                  {format(day, 'EEE', { locale: es })}
                </div>
                <div className={cn(
                  'inline-flex items-center justify-center w-8 h-8 rounded-full text-sm font-semibold mt-0.5',
                  today && 'bg-primary-600 text-white',
                  !today && 'text-gray-900 dark:text-gray-100'
                )}>{format(day, 'd')}</div>
              </div>
            )
          })}
        </div>

        {/* Time grid */}
        <div className="relative">
          {HOUR_SLOTS.map(hour => (
            <div key={hour} className="grid grid-cols-[60px_repeat(7,1fr)] border-b border-gray-100 dark:border-gray-800">
              <div className="border-r border-gray-200 dark:border-gray-700 text-right pr-2 py-1">
                <span className="text-[11px] text-gray-400 dark:text-gray-500 -mt-2 block">
                  {formatTime12h(`${hour.toString().padStart(2, '0')}:00`)}
                </span>
              </div>
              {days.map(day => {
                const dateStr = format(day, 'yyyy-MM-dd')
                const dayAppts = appointmentsByDate[dateStr] || []
                const hourAppts = dayAppts.filter(apt => Math.floor(timeToDecimal(apt.time)) === hour)
                const positioned = computeColumns(hourAppts)

                return (
                  <div key={`${dateStr}-${hour}`}
                    className="border-r border-gray-100 dark:border-gray-800 last:border-r-0 min-h-[52px] relative">
                    {positioned.map(apt => {
                      const stCfg = getStatusConfig(apt.status)
                      const bColor = apt.barber?.id ? barberColorMap[apt.barber.id] : null
                      const duration = apt.service?.duration || apt.totalDuration || 30
                      const heightSlots = Math.max(duration / 60, 0.4)
                      const minuteOffset = timeToDecimal(apt.time) - hour

                      // Column positioning for overlapping appointments
                      const colWidth = 100 / apt._totalCols
                      const leftPct = apt._col * colWidth
                      const isOverlap = apt._totalCols > 1

                      return (
                        <button key={apt.id}
                          onClick={() => onSelectAppointment?.(apt)}
                          title={`${apt.clientName} — ${apt.barber?.name || 'Sin barbero'} — ${apt.service?.name || 'Servicio'}`}
                          className={cn(
                            'absolute rounded-md text-left transition-all overflow-hidden z-[1]',
                            'hover:ring-2 hover:ring-primary-400 dark:hover:ring-primary-500 hover:z-10',
                            bColor
                              ? cn(bColor.bg, 'border', bColor.border)
                              : 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700',
                            (apt.status === 'CANCELADA' || apt.status === 'EXPIRADA') && 'opacity-40',
                          )}
                          style={{
                            top: `${minuteOffset * 100}%`,
                            left: `${leftPct}%`,
                            width: `${colWidth}%`,
                            minHeight: `${Math.max(heightSlots * 52, 28)}px`,
                            height: `${heightSlots * 52}px`,
                            padding: isOverlap ? '2px 3px' : '2px 4px',
                          }}>
                          {/* Left status stripe */}
                          <div className={cn('absolute left-0 top-0 bottom-0 w-1 rounded-l-md', stCfg.color)} />
                          {/* Content */}
                          <div className="pl-2 flex flex-col justify-start h-full min-w-0">
                            <div className="flex items-center gap-1 min-w-0">
                              {hasMultipleBarbers && bColor && (
                                <span className={cn(
                                  'flex-shrink-0 w-4 h-4 rounded text-[8px] font-bold text-white flex items-center justify-center leading-none',
                                  bColor.stripe
                                )}>
                                  {getBarberInitials(apt.barber?.name)}
                                </span>
                              )}
                              <p className="text-[11px] font-semibold text-gray-800 dark:text-gray-200 truncate leading-tight">
                                {apt.clientName}
                              </p>
                            </div>
                            <p className="text-[10px] text-gray-500 dark:text-gray-400 truncate leading-tight">
                              {formatTime12h(apt.time)}{!isOverlap && ` · ${apt.service?.name || 'Servicio'}`}
                            </p>
                            {!isOverlap && hasMultipleBarbers && apt.barber?.name && (
                              <p className="text-[9px] text-gray-400 dark:text-gray-500 truncate leading-tight">
                                {apt.barber.name}
                              </p>
                            )}
                          </div>
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
