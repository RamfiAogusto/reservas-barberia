'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import api from '@/utils/api'
import { useSocketEvent } from '@/contexts/SocketContext'

const BarbersPage = () => {
  const router = useRouter()
  const [barbers, setBarbers] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingBarber, setEditingBarber] = useState(null)
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    specialty: ''
  })
  const [errors, setErrors] = useState({})
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    loadBarbers()
  }, [])

  // Real-time: auto-refresh cuando se modifican barberos
  useSocketEvent('barber:updated', useCallback(() => {
    loadBarbers()
  }, []))

  const loadBarbers = async () => {
    try {
      setLoading(true)
      const response = await api.get('/barbers')
      if (response.success) {
        setBarbers(response.data || [])
      }
    } catch (error) {
      console.error('Error cargando barberos:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }))
    }
  }

  const handleValidateForm = () => {
    const newErrors = {}
    if (!formData.name.trim()) {
      newErrors.name = 'El nombre del barbero es requerido'
    }
    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Email inválido'
    }
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!handleValidateForm()) return

    try {
      setSubmitting(true)
      const barberData = {
        name: formData.name.trim(),
        phone: formData.phone.trim() || undefined,
        email: formData.email.trim() || undefined,
        specialty: formData.specialty.trim() || undefined
      }

      let response
      if (editingBarber) {
        response = await api.put(`/barbers/${editingBarber.id}`, barberData)
      } else {
        response = await api.post('/barbers', barberData)
      }

      if (response.success) {
        if (editingBarber) {
          setBarbers(prev => prev.map(b => b.id === editingBarber.id ? response.data : b))
        } else {
          setBarbers(prev => [...prev, response.data])
        }
        handleCloseModal()
      } else {
        setErrors({ general: response.message || 'Error al guardar el barbero' })
      }
    } catch (error) {
      console.error('Error guardando barbero:', error)
      setErrors({ general: 'Error interno del servidor' })
    } finally {
      setSubmitting(false)
    }
  }

  const handleEdit = (barber) => {
    setEditingBarber(barber)
    setFormData({
      name: barber.name || '',
      phone: barber.phone || '',
      email: barber.email || '',
      specialty: barber.specialty || ''
    })
    setShowModal(true)
  }

  const handleDelete = async (barberId) => {
    if (!confirm('¿Estás seguro de que quieres desactivar este barbero? Sus citas existentes no se verán afectadas.')) {
      return
    }
    try {
      const response = await api.delete(`/barbers/${barberId}`)
      if (response.success) {
        setBarbers(prev => prev.filter(b => b.id !== barberId))
      } else {
        alert('Error al desactivar el barbero')
      }
    } catch (error) {
      console.error('Error eliminando barbero:', error)
      alert('Error interno del servidor')
    }
  }

  const handleCloseModal = () => {
    setShowModal(false)
    setEditingBarber(null)
    setFormData({ name: '', phone: '', email: '', specialty: '' })
    setErrors({})
  }

  const handleOpenCreateModal = () => {
    setEditingBarber(null)
    setFormData({ name: '', phone: '', email: '', specialty: '' })
    setErrors({})
    setShowModal(true)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-2 border-blue-600 dark:border-blue-400 border-t-transparent"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="bg-white dark:bg-gray-800 shadow-sm border-b dark:border-gray-700">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <button
            onClick={() => router.push('/dashboard')}
            className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 mb-4"
          >
            ← Volver al Dashboard
          </button>
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Barberos</h1>
              <p className="text-gray-600 dark:text-gray-300">Administra el equipo de tu barbería</p>
            </div>
            <button
              onClick={handleOpenCreateModal}
              className="bg-blue-600 dark:bg-blue-700 text-white px-4 py-2 rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 transition-colors"
            >
              + Agregar barbero
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8">
        {barbers.length === 0 ? (
          <div className="text-center py-16 bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
            <div className="text-6xl mb-4">💈</div>
            <h3 className="text-xl font-semibold text-gray-700 dark:text-gray-200 mb-2">
              No hay barberos registrados
            </h3>
            <p className="text-gray-500 dark:text-gray-400 mb-6">
              Agrega a los barberos de tu equipo para que los clientes puedan elegir con quién reservar.
            </p>
            <button
              onClick={handleOpenCreateModal}
              className="bg-blue-600 dark:bg-blue-700 text-white px-6 py-2 rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 transition-colors"
            >
              Agregar primer barbero
            </button>
          </div>
        ) : (
          <div className="grid gap-4">
            {barbers.map(barber => (
              <div
                key={barber.id}
                className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-5 border border-gray-200 dark:border-gray-700 flex items-center justify-between"
              >
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-full bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center text-2xl">
                    {barber.avatar ? (
                      <img src={barber.avatar} alt={barber.name} className="w-full h-full rounded-full object-cover" />
                    ) : (
                      '✂️'
                    )}
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-gray-100">{barber.name}</h3>
                    {barber.specialty && (
                      <p className="text-sm text-blue-600 dark:text-blue-400">{barber.specialty}</p>
                    )}
                    <div className="flex gap-3 mt-1 text-xs text-gray-500 dark:text-gray-400">
                      {barber.phone && <span>📞 {barber.phone}</span>}
                      {barber.email && <span>✉️ {barber.email}</span>}
                      {barber._count?.appointments !== undefined && (
                        <span>📋 {barber._count.appointments} citas</span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleEdit(barber)}
                    className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 px-3 py-1 rounded border border-blue-200 dark:border-blue-700 hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-colors text-sm"
                  >
                    Editar
                  </button>
                  <button
                    onClick={() => handleDelete(barber.id)}
                    className="text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 px-3 py-1 rounded border border-red-200 dark:border-red-700 hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors text-sm"
                  >
                    Eliminar
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal crear/editar barbero */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md shadow-xl">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
                {editingBarber ? 'Editar barbero' : 'Nuevo barbero'}
              </h2>
              <button
                onClick={handleCloseModal}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 text-2xl"
              >
                ×
              </button>
            </div>

            {errors.general && (
              <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded text-red-800 dark:text-red-200 text-sm">
                {errors.general}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Nombre *
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  className="w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-lg px-3 py-2"
                  placeholder="Nombre del barbero"
                  required
                />
                {errors.name && <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.name}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Especialidad
                </label>
                <input
                  type="text"
                  name="specialty"
                  value={formData.specialty}
                  onChange={handleInputChange}
                  className="w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-lg px-3 py-2"
                  placeholder="Ej: Cortes clásicos, Degradados, etc."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Teléfono
                </label>
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleInputChange}
                  className="w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-lg px-3 py-2"
                  placeholder="809-555-1234"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Email
                </label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  className="w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-lg px-3 py-2"
                  placeholder="barbero@email.com"
                />
                {errors.email && <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.email}</p>}
              </div>

              <div className="flex gap-3 justify-end pt-4">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="px-4 py-2 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="bg-blue-600 dark:bg-blue-700 text-white px-6 py-2 rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 disabled:opacity-50 transition-colors"
                >
                  {submitting ? 'Guardando...' : editingBarber ? 'Actualizar' : 'Crear barbero'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default BarbersPage
