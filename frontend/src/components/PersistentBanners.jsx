'use client'

import { useNotifications } from '@/contexts/NotificationContext'
import { Button } from '@/components/ui/button'
import { X, Calendar, CreditCard, Bell } from 'lucide-react'
import { cn } from '@/lib/utils'
import Link from 'next/link'

const BANNER_STYLES = {
  booking: {
    bg: 'bg-blue-50 dark:bg-blue-950/40 border-blue-200 dark:border-blue-800',
    icon: Calendar,
    iconClass: 'text-blue-600 dark:text-blue-400',
    textClass: 'text-blue-800 dark:text-blue-200',
  },
  payment: {
    bg: 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800',
    icon: CreditCard,
    iconClass: 'text-emerald-600 dark:text-emerald-400',
    textClass: 'text-emerald-800 dark:text-emerald-200',
  },
  default: {
    bg: 'bg-primary-50 dark:bg-primary-950/40 border-primary-200 dark:border-primary-800',
    icon: Bell,
    iconClass: 'text-primary-600 dark:text-primary-400',
    textClass: 'text-primary-800 dark:text-primary-200',
  },
}

const PersistentBanners = () => {
  const { persistentBanners, dismissBanner, dismissAllBanners } = useNotifications()

  if (persistentBanners.length === 0) return null

  return (
    <div className="space-y-2 mb-4 animate-in slide-in-from-top-2 duration-300">
      {persistentBanners.length > 1 && (
        <div className="flex justify-end">
          <Button
            variant="ghost"
            size="sm"
            onClick={dismissAllBanners}
            className="text-xs h-7 text-gray-500 dark:text-gray-400"
          >
            Descartar todas ({persistentBanners.length})
          </Button>
        </div>
      )}
      {persistentBanners.map((banner) => {
        const style = BANNER_STYLES[banner.type] || BANNER_STYLES.default
        const Icon = style.icon

        return (
          <div
            key={banner.id}
            className={cn(
              "flex items-center gap-3 px-4 py-3 border rounded-xl animate-in slide-in-from-top-1 duration-300",
              style.bg
            )}
            role="alert"
          >
            <div className={cn("flex-shrink-0", style.iconClass)}>
              <Icon className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <p className={cn("text-sm font-semibold", style.textClass)}>{banner.title}</p>
              <p className={cn("text-xs mt-0.5 opacity-80", style.textClass)}>{banner.description}</p>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              {banner.type === 'booking' && (
                <Link href="/dashboard/appointments">
                  <Button size="sm" variant="outline" className="h-7 text-xs border-current/20">
                    Ver cita
                  </Button>
                </Link>
              )}
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => dismissBanner(banner.id)}
                aria-label="Descartar notificación"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )
      })}
    </div>
  )
}

export default PersistentBanners
