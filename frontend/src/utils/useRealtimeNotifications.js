'use client'

import { useEffect } from 'react'
import { toast } from 'sonner'
import { useSocket } from '@/contexts/SocketContext'

/**
 * Hook global de notificaciones en tiempo real.
 * Escucha TODOS los eventos WebSocket relevantes y muestra toasts.
 * Debe usarse en el layout del dashboard.
 */
export function useRealtimeNotifications() {
  const { on, isConnected } = useSocket()

  useEffect(() => {
    if (!isConnected) return

    const cleanups = []

    // === CITAS ===

    // Nueva cita (desde público o dashboard)
    cleanups.push(on('appointment:new', (data) => {
      const { appointment, source } = data
      const icon = source === 'public' ? '🔔' : '📋'
      const title = source === 'public' ? 'Nueva Reserva Online' : 'Nueva Cita'
      
      toast.info(title, {
        description: `${icon} ${appointment.clientName} — ${appointment.services?.map(s => s.name).join(' + ') || 'Servicio'} — ${appointment.time || ''}`,
        duration: 8000,
        action: {
          label: 'Ver citas',
          onClick: () => window.location.href = '/dashboard/appointments'
        }
      })
    }))

    // Estado de cita cambiado
    cleanups.push(on('appointment:statusChanged', (data) => {
      const { appointment, newStatus } = data
      const statusConfig = {
        'CONFIRMADA': { type: 'success', icon: '✅', label: 'Confirmada' },
        'COMPLETADA': { type: 'success', icon: '🎉', label: 'Completada' },
        'CANCELADA': { type: 'error', icon: '❌', label: 'Cancelada' },
        'ESPERANDO_PAGO': { type: 'warning', icon: '⏳', label: 'Esperando Pago' },
        'EXPIRADA': { type: 'error', icon: '⏰', label: 'Expirada' },
        'NO_ASISTIO': { type: 'warning', icon: '👻', label: 'No Asistió' },
      }
      const config = statusConfig[newStatus] || { type: 'info', icon: '📋', label: newStatus }
      
      toast[config.type](`Cita ${config.label}`, {
        description: `${config.icon} ${appointment.clientName}`,
        duration: 5000,
      })
    }))

    // Cita actualizada (datos)
    cleanups.push(on('appointment:updated', (data) => {
      toast.info('Cita Actualizada', {
        description: `📝 ${data.appointment.clientName} — datos modificados`,
        duration: 4000,
      })
    }))

    // Cita eliminada
    cleanups.push(on('appointment:deleted', (data) => {
      toast.error('Cita Eliminada', {
        description: `🗑️ ${data.message}`,
        duration: 4000,
      })
    }))

    // Barbero respondió a reserva
    cleanups.push(on('appointment:responded', (data) => {
      const { appointment, paymentMode, holdMinutes } = data
      if (paymentMode === 'IN_PERSON') {
        toast.success('Cita Confirmada', {
          description: `✅ ${appointment.clientName} — pago en persona`,
          duration: 5000,
        })
      } else {
        toast.warning('Esperando Pago', {
          description: `💳 ${appointment.clientName} tiene ${holdMinutes} min para pagar`,
          duration: 8000,
        })
      }
    }))

    // Pago confirmado
    cleanups.push(on('appointment:paymentConfirmed', (data) => {
      toast.success('¡Pago Confirmado!', {
        description: `💳 ${data.appointment.clientName} completó el pago`,
        duration: 6000,
      })
    }))

    // Reservas expiradas
    cleanups.push(on('appointment:holdExpired', (data) => {
      toast.error('Reservas Expiradas', {
        description: `⏰ ${data.count} reserva(s) expirada(s) por falta de pago`,
        duration: 6000,
      })
    }))

    // === SERVICIOS ===
    cleanups.push(on('service:updated', (data) => {
      const actionMap = { created: 'creado', updated: 'actualizado', deleted: 'eliminado' }
      toast.info(`Servicio ${actionMap[data.action] || 'modificado'}`, {
        duration: 3000,
      })
    }))

    // === HORARIOS ===
    cleanups.push(on('schedule:updated', (data) => {
      toast.info('Horarios actualizados', {
        description: '📅 Los horarios del salón han sido modificados',
        duration: 3000,
      })
    }))

    // === GALERÍA ===
    cleanups.push(on('gallery:updated', (data) => {
      toast.info('Galería actualizada', {
        description: '🖼️ Se modificó la galería del salón',
        duration: 3000,
      })
    }))

    // === BARBEROS ===
    cleanups.push(on('barber:updated', (data) => {
      toast.info('Equipo actualizado', {
        description: '💈 Se modificó el equipo del salón',
        duration: 3000,
      })
    }))

    return () => {
      cleanups.forEach(cleanup => cleanup())
    }
  }, [on, isConnected])
}
