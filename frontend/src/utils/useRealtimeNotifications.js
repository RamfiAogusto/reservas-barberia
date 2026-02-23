'use client'

import { useEffect } from 'react'
import { toast } from 'sonner'
import { useSocket } from '@/contexts/SocketContext'
import { useNotifications } from '@/contexts/NotificationContext'

export function useRealtimeNotifications() {
  const { on, isConnected } = useSocket()
  const { addNotification } = useNotifications()

  useEffect(() => {
    if (!isConnected) return

    const cleanups = []

    cleanups.push(on('appointment:new', (data) => {
      const { appointment, source } = data
      const title = source === 'public' ? 'Nueva Reserva Online' : 'Nueva Cita'
      const description = `${appointment.clientName} — ${appointment.services?.map(s => s.name).join(' + ') || 'Servicio'} — ${appointment.time || ''}`

      addNotification({
        type: 'booking',
        title,
        description,
        persistent: true,
        playSound: true,
        appointmentId: appointment.id || appointment._id,
        data: appointment,
      })

      toast.info(title, {
        description,
        duration: Infinity,
        action: {
          label: 'Ver citas',
          onClick: () => window.location.href = '/dashboard/appointments',
        },
      })
    }))

    cleanups.push(on('appointment:statusChanged', (data) => {
      const { appointment, newStatus } = data
      const statusConfig = {
        'CONFIRMADA': { type: 'success', label: 'Confirmada' },
        'COMPLETADA': { type: 'success', label: 'Completada' },
        'CANCELADA': { type: 'error', label: 'Cancelada' },
        'ESPERANDO_PAGO': { type: 'warning', label: 'Esperando Pago' },
        'EXPIRADA': { type: 'error', label: 'Expirada' },
        'NO_ASISTIO': { type: 'warning', label: 'No Asistió' },
      }
      const config = statusConfig[newStatus] || { type: 'info', label: newStatus }

      addNotification({
        type: 'status',
        title: `Cita ${config.label}`,
        description: appointment.clientName,
        playSound: false,
      })

      toast[config.type](`Cita ${config.label}`, {
        description: appointment.clientName,
        duration: 5000,
      })
    }))

    cleanups.push(on('appointment:updated', (data) => {
      addNotification({
        type: 'update',
        title: 'Cita Actualizada',
        description: `${data.appointment.clientName} — datos modificados`,
        playSound: false,
      })

      toast.info('Cita Actualizada', {
        description: `${data.appointment.clientName} — datos modificados`,
        duration: 4000,
      })
    }))

    cleanups.push(on('appointment:deleted', (data) => {
      toast.error('Cita Eliminada', {
        description: data.message,
        duration: 4000,
      })
    }))

    cleanups.push(on('appointment:responded', (data) => {
      const { appointment, paymentMode, holdMinutes } = data
      if (paymentMode === 'IN_PERSON') {
        toast.success('Cita Confirmada', {
          description: `${appointment.clientName} — pago en persona`,
          duration: 5000,
        })
      } else {
        toast.warning('Esperando Pago', {
          description: `${appointment.clientName} tiene ${holdMinutes} min para pagar`,
          duration: 8000,
        })
      }
    }))

    cleanups.push(on('appointment:paymentConfirmed', (data) => {
      addNotification({
        type: 'payment',
        title: 'Pago Confirmado',
        description: `${data.appointment.clientName} completó el pago`,
        persistent: true,
        playSound: true,
      })

      toast.success('¡Pago Confirmado!', {
        description: `${data.appointment.clientName} completó el pago`,
        duration: 6000,
      })
    }))

    cleanups.push(on('appointment:holdExpired', (data) => {
      toast.error('Reservas Expiradas', {
        description: `${data.count} reserva(s) expirada(s) por falta de pago`,
        duration: 6000,
      })
    }))

    cleanups.push(on('service:updated', (data) => {
      const actionMap = { created: 'creado', updated: 'actualizado', deleted: 'eliminado' }
      toast.info(`Servicio ${actionMap[data.action] || 'modificado'}`, { duration: 3000 })
    }))

    cleanups.push(on('schedule:updated', () => {
      toast.info('Horarios actualizados', {
        description: 'Los horarios del salón han sido modificados',
        duration: 3000,
      })
    }))

    cleanups.push(on('gallery:updated', () => {
      toast.info('Galería actualizada', { duration: 3000 })
    }))

    cleanups.push(on('barber:updated', () => {
      toast.info('Equipo actualizado', { duration: 3000 })
    }))

    return () => {
      cleanups.forEach(cleanup => cleanup())
    }
  }, [on, isConnected, addNotification])
}
