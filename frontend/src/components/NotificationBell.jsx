'use client'

import { useState, useRef, useEffect } from 'react'
import { useNotifications } from '@/contexts/NotificationContext'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Bell, Check, Trash2, Calendar, CreditCard, RefreshCw, Info } from 'lucide-react'
import { cn } from '@/lib/utils'

const ICON_MAP = {
  booking: Calendar,
  payment: CreditCard,
  status: RefreshCw,
  update: Info,
}

const NotificationBell = () => {
  const { notifications, unreadCount, markAllRead, clearNotifications } = useNotifications()
  const [open, setOpen] = useState(false)
  const panelRef = useRef(null)

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target)) {
        setOpen(false)
      }
    }
    if (open) document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [open])

  const handleToggle = () => {
    setOpen(prev => !prev)
  }

  const handleMarkAllRead = () => {
    markAllRead()
  }

  const handleClear = () => {
    clearNotifications()
    setOpen(false)
  }

  const formatTime = (date) => {
    const d = new Date(date)
    const now = new Date()
    const diffMs = now - d
    const diffMin = Math.floor(diffMs / 60000)
    if (diffMin < 1) return 'Ahora'
    if (diffMin < 60) return `Hace ${diffMin}min`
    const diffH = Math.floor(diffMin / 60)
    if (diffH < 24) return `Hace ${diffH}h`
    return d.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })
  }

  return (
    <div className="relative" ref={panelRef}>
      <Button
        variant="ghost"
        size="icon"
        onClick={handleToggle}
        className="relative"
        aria-label={`Notificaciones${unreadCount > 0 ? `, ${unreadCount} sin leer` : ''}`}
        tabIndex={0}
      >
        <Bell className={cn("w-5 h-5", unreadCount > 0 && "text-primary-600 dark:text-primary-400")} />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white ring-2 ring-white dark:ring-gray-900 animate-in zoom-in-50">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </Button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 sm:w-96 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl z-50 overflow-hidden animate-in fade-in-0 slide-in-from-top-2 duration-200">
          <div className="flex items-center justify-between px-4 py-3 bg-gray-50 dark:bg-gray-800/50">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
              Notificaciones
            </h3>
            <div className="flex items-center gap-1">
              {unreadCount > 0 && (
                <Button variant="ghost" size="sm" onClick={handleMarkAllRead} className="text-xs h-7 px-2">
                  <Check className="w-3.5 h-3.5 mr-1" />
                  Marcar leídas
                </Button>
              )}
              {notifications.length > 0 && (
                <Button variant="ghost" size="sm" onClick={handleClear} className="text-xs h-7 px-2 text-red-600 dark:text-red-400">
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              )}
            </div>
          </div>

          <Separator />

          <div className="max-h-[400px] overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="py-10 text-center">
                <Bell className="w-8 h-8 text-gray-300 dark:text-gray-600 mx-auto mb-2" />
                <p className="text-sm text-gray-500 dark:text-gray-400">Sin notificaciones</p>
              </div>
            ) : (
              notifications.map((n) => {
                const Icon = ICON_MAP[n.type] || Bell
                return (
                  <div
                    key={n.id}
                    className={cn(
                      "flex items-start gap-3 px-4 py-3 border-b border-gray-100 dark:border-gray-800 last:border-0 transition-colors",
                      !n.read && "bg-primary-50/50 dark:bg-primary-950/20"
                    )}
                  >
                    <div className={cn(
                      "flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center mt-0.5",
                      n.type === 'booking' && "bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400",
                      n.type === 'payment' && "bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400",
                      n.type === 'status' && "bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400",
                      n.type === 'update' && "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400",
                    )}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{n.title}</p>
                        {!n.read && <span className="w-2 h-2 rounded-full bg-primary-500 flex-shrink-0" />}
                      </div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 truncate">{n.description}</p>
                      <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-1">{formatTime(n.timestamp)}</p>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default NotificationBell
