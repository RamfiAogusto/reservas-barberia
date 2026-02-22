'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard,
  Scissors,
  Calendar,
  Clock,
  Image,
  Users,
  Settings,
  ExternalLink,
  LogOut,
  Menu,
  X,
  ChevronLeft,
  Copy,
} from 'lucide-react'

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Citas', href: '/dashboard/appointments', icon: Calendar },
  { name: 'Servicios', href: '/dashboard/services', icon: Scissors },
  { name: 'Horarios', href: '/dashboard/schedules', icon: Clock },
  { name: 'Galería', href: '/dashboard/gallery', icon: Image },
  { name: 'Barberos', href: '/dashboard/barbers', icon: Users },
  { name: 'Configuración', href: '/dashboard/settings', icon: Settings },
]

export default function Sidebar({ user, onLogout }) {
  const pathname = usePathname()
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [copied, setCopied] = useState(false)

  const handleCopyLink = () => {
    const profileUrl = `${window.location.origin}/${user?.username}`
    navigator.clipboard.writeText(profileUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const isActive = (href) => {
    if (href === '/dashboard') return pathname === '/dashboard'
    return pathname.startsWith(href)
  }

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Logo / Salon Name */}
      <div className={cn(
        "flex items-center gap-3 px-4 py-5 border-b border-gray-200 dark:border-gray-700/50",
        collapsed && "justify-center px-2"
      )}>
        <div className="w-9 h-9 rounded-lg bg-primary-600 flex items-center justify-center flex-shrink-0">
          <Scissors className="w-5 h-5 text-white" />
        </div>
        {!collapsed && (
          <div className="min-w-0 flex-1">
            <h2 className="text-sm font-bold text-gray-900 dark:text-white truncate">
              {user?.salonName || 'Mi Barbería'}
            </h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
              @{user?.username}
            </p>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {navigation.map((item) => {
          const active = isActive(item.href)
          return (
            <Link
              key={item.name}
              href={item.href}
              onClick={() => setMobileOpen(false)}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150",
                active
                  ? "bg-primary-50 text-primary-700 dark:bg-primary-900/30 dark:text-primary-400"
                  : "text-gray-600 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-200",
                collapsed && "justify-center px-2"
              )}
              title={collapsed ? item.name : undefined}
            >
              <item.icon className={cn("w-5 h-5 flex-shrink-0", active && "text-primary-600 dark:text-primary-400")} />
              {!collapsed && <span>{item.name}</span>}
            </Link>
          )
        })}
      </nav>

      {/* Profile Link + Actions */}
      <div className={cn(
        "px-3 py-4 border-t border-gray-200 dark:border-gray-700/50 space-y-2",
        collapsed && "px-2"
      )}>
        {!collapsed && (
          <>
            <Link
              href={`/${user?.username}`}
              target="_blank"
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800 transition-colors"
            >
              <ExternalLink className="w-4 h-4" />
              <span>Ver perfil público</span>
            </Link>
            <button
              onClick={handleCopyLink}
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800 transition-colors w-full text-left"
            >
              <Copy className="w-4 h-4" />
              <span>{copied ? '¡Copiado!' : 'Copiar link'}</span>
            </button>
          </>
        )}
        <button
          onClick={onLogout}
          className={cn(
            "flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20 transition-colors w-full",
            collapsed && "justify-center px-2"
          )}
          title={collapsed ? "Cerrar sesión" : undefined}
        >
          <LogOut className="w-4 h-4" />
          {!collapsed && <span>Cerrar sesión</span>}
        </button>
      </div>

      {/* Collapse button - desktop only */}
      <div className="hidden lg:flex px-3 pb-4">
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="flex items-center justify-center w-full py-2 rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
        >
          <ChevronLeft className={cn("w-4 h-4 transition-transform", collapsed && "rotate-180")} />
        </button>
      </div>
    </div>
  )

  return (
    <>
      {/* Mobile toggle */}
      <button
        onClick={() => setMobileOpen(true)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 rounded-lg bg-white dark:bg-gray-800 shadow-md border border-gray-200 dark:border-gray-700"
      >
        <Menu className="w-5 h-5 text-gray-700 dark:text-gray-300" />
      </button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50">
          <div className="fixed inset-0 bg-black/50" onClick={() => setMobileOpen(false)} />
          <div className="fixed inset-y-0 left-0 w-72 bg-white dark:bg-gray-900 shadow-xl z-50">
            <button
              onClick={() => setMobileOpen(false)}
              className="absolute top-4 right-4 p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
            <SidebarContent />
          </div>
        </div>
      )}

      {/* Desktop sidebar */}
      <aside className={cn(
        "hidden lg:flex lg:flex-col lg:fixed lg:inset-y-0 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 transition-all duration-200 z-40",
        collapsed ? "lg:w-[72px]" : "lg:w-64"
      )}>
        <SidebarContent />
      </aside>
    </>
  )
}
