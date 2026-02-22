'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import api from '@/utils/api'
import { formatTime12h } from '@/utils/formatTime'
import TimeInput12h from '@/components/TimeInput12h'

const AppointmentsPage = () => {
  const router = useRouter()
  const [appointments, setAppointments] = useState([])
  const [services, setServices] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingAppointment, setEditingAppointment] = useState(null)
  const [filters, setFilters] = useState({
    status: '',
    date: '',
    startDate: '',
    endDate: ''
  })
  const [formData, setFormData] = useState({
    serviceId: '',
    clientName: '',
    clientEmail: '',
    clientPhone: '',
    date: '',
    time: '',
    notes: '',
    staffMember: '',
    status: 'pendiente',
    cancelReason: ''
  })
  const [errors, setErrors] = useState({})
  const [submitting, setSubmitting] = useState(false)

  // Función para formatear duración
  const formatDuration = (minutes) => {
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    
    if (hours > 0) {
      return mins > 0 ? `${hours}h ${mins}min` : `${hours}h`
    }
    return `${mins}min`
  }

  useEffect(() => {
    const handleLoadData = async () => {
      try {
        setLoading(true)
        
        // Cargar servicios para el dropdown
        const servicesResponse = await api.get('/services')
        if (servicesResponse.success) {
          setServices(servicesResponse.data || [])
        }

        // Cargar citas
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
      let url = '/appointments?'
      const params = new URLSearchParams()

      if (filters.status) params.append('status', filters.status)
      if (filters.date) params.append('date', filters.date)
      if (filters.startDate && filters.endDate) {
        params.append('startDate', filters.startDate)
        params.append('endDate', filters.endDate)
      }

      const response = await api.get(`/appointments?${params.toString()}`)
      if (response.success) {
        console.log('📋 Citas recibidas:', response.data)
        setAppointments(response.data)
      }
    } catch (error) {
      console.error('Error cargando citas:', error)
    }
  }

  useEffect(() => {
    if (!loading) {
      handleLoadAppointments()
    }
  }, [filters])

  const handleFilterChange = (e) => {
    const { name, value } = e.target
    setFilters(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
    
    // Limpiar error del campo específico
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }))
    }
  }

  const handleValidateForm = () => {
    const newErrors = {}

    if (!formData.serviceId) {
      newErrors.serviceId = 'Debes seleccionar un servicio'
    }

    if (!formData.clientName.trim()) {
      newErrors.clientName = 'El nombre del cliente es requerido'
    }

    if (!formData.clientEmail.trim()) {
      newErrors.clientEmail = 'El email del cliente es requerido'
    } else if (!/\S+@\S+\.\S+/.test(formData.clientEmail)) {
      newErrors.clientEmail = 'Email inválido'
    }

    if (!formData.clientPhone.trim()) {
      newErrors.clientPhone = 'El teléfono del cliente es requerido'
    }

    if (!formData.date) {
      newErrors.date = 'La fecha es requerida'
    }

    if (!formData.time) {
      newErrors.time = 'La hora es requerida'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!handleValidateForm()) {
      return
    }

    try {
      setSubmitting(true)

      let response
      if (editingAppointment) {
        const appointmentId = editingAppointment.id || editingAppointment._id
        console.log('🔄 Actualizando cita con ID:', appointmentId)
        
        // Si solo se está cambiando el estado, usar el endpoint específico
        const originalStatus = editingAppointment.status
        const newStatus = formData.status
        
        // Verificar si solo cambió el estado comparando todos los campos
        // Convertir fecha para comparación
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
        
        console.log('🔍 Verificando cambio de estado:', {
          originalStatus,
          newStatus,
          hasOnlyStatusChanged,
          appointmentDateStr,
          formDataDate: formData.date
        })
        
        if (hasOnlyStatusChanged) {
          console.log('📤 Solo cambiando estado, usando endpoint específico')
          response = await api.put(`/appointments/${appointmentId}/status`, { status: newStatus })
        } else {
          console.log('📤 Actualización completa, usando endpoint general')
          response = await api.put(`/appointments/${appointmentId}`, formData)
        }
      } else {
        response = await api.post('/appointments', formData)
      }

      if (response.success) {
        // Actualizar lista de citas
        if (editingAppointment) {
          setAppointments(prev => prev.map(appointment => 
            (appointment.id === editingAppointment.id || appointment._id === editingAppointment._id) ? response.data : appointment
          ))
        } else {
          setAppointments(prev => [response.data, ...prev])
        }

        handleCloseModal()
      } else {
        if (response.errors && Array.isArray(response.errors)) {
          const fieldErrors = {}
          response.errors.forEach(error => {
            fieldErrors[error.path] = error.msg
          })
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
    
    // Formatear fecha para input date
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
    console.log('🔄 Actualizando estado:', { appointmentId, newStatus })
    console.log('📋 Tipo de appointmentId:', typeof appointmentId)
    console.log('📋 Valor de appointmentId:', appointmentId)
    
    if (!appointmentId) {
      console.error('❌ Error: appointmentId es undefined')
      alert('Error: ID de cita no válido')
      return
    }
    
    try {
      console.log('📤 Enviando petición PUT a:', `/appointments/${appointmentId}/status`)
      console.log('📤 Datos enviados:', { status: newStatus })
      const response = await api.put(`/appointments/${appointmentId}/status`, { status: newStatus })
      
      if (response.success) {
        console.log('✅ Estado actualizado exitosamente')
        console.log('🔄 Actualizando estado local - appointmentId:', appointmentId)
        console.log('🔄 Estado anterior:', appointments.find(a => a.id === appointmentId))
        setAppointments(prev => prev.map(appointment => {
          const matchesId = (appointment.id === appointmentId || appointment._id === appointmentId)
          console.log(`🔄 Comparando ${appointment.id}/${appointment._id} con ${appointmentId}: ${matchesId}`)
          if (matchesId) {
            console.log('✅ Actualizando cita:', appointment.clientName, 'de', appointment.status, 'a', newStatus)
            return { ...appointment, status: newStatus }
          }
          return appointment
        }))
      } else {
        console.error('❌ Error en respuesta:', response)
        alert('Error al actualizar el estado')
      }
    } catch (error) {
      console.error('❌ Error actualizando estado:', error)
      alert('Error interno del servidor')
    }
  }

  const handleDelete = async (appointmentId) => {
    if (!confirm('¿Estás seguro de que quieres eliminar esta cita?')) {
      return
    }

    try {
      const response = await api.delete(`/appointments/${appointmentId}`)
      if (response.success) {
        setAppointments(prev => prev.filter(appointment => appointment.id !== appointmentId))
      } else {
        alert('Error al eliminar la cita')
      }
    } catch (error) {
      console.error('Error eliminando cita:', error)
      alert('Error interno del servidor')
    }
  }

  const handleCloseModal = () => {
    setShowModal(false)
    setEditingAppointment(null)
    setFormData({
      serviceId: '',
      clientName: '',
      clientEmail: '',
      clientPhone: '',
      date: '',
      time: '',
      notes: '',
      staffMember: '',
      status: 'pendiente',
      cancelReason: ''
    })
    setErrors({})
  }

  const handleOpenCreateModal = () => {
    setEditingAppointment(null)
    setFormData({
      serviceId: '',
      clientName: '',
      clientEmail: '',
      clientPhone: '',
      date: '',
      time: '',
      notes: '',
      staffMember: '',
      status: 'pendiente',
      cancelReason: ''
    })
    setErrors({})
    setShowModal(true)
  }

  const handleGetStatusColor = (status) => {
    switch (status) {
      case 'CONFIRMADA':
        return 'bg-green-100 dark:bg-green-900/40 text-green-800 dark:text-green-200'
      case 'PENDIENTE':
        return 'bg-yellow-100 dark:bg-yellow-900/40 text-yellow-800 dark:text-yellow-200'
      case 'COMPLETADA':
        return 'bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-200'
      case 'CANCELADA':
        return 'bg-red-100 dark:bg-red-900/40 text-red-800 dark:text-red-200'
      case 'NO_ASISTIO':
        return 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200'
      case 'ESPERANDO_PAGO':
        return 'bg-orange-100 dark:bg-orange-900/40 text-orange-800 dark:text-orange-200'
      case 'EXPIRADA':
        return 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 line-through'
      default:
        return 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200'
    }
  }

  const handleGetStatusLabel = (status) => {
    switch (status) {
      case 'CONFIRMADA': return 'Confirmada'
      case 'PENDIENTE': return 'Pendiente'
      case 'COMPLETADA': return 'Completada'
      case 'CANCELADA': return 'Cancelada'
      case 'NO_ASISTIO': return 'No asistió'
      case 'ESPERANDO_PAGO': return '⏳ Esperando Pago'
      case 'EXPIRADA': return 'Expirada'
      default: return status
    }
  }

  // Responder a una reserva: pago en persona o pago online
  const handleRespondToBooking = async (appointmentId, paymentMode) => {
    try {
      const response = await api.put(`/appointments/${appointmentId}/respond`, { paymentMode })
      if (response.success) {
        const newStatus = paymentMode === 'IN_PERSON' ? 'CONFIRMADA' : 'ESPERANDO_PAGO'
        setAppointments(prev => prev.map(appointment => {
          const matchesId = (appointment.id === appointmentId || appointment._id === appointmentId)
          // También actualizar citas del mismo grupo
          const matchesGroup = appointment.groupId && response.data?.groupId && appointment.groupId === response.data.groupId
          if (matchesId || matchesGroup) {
            return { 
              ...appointment, 
              status: newStatus,
              holdExpiresAt: response.data?.holdExpiresAt || null
            }
          }
          return appointment
        }))
        if (paymentMode === 'IN_PERSON') {
          alert('✅ Cita confirmada. El cliente pagará al llegar.')
        } else {
          alert(`⏳ Se ha reservado el horario temporalmente. El cliente tiene ${response.data?.holdMinutes || 15} minutos para pagar.`)
        }
      } else {
        alert('Error al responder a la reserva: ' + (response.error || ''))
      }
    } catch (error) {
      console.error('Error respondiendo a reserva:', error)
      alert('Error interno del servidor')
    }
  }

  const handleClearFilters = () => {
    setFilters({
      status: '',
      date: '',
      startDate: '',
      endDate: ''
    })
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Cargando citas...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 shadow-sm border-b dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <Link href="/dashboard" className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 mr-4">
                ← Volver al Dashboard
              </Link>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Gestión de Citas</h1>
            </div>
            <button
              onClick={handleOpenCreateModal}
              className="bg-blue-600 dark:bg-blue-700 hover:bg-blue-700 dark:hover:bg-blue-600 text-white px-4 py-2 rounded-lg transition-colors"
            >
              + Nueva Cita
            </button>
          </div>
        </div>
      </header>

      {/* Filtros */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-6 border border-gray-200 dark:border-gray-700">
          <div className="flex flex-wrap items-end gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Estado
              </label>
              <select
                name="status"
                value={filters.status}
                onChange={handleFilterChange}
                className="px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Todos los estados</option>
                <option value="PENDIENTE">Pendiente</option>
                <option value="CONFIRMADA">Confirmada</option>
                <option value="ESPERANDO_PAGO">⏳ Esperando Pago</option>
                <option value="COMPLETADA">Completada</option>
                <option value="CANCELADA">Cancelada</option>
                <option value="EXPIRADA">Expirada</option>
                <option value="NO_ASISTIO">No asistió</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Fecha específica
              </label>
              <input
                type="date"
                name="date"
                value={filters.date}
                onChange={handleFilterChange}
                className="px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Desde
              </label>
              <input
                type="date"
                name="startDate"
                value={filters.startDate}
                onChange={handleFilterChange}
                className="px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Hasta
              </label>
              <input
                type="date"
                name="endDate"
                value={filters.endDate}
                onChange={handleFilterChange}
                className="px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <button
              onClick={handleClearFilters}
              className="px-4 py-2 text-gray-600 dark:text-gray-300 bg-gray-200 dark:bg-gray-600 hover:bg-gray-300 dark:hover:bg-gray-500 rounded-lg transition-colors"
            >
              Limpiar filtros
            </button>
          </div>
        </div>

        {/* Main Content */}
        {!appointments || appointments.length === 0 ? (
          <div className="text-center py-12">
            <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">No hay citas</h3>
            <p className="text-gray-600 dark:text-gray-300 mb-6">
              {Object.values(filters).some(f => f) 
                ? 'No se encontraron citas con los filtros aplicados'
                : 'Comienza programando tu primera cita'
              }
            </p>
            <button
              onClick={handleOpenCreateModal}
              className="bg-blue-600 dark:bg-blue-700 text-white px-6 py-3 rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 transition-colors"
            >
              Programar primera cita
            </button>
          </div>
        ) : (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden border border-gray-200 dark:border-gray-700">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                Citas programadas ({appointments.length})
              </h2>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50 dark:bg-gray-700/50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Cliente
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Servicio
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Fecha y Hora
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Estado
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Monto
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                  {appointments && Array.isArray(appointments) && appointments.map((appointment) => (
                    <tr key={appointment.id || appointment._id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900 dark:text-gray-100">{appointment.clientName}</div>
                          <div className="text-sm text-gray-500 dark:text-gray-400">{appointment.clientEmail}</div>
                          <div className="text-sm text-gray-500 dark:text-gray-400">{appointment.clientPhone}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
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
                        {appointment.barber && (
                          <div className="text-sm text-gray-500 dark:text-gray-400">con {appointment.barber.name}</div>
                        )}
                        {!appointment.barber && appointment.staffMember && (
                          <div className="text-sm text-gray-500">con {appointment.staffMember}</div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900 dark:text-gray-100">
                          {new Date(appointment.date).toLocaleDateString('es-ES')}
                        </div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">{formatTime12h(appointment.time)}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${handleGetStatusColor(appointment.status)}`}>
                          {handleGetStatusLabel(appointment.status)}
                        </span>
                        {appointment.status === 'ESPERANDO_PAGO' && appointment.holdExpiresAt && (
                          <div className="text-xs text-orange-600 dark:text-orange-400 mt-1">
                            Expira: {new Date(appointment.holdExpiresAt).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                        ${appointment.totalAmount}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex justify-end space-x-2">
                          {appointment.status === 'PENDIENTE' && (
                            <div className="flex flex-col gap-1">
                              <button
                                onClick={() => handleRespondToBooking(appointment.id || appointment._id, 'IN_PERSON')}
                                className="text-green-600 dark:text-green-400 hover:text-green-900 dark:hover:text-green-300 text-xs font-medium"
                                title="Confirmar cita - el cliente paga al llegar"
                              >
                                ✅ Pago en persona
                              </button>
                              <button
                                onClick={() => handleRespondToBooking(appointment.id || appointment._id, 'ONLINE')}
                                className="text-orange-600 dark:text-orange-400 hover:text-orange-900 dark:hover:text-orange-300 text-xs font-medium"
                                title="Requiere pago online - se reserva temporalmente"
                              >
                                💳 Pago online
                              </button>
                            </div>
                          )}
                          {appointment.status === 'ESPERANDO_PAGO' && (
                            <button
                              onClick={() => handleUpdateStatus(appointment.id || appointment._id, 'CONFIRMADA')}
                              className="text-green-600 dark:text-green-400 hover:text-green-900 dark:hover:text-green-300 text-xs font-medium"
                              title="Confirmar manualmente sin esperar pago online"
                            >
                              Confirmar manual
                            </button>
                          )}
                          {appointment.status === 'CONFIRMADA' && (
                            <button
                              onClick={() => {
                                console.log('🔘 Botón Completar clickeado - appointment:', appointment)
                                console.log('🔘 appointment.id:', appointment.id)
                                console.log('🔘 appointment._id:', appointment._id)
                                handleUpdateStatus(appointment.id || appointment._id, 'COMPLETADA')
                              }}
                              className="text-blue-600 dark:text-blue-400 hover:text-blue-900 dark:hover:text-blue-300 text-xs"
                            >
                              Completar
                            </button>
                          )}
                          <button
                            onClick={() => handleEdit(appointment)}
                            className="text-blue-600 dark:text-blue-400 hover:text-blue-900 dark:hover:text-blue-300 text-xs"
                          >
                            Editar
                          </button>
                          <button
                            onClick={() => handleDelete(appointment.id || appointment._id)}
                            className="text-red-600 dark:text-red-400 hover:text-red-900 dark:hover:text-red-300 text-xs"
                          >
                            Eliminar
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-gray-600 dark:bg-gray-900 bg-opacity-50 dark:bg-opacity-80 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-full max-w-2xl bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 rounded-lg shadow-lg">
            <div className="mt-3">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                  {editingAppointment ? 'Editar Cita' : 'Nueva Cita'}
                </h3>
                <button
                  onClick={handleCloseModal}
                  className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {errors.general && (
                <div className="mb-4 p-4 bg-red-100 dark:bg-red-900/30 border border-red-400 dark:border-red-800 text-red-700 dark:text-red-200 rounded">
                  {errors.general}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Servicio *
                  </label>
                  <select
                    name="serviceId"
                    value={formData.serviceId}
                    onChange={handleInputChange}
                    className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      errors.serviceId ? 'border-red-500' : 'border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100'
                    }`}
                  >
                    <option value="">Seleccionar servicio</option>
                    {services && Array.isArray(services) && services.map((service) => (
                      <option key={service.id || service._id} value={service.id || service._id}>
                        {service.name} - ${service.price} ({service.formattedDuration || formatDuration(service.duration)})
                      </option>
                    ))}
                  </select>
                  {errors.serviceId && <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.serviceId}</p>}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Nombre del Cliente *
                    </label>
                    <input
                      type="text"
                      name="clientName"
                      value={formData.clientName}
                      onChange={handleInputChange}
                      className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                        errors.clientName ? 'border-red-500' : 'border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100'
                      }`}
                      placeholder="Nombre completo"
                    />
                    {errors.clientName && <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.clientName}</p>}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Email *
                    </label>
                    <input
                      type="email"
                      name="clientEmail"
                      value={formData.clientEmail}
                      onChange={handleInputChange}
                      className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                        errors.clientEmail ? 'border-red-500' : 'border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100'
                      }`}
                      placeholder="correo@ejemplo.com"
                    />
                    {errors.clientEmail && <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.clientEmail}</p>}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Teléfono *
                    </label>
                    <input
                      type="tel"
                      name="clientPhone"
                      value={formData.clientPhone}
                      onChange={handleInputChange}
                      className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                        errors.clientPhone ? 'border-red-500' : 'border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100'
                      }`}
                      placeholder="+1234567890"
                    />
                    {errors.clientPhone && <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.clientPhone}</p>}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Estilista (opcional)
                    </label>
                    <input
                      type="text"
                      name="staffMember"
                      value={formData.staffMember}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Nombre del estilista"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Fecha *
                    </label>
                    <input
                      type="date"
                      name="date"
                      value={formData.date}
                      onChange={handleInputChange}
                      min={new Date().toISOString().split('T')[0]}
                      className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                        errors.date ? 'border-red-500' : 'border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100'
                      }`}
                    />
                    {errors.date && <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.date}</p>}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Hora *
                    </label>
                    <TimeInput12h
                      value={formData.time}
                      onChange={(val) => setFormData(prev => ({ ...prev, time: val }))}
                      className={`w-full border dark:bg-gray-700 dark:text-gray-100 ${errors.time ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'}`}
                      aria-label="Hora de la cita"
                    />
                    {errors.time && <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.time}</p>}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Notas
                    </label>
                    <textarea
                      name="notes"
                      value={formData.notes}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      rows={3}
                      placeholder="Notas adicionales"
                    />
                  </div>

                  {editingAppointment && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Estado de la Cita
                      </label>
                      <select
                        name="status"
                        value={formData.status}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="PENDIENTE">Pendiente</option>
                        <option value="CONFIRMADA">Confirmada</option>
                        <option value="ESPERANDO_PAGO">⏳ Esperando Pago</option>
                        <option value="COMPLETADA">Completada</option>
                        <option value="CANCELADA">Cancelada</option>
                        <option value="EXPIRADA">Expirada</option>
                        <option value="NO_ASISTIO">No asistió</option>
                      </select>
                      <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                        {formData.status === 'CANCELADA' && '⚠️ Se enviará email de cancelación al cliente'}
                        {formData.status === 'ESPERANDO_PAGO' && '⏳ El cliente debe pagar para confirmar'}
                      </p>
                    </div>
                  )}
                </div>

                {editingAppointment && formData.status === 'CANCELADA' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Razón de Cancelación (opcional)
                    </label>
                    <input
                      type="text"
                      name="cancelReason"
                      value={formData.cancelReason || ''}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Ej: Cliente canceló, Emergencia, etc."
                    />
                    <p className="mt-1 text-xs text-yellow-600">
                      💡 Esta razón será guardada para referencia interna
                    </p>
                  </div>
                )}

                <button
                  type="submit"
                  className="w-full bg-blue-600 dark:bg-blue-700 hover:bg-blue-700 dark:hover:bg-blue-600 text-white px-4 py-2 rounded-lg transition-colors"
                >
                  {editingAppointment ? 'Actualizar Cita' : 'Crear Cita'}
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default AppointmentsPage