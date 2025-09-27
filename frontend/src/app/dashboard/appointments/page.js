'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import api from '@/utils/api'

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
        response = await api.put(`/appointments/${editingAppointment._id}`, formData)
      } else {
        response = await api.post('/appointments', formData)
      }

      if (response.success) {
        // Actualizar lista de citas
        if (editingAppointment) {
          setAppointments(prev => prev.map(appointment => 
            appointment.id === editingAppointment.id ? response.data : appointment
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
    try {
      const response = await api.put(`/appointments/${appointmentId}`, { status: newStatus })
      if (response.success) {
        setAppointments(prev => prev.map(appointment => 
          appointment.id === appointmentId 
            ? { ...appointment, status: newStatus }
            : appointment
        ))
      } else {
        alert('Error al actualizar el estado')
      }
    } catch (error) {
      console.error('Error actualizando estado:', error)
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
      case 'confirmada':
        return 'bg-green-100 text-green-800'
      case 'pendiente':
        return 'bg-yellow-100 text-yellow-800'
      case 'completada':
        return 'bg-blue-100 text-blue-800'
      case 'cancelada':
        return 'bg-red-100 text-red-800'
      case 'no_asistio':
        return 'bg-gray-100 text-gray-800'
      default:
        return 'bg-gray-100 text-gray-800'
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
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Cargando citas...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <Link href="/dashboard" className="text-blue-600 hover:text-blue-800 mr-4">
                ← Volver al Dashboard
              </Link>
              <h1 className="text-2xl font-bold text-gray-900">Gestión de Citas</h1>
            </div>
            <button
              onClick={handleOpenCreateModal}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
            >
              + Nueva Cita
            </button>
          </div>
        </div>
      </header>

      {/* Filtros */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="flex flex-wrap items-end gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Estado
              </label>
              <select
                name="status"
                value={filters.status}
                onChange={handleFilterChange}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Todos los estados</option>
                <option value="pendiente">Pendiente</option>
                <option value="confirmada">Confirmada</option>
                <option value="completada">Completada</option>
                <option value="cancelada">Cancelada</option>
                <option value="no_asistio">No asistió</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Fecha específica
              </label>
              <input
                type="date"
                name="date"
                value={filters.date}
                onChange={handleFilterChange}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Desde
              </label>
              <input
                type="date"
                name="startDate"
                value={filters.startDate}
                onChange={handleFilterChange}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Hasta
              </label>
              <input
                type="date"
                name="endDate"
                value={filters.endDate}
                onChange={handleFilterChange}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <button
              onClick={handleClearFilters}
              className="px-4 py-2 text-gray-600 bg-gray-200 hover:bg-gray-300 rounded-lg transition-colors"
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
            <h3 className="text-lg font-medium text-gray-900 mb-2">No hay citas</h3>
            <p className="text-gray-600 mb-6">
              {Object.values(filters).some(f => f) 
                ? 'No se encontraron citas con los filtros aplicados'
                : 'Comienza programando tu primera cita'
              }
            </p>
            <button
              onClick={handleOpenCreateModal}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg transition-colors"
            >
              Programar primera cita
            </button>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-md overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">
                Citas programadas ({appointments.length})
              </h2>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Cliente
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Servicio
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Fecha y Hora
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Estado
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Monto
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {appointments && Array.isArray(appointments) && appointments.map((appointment) => (
                    <tr key={appointment.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900">{appointment.clientName}</div>
                          <div className="text-sm text-gray-500">{appointment.clientEmail}</div>
                          <div className="text-sm text-gray-500">{appointment.clientPhone}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{appointment.service?.name || appointment.serviceId?.name}</div>
                        {appointment.staffMember && (
                          <div className="text-sm text-gray-500">con {appointment.staffMember}</div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {new Date(appointment.date).toLocaleDateString('es-ES')}
                        </div>
                        <div className="text-sm text-gray-500">{appointment.time}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${handleGetStatusColor(appointment.status)}`}>
                          {appointment.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        ${appointment.totalAmount}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex justify-end space-x-2">
                          {appointment.status === 'pendiente' && (
                            <button
                              onClick={() => handleUpdateStatus(appointment.id, 'confirmada')}
                              className="text-green-600 hover:text-green-900 text-xs"
                            >
                              Confirmar
                            </button>
                          )}
                          {appointment.status === 'confirmada' && (
                            <button
                              onClick={() => handleUpdateStatus(appointment.id, 'completada')}
                              className="text-blue-600 hover:text-blue-900 text-xs"
                            >
                              Completar
                            </button>
                          )}
                          <button
                            onClick={() => handleEdit(appointment)}
                            className="text-blue-600 hover:text-blue-900 text-xs"
                          >
                            Editar
                          </button>
                          <button
                            onClick={() => handleDelete(appointment.id)}
                            className="text-red-600 hover:text-red-900 text-xs"
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
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-full max-w-2xl bg-white rounded-lg shadow-lg">
            <div className="mt-3">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-gray-900">
                  {editingAppointment ? 'Editar Cita' : 'Nueva Cita'}
                </h3>
                <button
                  onClick={handleCloseModal}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {errors.general && (
                <div className="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded">
                  {errors.general}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Servicio *
                  </label>
                  <select
                    name="serviceId"
                    value={formData.serviceId}
                    onChange={handleInputChange}
                    className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      errors.serviceId ? 'border-red-500' : 'border-gray-300'
                    }`}
                  >
                    <option value="">Seleccionar servicio</option>
                    {services && Array.isArray(services) && services.map((service) => (
                      <option key={service._id} value={service._id}>
                        {service.name} - ${service.price} ({service.formattedDuration || formatDuration(service.duration)})
                      </option>
                    ))}
                  </select>
                  {errors.serviceId && <p className="mt-1 text-sm text-red-600">{errors.serviceId}</p>}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Nombre del Cliente *
                    </label>
                    <input
                      type="text"
                      name="clientName"
                      value={formData.clientName}
                      onChange={handleInputChange}
                      className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                        errors.clientName ? 'border-red-500' : 'border-gray-300'
                      }`}
                      placeholder="Nombre completo"
                    />
                    {errors.clientName && <p className="mt-1 text-sm text-red-600">{errors.clientName}</p>}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Email *
                    </label>
                    <input
                      type="email"
                      name="clientEmail"
                      value={formData.clientEmail}
                      onChange={handleInputChange}
                      className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                        errors.clientEmail ? 'border-red-500' : 'border-gray-300'
                      }`}
                      placeholder="correo@ejemplo.com"
                    />
                    {errors.clientEmail && <p className="mt-1 text-sm text-red-600">{errors.clientEmail}</p>}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Teléfono *
                    </label>
                    <input
                      type="tel"
                      name="clientPhone"
                      value={formData.clientPhone}
                      onChange={handleInputChange}
                      className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                        errors.clientPhone ? 'border-red-500' : 'border-gray-300'
                      }`}
                      placeholder="+1234567890"
                    />
                    {errors.clientPhone && <p className="mt-1 text-sm text-red-600">{errors.clientPhone}</p>}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Estilista (opcional)
                    </label>
                    <input
                      type="text"
                      name="staffMember"
                      value={formData.staffMember}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Nombre del estilista"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Fecha *
                    </label>
                    <input
                      type="date"
                      name="date"
                      value={formData.date}
                      onChange={handleInputChange}
                      min={new Date().toISOString().split('T')[0]}
                      className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                        errors.date ? 'border-red-500' : 'border-gray-300'
                      }`}
                    />
                    {errors.date && <p className="mt-1 text-sm text-red-600">{errors.date}</p>}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Hora *
                    </label>
                    <input
                      type="time"
                      name="time"
                      value={formData.time}
                      onChange={handleInputChange}
                      className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                        errors.time ? 'border-red-500' : 'border-gray-300'
                      }`}
                    />
                    {errors.time && <p className="mt-1 text-sm text-red-600">{errors.time}</p>}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Notas
                    </label>
                    <textarea
                      name="notes"
                      value={formData.notes}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      rows={3}
                      placeholder="Notas adicionales"
                    />
                  </div>

                  {editingAppointment && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Estado de la Cita
                      </label>
                      <select
                        name="status"
                        value={formData.status}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="pendiente">Pendiente</option>
                        <option value="confirmada">Confirmada</option>
                        <option value="completada">Completada</option>
                        <option value="cancelada">Cancelada</option>
                        <option value="no_asistio">No asistió</option>
                      </select>
                      <p className="mt-1 text-xs text-gray-500">
                        {formData.status === 'cancelada' && '⚠️ Se enviará email de cancelación al cliente'}
                      </p>
                    </div>
                  )}
                </div>

                {editingAppointment && formData.status === 'cancelada' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Razón de Cancelación (opcional)
                    </label>
                    <input
                      type="text"
                      name="cancelReason"
                      value={formData.cancelReason || ''}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Ej: Cliente canceló, Emergencia, etc."
                    />
                    <p className="mt-1 text-xs text-yellow-600">
                      💡 Esta razón será guardada para referencia interna
                    </p>
                  </div>
                )}

                <button
                  type="submit"
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
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