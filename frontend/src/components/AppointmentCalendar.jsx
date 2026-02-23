'use client'

import { useState, useMemo } from 'react'
import {
  format,
  startOfMonth, endOfMonth, startOfWeek, endOfWeek,
  eachDayOfInterval, isSameMonth, isSameDay, isToday,
  addMonths, subMonths, addWeeks, subWeeks, addDays, subDays,
} from 'date-fns'
import { es } from 'date-fns/locale'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  ChevronLeft,
  ChevronRight,
  LayoutGrid,
  List,
  CalendarDays,
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

function computeOverlapColumns(appointments) {
  if (appointments.length === 0) return []

  const sorted = [...appointments].sort((a, b) =>
    timeToDecimal(a.time) - timeToDecimal(b.time)
  )

  const withRange = sorted.map(apt => {
    const start = timeToDecimal(apt.time)
    const duration = (apt.service?.duration || apt.totalDuration || 30) / 60
    return { ...apt, _start: start, _end: start + duration, _col: 0, _totalCols: 1 }
  })

  const groups = []
  let currentGroup = [withRange[0]]
  let groupEnd = withRange[0]._end

  for (let i = 1; i < withRange.length; i++) {
    if (withRange[i]._start < groupEnd) {
      currentGroup.push(withRange[i])
      groupEnd = Math.max(groupEnd, withRange[i]._end)
    } else {
      groups.push(currentGroup)
      currentGroup = [withRange[i]]
      groupEnd = withRange[i]._end
    }
  }
  groups.push(currentGroup)

  groups.forEach(group => {
    const columns = []
    group.forEach(apt => {
      let placed = false
      for (let col = 0; col < columns.length; col++) {
        const lastInCol = columns[col][columns[col].length - 1]
        if (lastInCol._end <= apt._start) {
          columns[col].push(apt)
          apt._col = col
          placed = true
          break
        }
      }
      if (!placed) {
        apt._col = columns.length
        columns.push([apt])
      }
    })
    const totalCols = columns.length
    group.forEach(apt => { apt._totalCols = totalCols })
  })

  return withRange
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

  const goNext = () => setCurrentDate(prev =>
    view === 'month' ? addMonths(prev, 1) : view === 'week' ? addWeeks(prev, 1) : addDays(prev, 1)
  )
  const goPrev = () => setCurrentDate(prev =>
    view === 'month' ? subMonths(prev, 1) : view === 'week' ? subWeeks(prev, 1) : subDays(prev, 1)
  )
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
    // Switch to day view when clicking a specific day
    if (view !== 'day') {
      setCurrentDate(day)
      setView('day')
    }
  }

  const title = view === 'month'
    ? format(currentDate, 'MMMM yyyy', { locale: es })
    : view === 'week'
      ? (() => {
          const ws = startOfWeek(currentDate, { locale: es })
          const we = endOfWeek(currentDate, { locale: es })
          return `${format(ws, 'd MMM', { locale: es })} – ${format(we, 'd MMM yyyy', { locale: es })}`
        })()
      : format(currentDate, "EEEE d 'de' MMMM yyyy", { locale: es })

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
          <button onClick={() => setView('day')}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors',
              view === 'day'
                ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
            )}>
            <CalendarDays className="w-4 h-4" />Día
          </button>
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
      ) : view === 'week' ? (
        <WeekView
          days={days} selectedDate={selectedDate}
          appointmentsByDate={appointmentsByDate} barberColorMap={barberColorMap}
          onDayClick={handleDayClick} onSelectAppointment={onSelectAppointment}
        />
      ) : (
        <DayView
          date={currentDate}
          appointmentsByDate={appointmentsByDate}
          barberColorMap={barberColorMap}
          barberLegend={barberLegend}
          onSelectAppointment={onSelectAppointment}
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
  const ROW_HEIGHT = 52
  const FIRST_HOUR = HOUR_SLOTS[0]
  const totalHeight = HOUR_SLOTS.length * ROW_HEIGHT

  const dayPositioned = useMemo(() => {
    const result = {}
    days.forEach(day => {
      const dateStr = format(day, 'yyyy-MM-dd')
      const dayAppts = appointmentsByDate[dateStr] || []
      result[dateStr] = computeOverlapColumns(dayAppts)
    })
    return result
  }, [days, appointmentsByDate])

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

        {/* Time grid with appointment overlay */}
        <div className="relative" style={{ height: totalHeight }}>
          {/* Hour grid lines (background) */}
          {HOUR_SLOTS.map((hour, idx) => (
            <div
              key={hour}
              className="absolute w-full grid grid-cols-[60px_repeat(7,1fr)] border-b border-gray-100 dark:border-gray-800"
              style={{ top: idx * ROW_HEIGHT, height: ROW_HEIGHT }}
            >
              <div className="border-r border-gray-200 dark:border-gray-700 text-right pr-2 py-1">
                <span className="text-[11px] text-gray-400 dark:text-gray-500 -mt-2 block">
                  {formatTime12h(`${hour.toString().padStart(2, '0')}:00`)}
                </span>
              </div>
              {days.map(day => (
                <div
                  key={`${format(day, 'yyyy-MM-dd')}-${hour}`}
                  className="border-r border-gray-100 dark:border-gray-800 last:border-r-0"
                />
              ))}
            </div>
          ))}

          {/* Appointment overlay */}
          <div className="absolute inset-0 grid grid-cols-[60px_repeat(7,1fr)] pointer-events-none">
            <div />
            {days.map(day => {
              const dateStr = format(day, 'yyyy-MM-dd')
              const positioned = dayPositioned[dateStr] || []

              return (
                <div key={dateStr} className="relative pointer-events-auto">
                  {positioned.map(apt => {
                    const stCfg = getStatusConfig(apt.status)
                    const bColor = apt.barber?.id ? barberColorMap[apt.barber.id] : null
                    const duration = apt.service?.duration || apt.totalDuration || 30
                    const topPx = (apt._start - FIRST_HOUR) * ROW_HEIGHT
                    const heightPx = Math.max((duration / 60) * ROW_HEIGHT, 24)
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
                          top: `${topPx}px`,
                          height: `${heightPx}px`,
                          left: `${leftPct}%`,
                          width: `${colWidth}%`,
                          padding: isOverlap ? '2px 3px' : '2px 4px',
                        }}>
                        <div className={cn('absolute left-0 top-0 bottom-0 w-1 rounded-l-md', stCfg.color)} />
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
        </div>
      </div>
    </div>
  )
}


// ─────────────────────────────────────
// DAY VIEW (one column per barber)
// ─────────────────────────────────────
function DayView({ date, appointmentsByDate, barberColorMap, barberLegend, onSelectAppointment }) {
  const dateStr = format(date, 'yyyy-MM-dd')
  const dayAppts = appointmentsByDate[dateStr] || []

  const barbers = barberLegend.length > 0
    ? barberLegend
    : [{ id: '_all', name: 'Citas', color: BARBER_COLORS[0] }]

  const barberCount = barbers.length

  const apptsByBarber = useMemo(() => {
    const map = {}
    barbers.forEach(b => { map[b.id] = [] })
    dayAppts.forEach(apt => {
      const bid = apt.barber?.id || '_all'
      if (!map[bid]) map[bid] = []
      map[bid].push(apt)
    })
    return map
  }, [dayAppts, barbers])

  const positionedByBarber = useMemo(() => {
    const result = {}
    barbers.forEach(b => {
      result[b.id] = computeOverlapColumns(apptsByBarber[b.id] || [])
    })
    return result
  }, [apptsByBarber, barbers])

  const ROW_H = 64
  const FIRST_HOUR = HOUR_SLOTS[0]
  const totalHeight = HOUR_SLOTS.length * ROW_H

  return (
    <div className="flex-1 overflow-auto rounded-lg border border-gray-200 dark:border-gray-700">
      <div className="min-w-[400px]">
        <div
          className="grid sticky top-0 z-10 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700"
          style={{ gridTemplateColumns: `60px repeat(${barberCount}, 1fr)` }}
        >
          <div className="border-r border-gray-200 dark:border-gray-700" />
          {barbers.map(b => {
            const bColor = barberColorMap[b.id] || BARBER_COLORS[0]
            return (
              <div key={b.id}
                className={cn(
                  'px-3 py-3 text-center border-r border-gray-200 dark:border-gray-700 last:border-r-0',
                  bColor.bg
                )}>
                <div className="flex items-center justify-center gap-2">
                  <span className={cn('w-3 h-3 rounded-full flex-shrink-0', bColor.dot)} />
                  <span className={cn('text-sm font-semibold', bColor.text)}>{b.name}</span>
                </div>
                <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">
                  {(apptsByBarber[b.id] || []).length} cita{(apptsByBarber[b.id] || []).length !== 1 ? 's' : ''}
                </p>
              </div>
            )
          })}
        </div>

        <div className="relative" style={{ height: totalHeight }}>
          {/* Hour grid lines */}
          {HOUR_SLOTS.map((hour, idx) => (
            <div
              key={hour}
              className="absolute w-full grid border-b border-gray-100 dark:border-gray-800"
              style={{ top: idx * ROW_H, height: ROW_H, gridTemplateColumns: `60px repeat(${barberCount}, 1fr)` }}
            >
              <div className="border-r border-gray-200 dark:border-gray-700 text-right pr-2 py-1">
                <span className="text-[11px] text-gray-400 dark:text-gray-500 -mt-2 block">
                  {formatTime12h(`${hour.toString().padStart(2, '0')}:00`)}
                </span>
              </div>
              {barbers.map(b => (
                <div key={`${b.id}-${hour}`} className="border-r border-gray-100 dark:border-gray-800 last:border-r-0" />
              ))}
            </div>
          ))}

          {/* Appointment overlay */}
          <div
            className="absolute inset-0 grid pointer-events-none"
            style={{ gridTemplateColumns: `60px repeat(${barberCount}, 1fr)` }}
          >
            <div />
            {barbers.map(b => {
              const positioned = positionedByBarber[b.id] || []
              const bColor = barberColorMap[b.id] || BARBER_COLORS[0]

              return (
                <div key={b.id} className="relative pointer-events-auto">
                  {positioned.map(apt => {
                    const stCfg = getStatusConfig(apt.status)
                    const duration = apt.service?.duration || apt.totalDuration || 30
                    const topPx = (apt._start - FIRST_HOUR) * ROW_H
                    const heightPx = Math.max((duration / 60) * ROW_H, 28)
                    const colWidth = 100 / apt._totalCols
                    const leftPct = apt._col * colWidth

                    return (
                      <button key={apt.id}
                        onClick={() => onSelectAppointment?.(apt)}
                        title={`${apt.clientName} — ${apt.service?.name || 'Servicio'}`}
                        className={cn(
                          'absolute rounded-lg text-left transition-all overflow-hidden z-[1]',
                          'hover:ring-2 hover:ring-primary-400 dark:hover:ring-primary-500 hover:z-10',
                          bColor.bg, 'border', bColor.border,
                          (apt.status === 'CANCELADA' || apt.status === 'EXPIRADA') && 'opacity-40',
                        )}
                        style={{
                          top: `${topPx}px`,
                          height: `${heightPx}px`,
                          left: `calc(${leftPct}% + 2px)`,
                          width: `calc(${colWidth}% - 4px)`,
                        }}>
                        <div className={cn('absolute left-0 top-0 bottom-0 w-1.5 rounded-l-lg', stCfg.color)} />
                        <div className="pl-3 pr-2 py-1 flex flex-col justify-start h-full min-w-0">
                          <p className="text-sm font-semibold text-gray-800 dark:text-gray-200 truncate leading-tight">
                            {apt.clientName}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400 truncate leading-tight mt-0.5">
                            {formatTime12h(apt.time)} · {apt.service?.name || 'Servicio'}
                          </p>
                          {duration >= 45 && (
                            <p className="text-[10px] text-gray-400 dark:text-gray-500 truncate leading-tight mt-0.5">
                              {stCfg.label} · {duration} min
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
        </div>
      </div>
    </div>
  )
}
