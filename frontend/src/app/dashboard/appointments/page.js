'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import Link from 'next/link'
import api from '@/utils/api'
import { formatTime12h } from '@/utils/formatTime'
import TimeInput12h from '@/components/TimeInput12h'
import { useSocketEvent } from '@/contexts/SocketContext'
import { toast } from 'sonner'
import AppointmentCalendar from '@/components/AppointmentCalendar'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from '@/components/ui/dialog'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import {
  Loader2, Plus, Pencil, Trash2, Calendar, Check, CreditCard,
  UserCheck, X as XIcon, Filter, RotateCcw, List, CalendarDays,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const STATUS_MAP = {
  PENDIENTE:       { label: 'Pendiente',       variant: 'warning' },
  CONFIRMADA:      { label: 'Confirmada',      variant: 'success' },
  ESPERANDO_PAGO:  { label: 'Esperando pago',  variant: 'orange' },
  COMPLETADA:      { label: 'Completada',      variant: 'info' },
  CANCELADA:       { label: 'Cancelada',       variant: 'destructive' },
  EXPIRADA:        { label: 'Expirada',        variant: 'muted' },
  NO_ASISTIO:      { label: 'No asistió',      variant: 'secondary' },
}
const getStatus = (status) => STATUS_MAP[status] || STATUS_MAP.PENDIENTE

const formatDuration = (minutes) => {
  const h = Math.floor(minutes / 60), m = minutes % 60
  return h > 0 ? (m > 0 ? `${h}h ${m}min` : `${h}h`) : `${m}min`
}

const AppointmentsPage = () => {
  const [appointments, setAppointments] = useState([])
  const [services, setServices] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingAppointment, setEditingAppointment] = useState(null)
  const [viewMode, setViewMode] = useState('list')
  const [filters, setFilters] = useState({ status: '', date: '', startDate: '', endDate: '' })
  const [formData, setFormData] = useState({
    serviceId: '', clientName: '', clientEmail: '', clientPhone: '',
    date: '', time: '', notes: '', staffMember: '', status: 'pendiente', cancelReason: ''
  })
  const [errors, setErrors] = useState({})
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    const handleLoadData = async () => {
      try {
        setLoading(true)
        const servicesResponse = await api.get('/services')
        if (servicesResponse.success) setServices(servicesResponse.data || [])
        await handleLoadAppointments()
      } catch (error) {
        console.error('Error cargando datos:', error)
      } finally {
        setLoading(false)
      }
    }
    handleLoadData()
  }, [])

  const handleLoadAppointments = async () => {
    try {
      const params = new URLSearchParams()
      if (filters.status) params.append('status', filters.status)
      if (filters.date) params.append('date', filters.date)
      if (filters.startDate && filters.endDate) {
        params.append('startDate', filters.startDate)
        params.append('endDate', filters.endDate)
      }
      const response = await api.get(`/appointments?${params.toString()}`)
      if (response.success) setAppointments(response.data)
    } catch (error) {
      console.error('Error cargando citas:', error)
    }
  }

  useEffect(() => {
    if (!loading) handleLoadAppointments()
  }, [filters])

  useSocketEvent('appointment:new', useCallback(() => handleLoadAppointments(), []))
  useSocketEvent('appointment:updated', useCallback((data) => {
    if (data.appointment) {
      setAppointments(prev => prev.map(apt =>
        (apt.id === data.appointment.id) ? { ...apt, ...data.appointment } : apt
      ))
    }
  }, []))
  useSocketEvent('appointment:statusChanged', useCallback((data) => {
    if (data.appointment) {
      setAppointments(prev => prev.map(apt => {
        if (apt.id === data.appointment.id) return { ...apt, ...data.appointment }
        if (apt.groupId && data.appointment.groupId && apt.groupId === data.appointment.groupId) {
          return { ...apt, status: data.newStatus }
        }
        return apt
      }))
    }
  }, []))
  useSocketEvent('appointment:deleted', useCallback((data) => {
    setAppointments(prev => prev.filter(apt => {
      if (apt.id === data.appointmentId) return false
      if (data.groupId && apt.groupId === data.groupId) return false
      return true
    }))
  }, []))
  useSocketEvent('appointment:responded', useCallback((data) => {
    if (data.appointment) {
      const newStatus = data.paymentMode === 'IN_PERSON' ? 'CONFIRMADA' : 'ESPERANDO_PAGO'
      setAppointments(prev => prev.map(apt => {
        if (apt.id === data.appointment.id) {
          return { ...apt, ...data.appointment, status: newStatus, holdExpiresAt: data.holdExpiresAt }
        }
        if (apt.groupId && data.appointment.groupId && apt.groupId === data.appointment.groupId) {
          return { ...apt, status: newStatus, holdExpiresAt: data.holdExpiresAt }
        }
        return apt
      }))
    }
  }, []))
  useSocketEvent('appointment:paymentConfirmed', useCallback((data) => {
    if (data.appointment) {
      setAppointments(prev => prev.map(apt =>
        (apt.id === data.appointment.id) ? { ...apt, ...data.appointment, status: 'CONFIRMADA' } : apt
      ))
    }
  }, []))
  useSocketEvent('appointment:holdExpired', useCallback((data) => {
    if (data.expiredIds) {
      setAppointments(prev => prev.map(apt =>
        data.expiredIds.includes(apt.id) ? { ...apt, status: 'EXPIRADA', holdExpiresAt: null } : apt
      ))
    }
  }, []))

  const sortedAppointments = useMemo(() => {
    return [...appointments].sort((a, b) => {
      const createdA = new Date(a.createdAt || a.created_at || 0)
      const createdB = new Date(b.createdAt || b.created_at || 0)
      return createdB - createdA
    })
  }, [appointments])

  const handleFilterChange = (name, value) => {
    setFilters(prev => ({ ...prev, [name]: value }))
  }

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: '' }))
  }

  const handleValidateForm = () => {
    const newErrors = {}
    if (!formData.serviceId) newErrors.serviceId = 'Debes seleccionar un servicio'
    if (!formData.clientName.trim()) newErrors.clientName = 'El nombre del cliente es requerido'
    if (!formData.clientEmail.trim()) newErrors.clientEmail = 'El email del cliente es requerido'
    else if (!/\S+@\S+\.\S+/.test(formData.clientEmail)) newErrors.clientEmail = 'Email inválido'
    if (!formData.clientPhone.trim()) newErrors.clientPhone = 'El teléfono del cliente es requerido'
    if (!formData.date) newErrors.date = 'La fecha es requerida'
    if (!formData.time) newErrors.time = 'La hora es requerida'
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!handleValidateForm()) return

    try {
      setSubmitting(true)
      let response
      if (editingAppointment) {
        const appointmentId = editingAppointment.id || editingAppointment._id
        const originalStatus = editingAppointment.status
        const newStatus = formData.status
        const appointmentDateStr = editingAppointment.date instanceof Date
          ? editingAppointment.date.toISOString().split('T')[0]
          : editingAppointment.date

        const hasOnlyStatusChanged = (
          originalStatus !== newStatus &&
          editingAppointment.serviceId === formData.serviceId &&
          editingAppointment.clientName === formData.clientName &&
          editingAppointment.clientEmail === formData.clientEmail &&
          editingAppointment.clientPhone === formData.clientPhone &&
          appointmentDateStr === formData.date &&
          editingAppointment.time === formData.time &&
          editingAppointment.notes === formData.notes &&
          editingAppointment.staffMember === formData.staffMember
        )

        if (hasOnlyStatusChanged) {
          response = await api.put(`/appointments/${appointmentId}/status`, { status: newStatus })
        } else {
          response = await api.put(`/appointments/${appointmentId}`, formData)
        }
      } else {
        response = await api.post('/appointments', formData)
      }

      if (response.success) {
        if (editingAppointment) {
          setAppointments(prev => prev.map(appointment =>
            (appointment.id === editingAppointment.id || appointment._id === editingAppointment._id) ? response.data : appointment
          ))
        } else {
          setAppointments(prev => [response.data, ...prev])
        }
        handleCloseModal()
        toast.success(editingAppointment ? 'Cita actualizada' : 'Cita creada exitosamente')
      } else {
        if (response.errors && Array.isArray(response.errors)) {
          const fieldErrors = {}
          response.errors.forEach(err => { fieldErrors[err.path] = err.msg })
          setErrors(fieldErrors)
        } else {
          setErrors({ general: response.message || 'Error al guardar la cita' })
        }
      }
    } catch (error) {
      console.error('Error guardando cita:', error)
      setErrors({ general: 'Error interno del servidor' })
    } finally {
      setSubmitting(false)
    }
  }

  const handleEdit = (appointment) => {
    setEditingAppointment(appointment)
    const appointmentDate = new Date(appointment.date)
    const formattedDate = appointmentDate.toISOString().split('T')[0]
    setFormData({
      serviceId: appointment.serviceId || '',
      clientName: appointment.clientName,
      clientEmail: appointment.clientEmail,
      clientPhone: appointment.clientPhone,
      date: formattedDate,
      time: appointment.time,
      notes: appointment.notes || '',
      staffMember: appointment.staffMember || '',
      status: appointment.status,
      cancelReason: appointment.cancelReason || ''
    })
    setShowModal(true)
  }

  const handleUpdateStatus = async (appointmentId, newStatus) => {
    if (!appointmentId) return
    try {
      const response = await api.put(`/appointments/${appointmentId}/status`, { status: newStatus })
      if (response.success) {
        setAppointments(prev => prev.map(appointment => {
          if (appointment.id === appointmentId || appointment._id === appointmentId) {
            return { ...appointment, status: newStatus }
          }
          return appointment
        }))
        toast.success(`Cita marcada como ${getStatus(newStatus).label}`)
      } else {
        toast.error('Error al actualizar el estado')
      }
    } catch (error) {
      console.error('Error actualizando estado:', error)
      toast.error('Error interno del servidor')
    }
  }

  const handleDelete = async (appointmentId) => {
    try {
      const response = await api.delete(`/appointments/${appointmentId}`)
      if (response.success) {
        setAppointments(prev => prev.filter(appointment => appointment.id !== appointmentId))
        toast.success('Cita eliminada')
      } else {
        toast.error('Error al eliminar la cita')
      }
    } catch (error) {
      console.error('Error eliminando cita:', error)
      toast.error('Error interno del servidor')
    }
  }

  const handleRespondToBooking = async (appointmentId, paymentMode) => {
    try {
      const response = await api.put(`/appointments/${appointmentId}/respond`, { paymentMode })
      if (response.success) {
        const newStatus = paymentMode === 'IN_PERSON' ? 'CONFIRMADA' : 'ESPERANDO_PAGO'
        setAppointments(prev => prev.map(appointment => {
          const matchesId = (appointment.id === appointmentId || appointment._id === appointmentId)
          const matchesGroup = appointment.groupId && response.data?.groupId && appointment.groupId === response.data.groupId
          if (matchesId || matchesGroup) {
            return { ...appointment, status: newStatus, holdExpiresAt: response.data?.holdExpiresAt || null }
          }
          return appointment
        }))
        if (paymentMode === 'IN_PERSON') {
          toast.success('Cita confirmada. El cliente pagará al llegar.')
        } else {
          toast.info(`Reserva temporal. El cliente tiene ${response.data?.holdMinutes || 15} min para pagar.`)
        }
      } else {
        toast.error('Error al responder a la reserva: ' + (response.error || ''))
      }
    } catch (error) {
      console.error('Error respondiendo a reserva:', error)
      toast.error('Error interno del servidor')
    }
  }

  const handleCloseModal = () => {
    setShowModal(false)
    setEditingAppointment(null)
    setFormData({
      serviceId: '', clientName: '', clientEmail: '', clientPhone: '',
      date: '', time: '', notes: '', staffMember: '', status: 'pendiente', cancelReason: ''
    })
    setErrors({})
  }

  const handleClearFilters = () => {
    setFilters({ status: '', date: '', startDate: '', endDate: '' })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <Loader2 className="h-10 w-10 animate-spin text-primary-600 mx-auto" />
          <p className="mt-3 text-sm text-gray-500 dark:text-gray-400">Cargando citas...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Gestión de Citas</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Administra todas tus citas y reservas</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex bg-gray-100 dark:bg-gray-800 p-1 rounded-lg">
            <Button
              variant={viewMode === 'list' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('list')}
              className={cn("gap-1.5", viewMode !== 'list' && "text-gray-600 dark:text-gray-400")}
              aria-label="Vista de lista"
            >
              <List className="w-4 h-4" />
              <span className="hidden sm:inline">Lista</span>
            </Button>
            <Button
              variant={viewMode === 'calendar' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('calendar')}
              className={cn("gap-1.5", viewMode !== 'calendar' && "text-gray-600 dark:text-gray-400")}
              aria-label="Vista de calendario"
            >
              <CalendarDays className="w-4 h-4" />
              <span className="hidden sm:inline">Calendario</span>
            </Button>
          </div>
          <Button onClick={() => { setEditingAppointment(null); setFormData({ serviceId: '', clientName: '', clientEmail: '', clientPhone: '', date: '', time: '', notes: '', staffMember: '', status: 'pendiente', cancelReason: '' }); setErrors({}); setShowModal(true) }}>
            <Plus className="w-4 h-4 mr-2" />
            Nueva Cita
          </Button>
        </div>
      </div>

      {/* Filtros - solo en vista de lista */}
      {viewMode === 'list' && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-wrap items-end gap-4">
              <div className="space-y-2">
                <Label>Estado</Label>
                <Select value={filters.status} onValueChange={(val) => handleFilterChange('status', val)}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Todos los estados" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos los estados</SelectItem>
                    <SelectItem value="PENDIENTE">Pendiente</SelectItem>
                    <SelectItem value="CONFIRMADA">Confirmada</SelectItem>
                    <SelectItem value="ESPERANDO_PAGO">Esperando Pago</SelectItem>
                    <SelectItem value="COMPLETADA">Completada</SelectItem>
                    <SelectItem value="CANCELADA">Cancelada</SelectItem>
                    <SelectItem value="EXPIRADA">Expirada</SelectItem>
                    <SelectItem value="NO_ASISTIO">No asistió</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Fecha específica</Label>
                <Input type="date" name="date" value={filters.date} onChange={(e) => handleFilterChange('date', e.target.value)} className="w-[180px]" />
              </div>
              <div className="space-y-2">
                <Label>Desde</Label>
                <Input type="date" name="startDate" value={filters.startDate} onChange={(e) => handleFilterChange('startDate', e.target.value)} className="w-[180px]" />
              </div>
              <div className="space-y-2">
                <Label>Hasta</Label>
                <Input type="date" name="endDate" value={filters.endDate} onChange={(e) => handleFilterChange('endDate', e.target.value)} className="w-[180px]" />
              </div>
              <Button variant="outline" onClick={handleClearFilters}>
                <RotateCcw className="w-4 h-4 mr-2" />
                Limpiar
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Vista de calendario */}
      {viewMode === 'calendar' && (
        <Card className="overflow-hidden">
          <CardContent className="p-4 sm:p-6">
            <AppointmentCalendar
              appointments={appointments}
              onSelectAppointment={handleEdit}
            />
          </CardContent>
        </Card>
      )}

      {/* Vista de lista */}
      {viewMode === 'list' && (
        <>
          {!appointments || appointments.length === 0 ? (
            <Card>
              <CardContent className="py-16 text-center">
                <Calendar className="w-12 h-12 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">No hay citas</h3>
                <p className="text-gray-500 dark:text-gray-400 mb-6">
                  {Object.values(filters).some(f => f) ? 'No se encontraron citas con los filtros aplicados' : 'Comienza programando tu primera cita'}
                </p>
                <Button onClick={() => { setEditingAppointment(null); setErrors({}); setShowModal(true) }}>
                  <Plus className="w-4 h-4 mr-2" />
                  Programar primera cita
                </Button>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Citas programadas ({sortedAppointments.length})</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Cliente</TableHead>
                      <TableHead>Servicio</TableHead>
                      <TableHead>Fecha y Hora</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead>Monto</TableHead>
                      <TableHead className="text-right">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sortedAppointments.map((appointment) => {
                      const st = getStatus(appointment.status)
                      return (
                        <TableRow key={appointment.id || appointment._id}>
                          <TableCell>
                            <div className="font-medium text-gray-900 dark:text-gray-100">{appointment.clientName}</div>
                            <div className="text-sm text-gray-500 dark:text-gray-400">{appointment.clientEmail}</div>
                            <div className="text-sm text-gray-500 dark:text-gray-400">{appointment.clientPhone}</div>
                          </TableCell>
                          <TableCell>
                            <div className="text-sm text-gray-900 dark:text-gray-100">
                              {appointment.services && appointment.services.length > 1 ? (
                                <div>
                                  <div className="font-medium">{appointment.services.map(s => s.name).join(' + ')}</div>
                                  <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                                    {appointment.services.map(s => `${s.name} ($${s.price})`).join(' · ')}
                                  </div>
                                  <div className="text-xs text-emerald-600 dark:text-emerald-400 mt-0.5">
                                    {appointment.appointmentCount} servicios · {formatDuration(appointment.totalDuration)}
                                  </div>
                                </div>
                              ) : (
                                appointment.service?.name || appointment.serviceId?.name
                              )}
                            </div>
                            {appointment.barber && <div className="text-sm text-gray-500 dark:text-gray-400">con {appointment.barber.name}</div>}
                            {!appointment.barber && appointment.staffMember && <div className="text-sm text-gray-500 dark:text-gray-400">con {appointment.staffMember}</div>}
                          </TableCell>
                          <TableCell>
                            <div className="text-sm text-gray-900 dark:text-gray-100">{new Date(appointment.date).toLocaleDateString('es-ES')}</div>
                            <div className="text-sm text-gray-500 dark:text-gray-400">{formatTime12h(appointment.time)}</div>
                          </TableCell>
                          <TableCell>
                            <Badge variant={st.variant}>{st.label}</Badge>
                            {appointment.status === 'ESPERANDO_PAGO' && appointment.holdExpiresAt && (
                              <div className="text-xs text-orange-600 dark:text-orange-400 mt-1">
                                Expira: {new Date(appointment.holdExpiresAt).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
                              </div>
                            )}
                          </TableCell>
                          <TableCell className="font-medium text-gray-900 dark:text-gray-100">${appointment.totalAmount}</TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-1">
                              {appointment.status === 'PENDIENTE' && (
                                <>
                                  <Button variant="ghost" size="sm" className="text-xs text-green-600 hover:text-green-700 dark:text-green-400" onClick={() => handleRespondToBooking(appointment.id || appointment._id, 'IN_PERSON')} title="Pago en persona">
                                    <UserCheck className="w-3.5 h-3.5 mr-1" />En persona
                                  </Button>
                                  <Button variant="ghost" size="sm" className="text-xs text-orange-600 hover:text-orange-700 dark:text-orange-400" onClick={() => handleRespondToBooking(appointment.id || appointment._id, 'ONLINE')} title="Pago online">
                                    <CreditCard className="w-3.5 h-3.5 mr-1" />Online
                                  </Button>
                                </>
                              )}
                              {appointment.status === 'ESPERANDO_PAGO' && (
                                <Button variant="ghost" size="sm" className="text-xs text-green-600 dark:text-green-400" onClick={() => handleUpdateStatus(appointment.id || appointment._id, 'CONFIRMADA')}>
                                  <Check className="w-3.5 h-3.5 mr-1" />Confirmar
                                </Button>
                              )}
                              {appointment.status === 'CONFIRMADA' && (
                                <Button variant="ghost" size="sm" className="text-xs text-blue-600 dark:text-blue-400" onClick={() => handleUpdateStatus(appointment.id || appointment._id, 'COMPLETADA')}>
                                  <Check className="w-3.5 h-3.5 mr-1" />Completar
                                </Button>
                              )}
                              <Button variant="ghost" size="icon" onClick={() => handleEdit(appointment)} aria-label="Editar cita">
                                <Pencil className="w-4 h-4" />
                              </Button>
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button variant="ghost" size="icon" className="text-red-600 hover:text-red-700 dark:text-red-400" aria-label="Eliminar cita">
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>¿Eliminar cita?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      Esta acción no se puede deshacer. Se eliminará la cita de {appointment.clientName}.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                    <AlertDialogAction onClick={() => handleDelete(appointment.id || appointment._id)} className="bg-red-600 hover:bg-red-700 text-white">
                                      Eliminar
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </div>
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </>
      )}

      {/* Modal de crear/editar cita */}
      <Dialog open={showModal} onOpenChange={(open) => { if (!open) handleCloseModal() }}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingAppointment ? 'Editar Cita' : 'Nueva Cita'}</DialogTitle>
            <DialogDescription>
              {editingAppointment ? 'Modifica los datos de la cita' : 'Programa una nueva cita'}
            </DialogDescription>
          </DialogHeader>

          {errors.general && (
            <div className="p-3 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-700 dark:text-red-400">
              {errors.general}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Servicio *</Label>
              <Select value={formData.serviceId} onValueChange={(val) => { setFormData(prev => ({ ...prev, serviceId: val })); if (errors.serviceId) setErrors(prev => ({ ...prev, serviceId: '' })) }}>
                <SelectTrigger className={errors.serviceId ? 'border-red-500' : ''}>
                  <SelectValue placeholder="Seleccionar servicio" />
                </SelectTrigger>
                <SelectContent>
                  {services.map((service) => (
                    <SelectItem key={service.id || service._id} value={service.id || service._id}>
                      {service.name} - ${service.price} ({service.formattedDuration || formatDuration(service.duration)})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.serviceId && <p className="text-sm text-red-600 dark:text-red-400">{errors.serviceId}</p>}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="apt-clientName">Nombre del Cliente *</Label>
                <Input id="apt-clientName" name="clientName" value={formData.clientName} onChange={handleInputChange} placeholder="Nombre completo" className={errors.clientName ? 'border-red-500' : ''} />
                {errors.clientName && <p className="text-sm text-red-600 dark:text-red-400">{errors.clientName}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="apt-clientEmail">Email *</Label>
                <Input id="apt-clientEmail" name="clientEmail" type="email" value={formData.clientEmail} onChange={handleInputChange} placeholder="correo@ejemplo.com" className={errors.clientEmail ? 'border-red-500' : ''} />
                {errors.clientEmail && <p className="text-sm text-red-600 dark:text-red-400">{errors.clientEmail}</p>}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="apt-clientPhone">Teléfono *</Label>
                <Input id="apt-clientPhone" name="clientPhone" type="tel" value={formData.clientPhone} onChange={handleInputChange} placeholder="+1234567890" className={errors.clientPhone ? 'border-red-500' : ''} />
                {errors.clientPhone && <p className="text-sm text-red-600 dark:text-red-400">{errors.clientPhone}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="apt-staffMember">Estilista (opcional)</Label>
                <Input id="apt-staffMember" name="staffMember" value={formData.staffMember} onChange={handleInputChange} placeholder="Nombre del estilista" />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="apt-date">Fecha *</Label>
                <Input id="apt-date" name="date" type="date" value={formData.date} onChange={handleInputChange} min={new Date().toISOString().split('T')[0]} className={errors.date ? 'border-red-500' : ''} />
                {errors.date && <p className="text-sm text-red-600 dark:text-red-400">{errors.date}</p>}
              </div>
              <div className="space-y-2">
                <Label>Hora *</Label>
                <TimeInput12h
                  value={formData.time}
                  onChange={(val) => setFormData(prev => ({ ...prev, time: val }))}
                  className={`w-full border rounded-lg dark:bg-gray-800 dark:text-gray-100 ${errors.time ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'}`}
                  aria-label="Hora de la cita"
                />
                {errors.time && <p className="text-sm text-red-600 dark:text-red-400">{errors.time}</p>}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="apt-notes">Notas</Label>
                <Textarea id="apt-notes" name="notes" value={formData.notes} onChange={handleInputChange} rows={3} placeholder="Notas adicionales" />
              </div>
              {editingAppointment && (
                <div className="space-y-2">
                  <Label>Estado de la Cita</Label>
                  <Select value={formData.status} onValueChange={(val) => setFormData(prev => ({ ...prev, status: val }))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="PENDIENTE">Pendiente</SelectItem>
                      <SelectItem value="CONFIRMADA">Confirmada</SelectItem>
                      <SelectItem value="ESPERANDO_PAGO">Esperando Pago</SelectItem>
                      <SelectItem value="COMPLETADA">Completada</SelectItem>
                      <SelectItem value="CANCELADA">Cancelada</SelectItem>
                      <SelectItem value="EXPIRADA">Expirada</SelectItem>
                      <SelectItem value="NO_ASISTIO">No asistió</SelectItem>
                    </SelectContent>
                  </Select>
                  {formData.status === 'CANCELADA' && <p className="text-xs text-amber-600 dark:text-amber-400">Se enviará email de cancelación al cliente</p>}
                  {formData.status === 'ESPERANDO_PAGO' && <p className="text-xs text-orange-600 dark:text-orange-400">El cliente debe pagar para confirmar</p>}
                </div>
              )}
            </div>

            {editingAppointment && formData.status === 'CANCELADA' && (
              <div className="space-y-2">
                <Label htmlFor="apt-cancelReason">Razón de Cancelación (opcional)</Label>
                <Input id="apt-cancelReason" name="cancelReason" value={formData.cancelReason || ''} onChange={handleInputChange} placeholder="Ej: Cliente canceló, Emergencia, etc." />
              </div>
            )}

            <DialogFooter className="pt-4">
              <Button type="button" variant="outline" onClick={handleCloseModal}>Cancelar</Button>
              <Button type="submit" disabled={submitting}>
                {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {editingAppointment ? 'Actualizar Cita' : 'Crear Cita'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default AppointmentsPage
