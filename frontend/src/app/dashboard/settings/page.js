'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import api, { getUserData, saveUserData } from '@/utils/api'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'

const SettingsPage = () => {
  const router = useRouter()
  const fileInputRef = useRef(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [formData, setFormData] = useState({
    salonName: '',
    phone: '',
    address: '',
    avatar: '',
    requiresDeposit: false,
    depositAmount: ''
  })

  useEffect(() => {
    handleLoadProfile()
  }, [])

  const handleLoadProfile = async () => {
    try {
      setLoading(true)
      const response = await api.get('/users/profile')
      if (response.success && response.data) {
        setFormData({
          salonName: response.data.salonName || '',
          phone: response.data.phone || '',
          address: response.data.address || '',
          avatar: response.data.avatar || '',
          requiresDeposit: response.data.requiresDeposit ?? false,
          depositAmount: response.data.depositAmount ? String(response.data.depositAmount) : ''
        })
      }
    } catch (err) {
      console.error('Error cargando perfil:', err)
      setError('Error al cargar la configuración')
    } finally {
      setLoading(false)
    }
  }

  const handleAvatarUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg', 'image/webp']
    if (!allowedTypes.includes(file.type)) {
      setError('Solo se permiten imágenes JPG, PNG y WebP')
      return
    }

    if (file.size > 5 * 1024 * 1024) {
      setError('La imagen no puede superar los 5MB')
      return
    }

    try {
      setUploadingAvatar(true)
      setError('')

      const formDataUpload = new FormData()
      formDataUpload.append('avatar', file)

      const token = localStorage.getItem('authToken')
      const response = await fetch(`${API_BASE_URL}/users/profile/avatar`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formDataUpload
      })

      const data = await response.json()

      if (data.success) {
        setFormData(prev => ({ ...prev, avatar: data.data.avatar }))
        const userData = getUserData()
        if (userData) {
          saveUserData({ ...userData, avatar: data.data.avatar })
        }
        setMessage('Avatar actualizado exitosamente')
      } else {
        setError(data.message || 'Error al subir el avatar')
      }
    } catch (err) {
      console.error('Error subiendo avatar:', err)
      setError('Error al subir el avatar')
    } finally {
      setUploadingAvatar(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setMessage('')
    setError('')

    if (!formData.salonName.trim()) {
      setError('El nombre del salón es requerido')
      return
    }
    if (!formData.phone.trim()) {
      setError('El teléfono es requerido')
      return
    }
    if (!formData.address.trim()) {
      setError('La dirección es requerida')
      return
    }
    if (formData.requiresDeposit && (!formData.depositAmount || parseFloat(formData.depositAmount) <= 0)) {
      setError('Ingresa el monto del depósito cuando está activado')
      return
    }

    try {
      setSaving(true)
      const response = await api.put('/users/profile', {
        salonName: formData.salonName.trim(),
        phone: formData.phone.trim(),
        address: formData.address.trim(),
        requiresDeposit: formData.requiresDeposit,
        depositAmount: formData.requiresDeposit ? parseFloat(formData.depositAmount) || 0 : 0
      })
      if (response.success) {
        setMessage('Configuración guardada correctamente')
        const userData = getUserData()
        if (userData) {
          saveUserData({
            ...userData,
            salonName: formData.salonName.trim(),
            phone: formData.phone.trim(),
            address: formData.address.trim()
          })
        }
      } else {
        setError(response.message || 'Error al guardar')
      }
    } catch (err) {
      console.error('Error guardando:', err)
      setError('Error al guardar la configuración')
    } finally {
      setSaving(false)
    }
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
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Configuración</h1>
          <p className="text-gray-600 dark:text-gray-300">Administra tu perfil y opciones del negocio</p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
        {message && (
          <div className="p-4 bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800 rounded-lg text-green-800 dark:text-green-200">
            {message}
          </div>
        )}
        {error && (
          <div className="p-4 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg text-red-800 dark:text-red-200">
            {error}
          </div>
        )}

        {/* Avatar */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 border border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Avatar del salón</h2>
          <div className="flex items-center gap-6">
            <div className="relative">
              <div className="w-24 h-24 rounded-xl overflow-hidden bg-gray-100 dark:bg-gray-700 flex items-center justify-center border-2 border-gray-200 dark:border-gray-600">
                {formData.avatar ? (
                  <img src={formData.avatar} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-4xl">💈</span>
                )}
              </div>
              {uploadingAvatar && (
                <div className="absolute inset-0 bg-black/50 rounded-xl flex items-center justify-center">
                  <div className="animate-spin rounded-full h-6 w-6 border-2 border-white border-t-transparent"></div>
                </div>
              )}
            </div>
            <div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={handleAvatarUpload}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingAvatar}
                className="bg-blue-600 dark:bg-blue-700 text-white px-4 py-2 rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 disabled:opacity-50 transition-colors text-sm"
              >
                {uploadingAvatar ? 'Subiendo...' : 'Cambiar avatar'}
              </button>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">JPG, PNG o WebP. Máximo 5MB.</p>
            </div>
          </div>
        </div>

        {/* Información del negocio */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 border border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Información del negocio</h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="salonName" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Nombre del salón
              </label>
              <input
                type="text"
                id="salonName"
                value={formData.salonName}
                onChange={(e) => setFormData(prev => ({ ...prev, salonName: e.target.value }))}
                className="w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-lg px-3 py-2"
                placeholder="Mi Barbería"
                required
              />
            </div>

            <div>
              <label htmlFor="phone" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Teléfono
              </label>
              <input
                type="tel"
                id="phone"
                value={formData.phone}
                onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                className="w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-lg px-3 py-2"
                placeholder="809-555-1234"
                required
              />
            </div>

            <div>
              <label htmlFor="address" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Dirección
              </label>
              <input
                type="text"
                id="address"
                value={formData.address}
                onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
                className="w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-lg px-3 py-2"
                placeholder="Calle Principal #123, Ciudad"
                required
              />
            </div>

            <hr className="dark:border-gray-700" />

            <h3 className="text-md font-semibold text-gray-900 dark:text-gray-100">Depósito para reservas</h3>
            <p className="text-sm text-gray-600 dark:text-gray-300">
              El depósito es un monto que el cliente paga para confirmar su reserva. El precio completo del servicio se paga cuando el cliente llega.
            </p>

            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="requiresDeposit"
                checked={formData.requiresDeposit}
                onChange={(e) => setFormData(prev => ({ ...prev, requiresDeposit: e.target.checked }))}
                className="rounded border-gray-300 dark:border-gray-600 dark:bg-gray-700"
              />
              <label htmlFor="requiresDeposit" className="text-gray-700 dark:text-gray-300 font-medium text-sm">
                Requerir depósito para confirmar reservas
              </label>
            </div>

            {formData.requiresDeposit && (
              <div>
                <label htmlFor="depositAmount" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Monto del depósito
                </label>
                <input
                  type="number"
                  id="depositAmount"
                  min="0"
                  step="0.01"
                  value={formData.depositAmount}
                  onChange={(e) => setFormData(prev => ({ ...prev, depositAmount: e.target.value }))}
                  className="w-full max-w-xs border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-lg px-3 py-2"
                  placeholder="Ej: 150"
                />
              </div>
            )}

            <div className="pt-4">
              <button
                type="submit"
                disabled={saving}
                className="bg-blue-600 dark:bg-blue-700 text-white px-6 py-2 rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 disabled:opacity-50 transition-colors"
              >
                {saving ? 'Guardando...' : 'Guardar configuración'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

export default SettingsPage
