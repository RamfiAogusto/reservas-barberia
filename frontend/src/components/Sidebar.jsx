'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import {
  LayoutDashboard, Scissors, Calendar, Clock, Image, Users,
  Settings, ExternalLink, LogOut, Menu, ChevronLeft, Copy, BookOpen,
} from 'lucide-react'

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Citas', href: '/dashboard/appointments', icon: Calendar },
  { name: 'Servicios', href: '/dashboard/services', icon: Scissors },
  { name: 'Horarios', href: '/dashboard/schedules', icon: Clock },
  { name: 'Galería', href: '/dashboard/gallery', icon: Image },
  { name: 'Barberos', href: '/dashboard/barbers', icon: Users },
  { name: 'Configuración', href: '/dashboard/settings', icon: Settings },
  { name: 'Guía', href: '/dashboard/guide', icon: BookOpen },
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

  const NavItem = ({ item, onClick }) => {
    const active = isActive(item.href)
    const linkContent = (
      <Link
        href={item.href}
        onClick={onClick}
        className={cn(
          "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150",
          active
            ? "bg-primary-50 text-primary-700 dark:bg-primary-900/30 dark:text-primary-400"
            : "text-gray-600 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-200",
          collapsed && "justify-center px-2"
        )}
      >
        <item.icon className={cn("w-5 h-5 flex-shrink-0", active && "text-primary-600 dark:text-primary-400")} />
        {!collapsed && <span>{item.name}</span>}
      </Link>
    )

    if (!collapsed) return linkContent

    return (
      <Tooltip>
        <TooltipTrigger asChild>
          {linkContent}
        </TooltipTrigger>
        <TooltipContent side="right">
          {item.name}
        </TooltipContent>
      </Tooltip>
    )
  }

  const SidebarContent = ({ isMobile = false }) => (
    <div className="flex flex-col h-full">
      <div className={cn(
        "flex items-center gap-3 px-4 py-5",
        collapsed && !isMobile && "justify-center px-2"
      )}>
        <div className="w-9 h-9 rounded-lg bg-primary-600 flex items-center justify-center flex-shrink-0">
          <Scissors className="w-5 h-5 text-white" />
        </div>
        {(!collapsed || isMobile) && (
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

      <Separator />

      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        <TooltipProvider delayDuration={0}>
          {navigation.map((item) => (
            <NavItem
              key={item.name}
              item={item}
              onClick={isMobile ? () => setMobileOpen(false) : undefined}
            />
          ))}
        </TooltipProvider>
      </nav>

      <Separator />

      <div className={cn(
        "px-3 py-4 space-y-1",
        collapsed && !isMobile && "px-2"
      )}>
        {(!collapsed || isMobile) && (
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
              aria-label="Copiar link del perfil"
              tabIndex={0}
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
            collapsed && !isMobile && "justify-center px-2"
          )}
          title={collapsed && !isMobile ? "Cerrar sesión" : undefined}
          aria-label="Cerrar sesión"
          tabIndex={0}
        >
          <LogOut className="w-4 h-4" />
          {(!collapsed || isMobile) && <span>Cerrar sesión</span>}
        </button>
      </div>

      {!isMobile && (
        <div className="hidden lg:flex px-3 pb-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setCollapsed(!collapsed)}
            className="w-full"
            aria-label={collapsed ? 'Expandir sidebar' : 'Colapsar sidebar'}
          >
            <ChevronLeft className={cn("w-4 h-4 transition-transform", collapsed && "rotate-180")} />
          </Button>
        </div>
      )}
    </div>
  )

  return (
    <>
      {/* Mobile toggle */}
      <Button
        variant="outline"
        size="icon"
        onClick={() => setMobileOpen(true)}
        className="lg:hidden fixed top-4 left-4 z-50"
        aria-label="Abrir menú"
      >
        <Menu className="w-5 h-5" />
      </Button>

      {/* Mobile Sheet */}
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="p-0 w-72">
          <SheetHeader className="sr-only">
            <SheetTitle>Menú de navegación</SheetTitle>
          </SheetHeader>
          <SidebarContent isMobile />
        </SheetContent>
      </Sheet>

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
