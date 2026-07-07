'use client'

import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { formatTime12h } from '@/utils/formatTime'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  CalendarCheck2, Clock, DollarSign, X, Check, Ban, CreditCard,
  UserCircle, Mail, Phone, Scissors, AlertCircle, Pencil,
} from 'lucide-react'

// ─── Status config (shared with dashboard) ───
export const APPOINTMENT_STATUS_MAP = {
  PENDIENTE:       { label: 'Pendiente',       variant: 'warning',     icon: Clock },
  CONFIRMADA:      { label: 'Confirmada',      variant: 'success',     icon: CalendarCheck2 },
  ESPERANDO_PAGO:  { label: 'Esperando pago',  variant: 'orange',      icon: CreditCard },
  COMPLETADA:      { label: 'Completada',      variant: 'info',        icon: Check },
  CANCELADA:       { label: 'Cancelada',       variant: 'destructive', icon: Ban },
  EXPIRADA:        { label: 'Expirada',        variant: 'muted',       icon: AlertCircle },
  NO_ASISTIO:      { label: 'No asistió',      variant: 'secondary',   icon: Ban },
}

export function getAppointmentStatus(status) {
  return APPOINTMENT_STATUS_MAP[status] || APPOINTMENT_STATUS_MAP.PENDIENTE
}

function formatDuration(minutes) {
  if (!minutes) return ''
  const h = Math.floor(minutes / 60), m = minutes % 60
  return h > 0 ? (m > 0 ? `${h}h ${m}min` : `${h}h`) : `${m}min`
}

/**
 * Read-only appointment detail card with quick actions.
 *
 * Props:
 * - appointment: the appointment to display (required)
 * - onClose: () => void — hides the card
 * - onUpdateStatus: (id, status) => void — completar/cancelar
 * - onRespond: (id, 'CONFIRMAR' | 'RECHAZAR') => void — respond to pending booking
 * - onEdit: (appointment) => void — optional; shows an "Editar" action when provided
 * - actionLoading: boolean — disables action buttons while a request is in flight
 */
export default function AppointmentDetailCard({
  appointment,
  onClose,
  onUpdateStatus,
  onRespond,
  onEdit,
  actionLoading = false,
}) {
  const stCfg = getAppointmentStatus(appointment.status)
  const StatusIcon = stCfg.icon
  const aptDate = new Date(appointment.date)

  return (
    <Card>
      <CardHeader className="pb-3 flex flex-row items-start justify-between space-y-0">
        <div>
          <CardTitle className="text-base">Detalle de cita</CardTitle>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 capitalize">
            {format(aptDate, "EEEE d 'de' MMMM", { locale: es })}
          </p>
        </div>
        <button
          onClick={onClose}
          aria-label="Cerrar detalle de cita"
          className="p-1 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
        >
          <X className="w-4 h-4 text-gray-500 dark:text-gray-400" />
        </button>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-2">
          <Badge variant={stCfg.variant} className="flex items-center gap-1"><StatusIcon className="w-3 h-3" />{stCfg.label}</Badge>
          {appointment.paymentMethod === 'PASARELA' && (
            <Badge variant="info" className="flex items-center gap-1 text-[11px]"><CreditCard className="w-3 h-3" />Pago online</Badge>
          )}
        </div>

        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm"><UserCircle className="w-4 h-4 text-gray-400" /><span className="font-medium text-gray-900 dark:text-gray-100">{appointment.clientName}</span></div>
          <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300"><Mail className="w-4 h-4 text-gray-400" /><span className="truncate">{appointment.clientEmail}</span></div>
          <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300"><Phone className="w-4 h-4 text-gray-400" /><span>{appointment.clientPhone}</span></div>
        </div>

        <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-3 space-y-1.5">
          <div className="flex items-center gap-2 text-sm"><Scissors className="w-4 h-4 text-gray-400" /><span className="font-medium text-gray-900 dark:text-gray-100">{appointment.service?.name || 'Servicio'}</span></div>
          <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
            <Clock className="w-4 h-4 text-gray-400" /><span>{formatTime12h(appointment.time)}</span>
            {appointment.service?.duration && <span className="text-gray-500 dark:text-gray-400">· {formatDuration(appointment.service.duration)}</span>}
          </div>
          {appointment.barber?.name && (
            <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300"><UserCircle className="w-4 h-4 text-gray-400" /><span>Barbero: {appointment.barber.name}</span></div>
          )}
          {(appointment.totalAmount || appointment.service?.price) && (
            <div className="flex items-center gap-2 text-sm"><DollarSign className="w-4 h-4 text-gray-400" /><span className="font-semibold text-gray-900 dark:text-gray-100">${appointment.totalAmount || appointment.service?.price}</span></div>
          )}
        </div>

        {appointment.notes && (
          <div className="text-sm text-gray-600 dark:text-gray-300 bg-gray-50 dark:bg-gray-800/50 rounded-lg p-3">
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Notas</p>{appointment.notes}
          </div>
        )}

        <div className="pt-2 border-t border-gray-100 dark:border-gray-800 space-y-2">
          {appointment.status === 'PENDIENTE' && (
            <>
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Responder reserva:</p>
              <div className="grid grid-cols-2 gap-2">
                <Button size="sm" onClick={() => onRespond?.(appointment.id, 'CONFIRMAR')} disabled={actionLoading} className="text-xs"><Check className="w-3.5 h-3.5 mr-1" />Confirmar</Button>
                <Button size="sm" variant="destructive" onClick={() => onRespond?.(appointment.id, 'RECHAZAR')} disabled={actionLoading} className="text-xs"><Ban className="w-3.5 h-3.5 mr-1" />Rechazar</Button>
              </div>
            </>
          )}
          {appointment.status === 'CONFIRMADA' && (
            <div className="grid grid-cols-2 gap-2">
              <Button size="sm" onClick={() => onUpdateStatus?.(appointment.id, 'COMPLETADA')} disabled={actionLoading} className="text-xs"><Check className="w-3.5 h-3.5 mr-1" />Completar</Button>
              <Button size="sm" variant="destructive" onClick={() => onUpdateStatus?.(appointment.id, 'CANCELADA')} disabled={actionLoading} className="text-xs"><Ban className="w-3.5 h-3.5 mr-1" />Cancelar</Button>
            </div>
          )}
          {appointment.status === 'ESPERANDO_PAGO' && (
            <div className="text-center py-2">
              <div className="inline-flex items-center gap-1.5 text-sm text-orange-600 dark:text-orange-400"><CreditCard className="w-4 h-4 animate-pulse" />Esperando confirmación de pago...</div>
              {appointment.holdExpiresAt && <p className="text-xs text-gray-500 mt-1">Expira: {format(new Date(appointment.holdExpiresAt), 'HH:mm')}</p>}
            </div>
          )}
          {onEdit && (
            <Button size="sm" variant="outline" onClick={() => onEdit(appointment)} disabled={actionLoading} className="w-full text-xs">
              <Pencil className="w-3.5 h-3.5 mr-1" />Editar cita
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
