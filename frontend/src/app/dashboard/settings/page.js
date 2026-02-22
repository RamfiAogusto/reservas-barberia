'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import api, { getUserData, saveUserData } from '@/utils/api'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'

const BOOKING_MODES = [
  {
    value: 'LIBRE',
    label: 'Libre',
    icon: '📋',
    description: 'Sin pago previo. El cliente reserva y tú aceptas o rechazas.',
    detail: 'Ideal para barberías que cobran al llegar.'
  },
  {
    value: 'PREPAGO',
    label: 'Prepago',
    icon: '💳',
    description: 'El cliente paga un depósito al momento de reservar.',
    detail: 'Reduce no-shows. Puedes activar auto-confirmación.'
  },
  {
    value: 'PAGO_POST_APROBACION',
    label: 'Pago post-aprobación',
    icon: '✅',
    description: 'El cliente reserva, tú apruebas, y luego el cliente paga.',
    detail: 'Control total: primero revisas, luego el cliente paga.'
  }
]

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
    depositAmount: '',
    bookingMode: 'LIBRE',
    autoConfirmAfterPayment: false,
    holdDurationMinutes: '15',
    cancellationMinutesBefore: '60',
    noShowWaitMinutes: '15'
  })

  useEffect(() => {
    handleLoadProfile()
  }, [])

  const handleLoadProfile = async () => {
    try {
      setLoading(true)
      const response = await api.get('/users/profile')
      if (response.success && response.data) {
        const d = response.data
        setFormData({
          salonName: d.salonName || '',
          phone: d.phone || '',
          address: d.address || '',
          avatar: d.avatar || '',
          requiresDeposit: d.requiresDeposit ?? false,
          depositAmount: d.depositAmount ? String(d.depositAmount) : '',
          bookingMode: d.bookingMode || 'LIBRE',
          autoConfirmAfterPayment: d.autoConfirmAfterPayment ?? false,
          holdDurationMinutes: String(d.holdDurationMinutes ?? 15),
          cancellationMinutesBefore: String(d.cancellationMinutesBefore ?? 60),
          noShowWaitMinutes: String(d.noShowWaitMinutes ?? 15)
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
        headers: { 'Authorization': `Bearer ${token}` },
        body: formDataUpload
      })

      const data = await response.json()

      if (data.success) {
        setFormData(prev => ({ ...prev, avatar: data.data.avatar }))
        const userData = getUserData()
        if (userData) saveUserData({ ...userData, avatar: data.data.avatar })
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

  // Cuando se cambia el modo, ajustar requiresDeposit automáticamente
  const handleModeChange = (mode) => {
    setFormData(prev => ({
      ...prev,
      bookingMode: mode,
      requiresDeposit: mode !== 'LIBRE' ? true : prev.requiresDeposit,
      autoConfirmAfterPayment: mode === 'PREPAGO' ? prev.autoConfirmAfterPayment : false
    }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setMessage('')
    setError('')

    if (!formData.salonName.trim()) { setError('El nombre del salón es requerido'); return }
    if (!formData.phone.trim()) { setError('El teléfono es requerido'); return }
    if (!formData.address.trim()) { setError('La dirección es requerida'); return }

    const needsDeposit = formData.bookingMode !== 'LIBRE' || formData.requiresDeposit
    if (needsDeposit && (!formData.depositAmount || parseFloat(formData.depositAmount) <= 0)) {
      setError('Ingresa el monto del depósito para este modo de reserva')
      return
    }

    try {
      setSaving(true)
      const payload = {
        salonName: formData.salonName.trim(),
        phone: formData.phone.trim(),
        address: formData.address.trim(),
        bookingMode: formData.bookingMode,
        requiresDeposit: needsDeposit,
        depositAmount: needsDeposit ? parseFloat(formData.depositAmount) || 0 : 0,
        autoConfirmAfterPayment: formData.bookingMode === 'PREPAGO' ? formData.autoConfirmAfterPayment : false,
        holdDurationMinutes: parseInt(formData.holdDurationMinutes) || 15,
        cancellationMinutesBefore: parseInt(formData.cancellationMinutesBefore) || 60,
        noShowWaitMinutes: parseInt(formData.noShowWaitMinutes) || 15
      }

      const response = await api.put('/users/profile', payload)
      if (response.success) {
        setMessage('Configuración guardada correctamente')
        const userData = getUserData()
        if (userData) {
          saveUserData({
            ...userData,
            salonName: payload.salonName,
            phone: payload.phone,
            address: payload.address
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

  const needsDeposit = formData.bookingMode !== 'LIBRE' || formData.requiresDeposit
  const needsHold = formData.bookingMode === 'PREPAGO' || formData.bookingMode === 'PAGO_POST_APROBACION'

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
          <p className="text-gray-600 dark:text-gray-300">Administra tu perfil, modo de reservas y políticas</p>
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
              <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp" onChange={handleAvatarUpload} className="hidden" />
              <button type="button" onClick={() => fileInputRef.current?.click()} disabled={uploadingAvatar}
                className="bg-blue-600 dark:bg-blue-700 text-white px-4 py-2 rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 disabled:opacity-50 transition-colors text-sm">
                {uploadingAvatar ? 'Subiendo...' : 'Cambiar avatar'}
              </button>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">JPG, PNG o WebP. Máximo 5MB.</p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Información del negocio */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 border border-gray-200 dark:border-gray-700">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Información del negocio</h2>
            <div className="space-y-4">
              <div>
                <label htmlFor="salonName" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nombre del salón</label>
                <input type="text" id="salonName" value={formData.salonName}
                  onChange={(e) => setFormData(prev => ({ ...prev, salonName: e.target.value }))}
                  className="w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-lg px-3 py-2"
                  placeholder="Mi Barbería" required />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="phone" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Teléfono</label>
                  <input type="tel" id="phone" value={formData.phone}
                    onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                    className="w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-lg px-3 py-2"
                    placeholder="809-555-1234" required />
                </div>
                <div>
                  <label htmlFor="address" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Dirección</label>
                  <input type="text" id="address" value={formData.address}
                    onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
                    className="w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-lg px-3 py-2"
                    placeholder="Calle Principal #123" required />
                </div>
              </div>
            </div>
          </div>

          {/* ═══ Modo de Reserva ═══ */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 border border-gray-200 dark:border-gray-700">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-1">Modo de reserva</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
              Define cómo tus clientes reservan y pagan. Aplica globalmente a todos los servicios.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {BOOKING_MODES.map((mode) => {
                const isSelected = formData.bookingMode === mode.value
                return (
                  <button
                    key={mode.value}
                    type="button"
                    onClick={() => handleModeChange(mode.value)}
                    className={`text-left p-4 rounded-xl border-2 transition-all ${
                      isSelected
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 ring-1 ring-blue-500'
                        : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-2xl">{mode.icon}</span>
                      <span className={`font-semibold ${isSelected ? 'text-blue-700 dark:text-blue-300' : 'text-gray-900 dark:text-gray-100'}`}>
                        {mode.label}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-300 mb-1">{mode.description}</p>
                    <p className="text-xs text-gray-400 dark:text-gray-500">{mode.detail}</p>
                  </button>
                )
              })}
            </div>
          </div>

          {/* ═══ Depósito y Pago ═══ */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 border border-gray-200 dark:border-gray-700">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-1">Depósito y pago</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
              El depósito es un monto fijo que el cliente paga para reservar su horario. El servicio completo se paga al llegar.
            </p>

            {formData.bookingMode === 'LIBRE' && (
              <div className="flex items-center space-x-2 mb-4">
                <input type="checkbox" id="requiresDeposit" checked={formData.requiresDeposit}
                  onChange={(e) => setFormData(prev => ({ ...prev, requiresDeposit: e.target.checked }))}
                  className="rounded border-gray-300 dark:border-gray-600 dark:bg-gray-700 text-blue-600" />
                <label htmlFor="requiresDeposit" className="text-gray-700 dark:text-gray-300 font-medium text-sm">
                  Mostrar depósito como informativo (no se cobra online)
                </label>
              </div>
            )}

            {formData.bookingMode !== 'LIBRE' && (
              <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg mb-4 text-sm text-blue-700 dark:text-blue-300">
                El depósito es obligatorio en modo {formData.bookingMode === 'PREPAGO' ? 'Prepago' : 'Pago post-aprobación'}.
                No es reembolsable.
              </div>
            )}

            {needsDeposit && (
              <div className="space-y-4">
                <div>
                  <label htmlFor="depositAmount" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Monto del depósito ($)
                  </label>
                  <input type="number" id="depositAmount" min="0" step="0.01" value={formData.depositAmount}
                    onChange={(e) => setFormData(prev => ({ ...prev, depositAmount: e.target.value }))}
                    className="w-full max-w-xs border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-lg px-3 py-2"
                    placeholder="Ej: 150" />
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                    Monto fijo para reservar, independiente del precio del servicio.
                  </p>
                </div>
              </div>
            )}

            {/* Auto-confirmar (solo PREPAGO) */}
            {formData.bookingMode === 'PREPAGO' && (
              <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <div className="flex items-center space-x-2">
                  <input type="checkbox" id="autoConfirmAfterPayment" checked={formData.autoConfirmAfterPayment}
                    onChange={(e) => setFormData(prev => ({ ...prev, autoConfirmAfterPayment: e.target.checked }))}
                    className="rounded border-gray-300 dark:border-gray-600 dark:bg-gray-700 text-blue-600" />
                  <label htmlFor="autoConfirmAfterPayment" className="text-gray-700 dark:text-gray-300 font-medium text-sm">
                    Auto-confirmar al recibir pago
                  </label>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 ml-6">
                  {formData.autoConfirmAfterPayment 
                    ? 'La cita se confirma automáticamente cuando el cliente paga. No necesitas revisar.' 
                    : 'Después de pagar, la cita queda pendiente para que la revises y confirmes.'}
                </p>
              </div>
            )}

            {/* Duración del hold (PREPAGO y PAGO_POST_APROBACION) */}
            {needsHold && (
              <div className="mt-4">
                <label htmlFor="holdDurationMinutes" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Tiempo límite para pagar (minutos)
                </label>
                <input type="number" id="holdDurationMinutes" min="5" max="60" value={formData.holdDurationMinutes}
                  onChange={(e) => setFormData(prev => ({ ...prev, holdDurationMinutes: e.target.value }))}
                  className="w-full max-w-xs border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-lg px-3 py-2" />
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                  Si el cliente no paga en este tiempo, la reserva se libera automáticamente.
                </p>
              </div>
            )}
          </div>

          {/* ═══ Políticas ═══ */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 border border-gray-200 dark:border-gray-700">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-1">Políticas</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">Reglas de cancelación y no-shows (informativo para tus clientes).</p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="cancellationMinutesBefore" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Cancelación anticipada (min antes)
                </label>
                <input type="number" id="cancellationMinutesBefore" min="0" value={formData.cancellationMinutesBefore}
                  onChange={(e) => setFormData(prev => ({ ...prev, cancellationMinutesBefore: e.target.value }))}
                  className="w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-lg px-3 py-2" />
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                  Minutos antes de la cita que se puede cancelar. El depósito nunca se reembolsa.
                </p>
              </div>
              <div>
                <label htmlFor="noShowWaitMinutes" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Espera antes de marcar no-show (min)
                </label>
                <input type="number" id="noShowWaitMinutes" min="5" max="60" value={formData.noShowWaitMinutes}
                  onChange={(e) => setFormData(prev => ({ ...prev, noShowWaitMinutes: e.target.value }))}
                  className="w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-lg px-3 py-2" />
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                  Minutos a esperar después de la hora de la cita antes de marcar como No-Show.
                </p>
              </div>
            </div>

            {needsDeposit && (
              <div className="mt-4 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg text-sm text-amber-700 dark:text-amber-300">
                <strong>Política de depósito:</strong> El depósito nunca es reembolsable, sin importar cuándo cancele el cliente o si no asiste.
              </div>
            )}
          </div>

          {/* ═══ Resumen del flujo ═══ */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 border border-gray-200 dark:border-gray-700">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">Resumen del flujo de reserva</h2>
            <div className="flex items-start gap-3">
              {formData.bookingMode === 'LIBRE' ? (
                <div className="flex flex-wrap gap-2">
                  <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300">1. Cliente reserva</span>
                  <span className="text-gray-400">→</span>
                  <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300">2. Tú confirmas o rechazas</span>
                  <span className="text-gray-400">→</span>
                  <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300">3. Cliente asiste y paga</span>
                </div>
              ) : formData.bookingMode === 'PREPAGO' ? (
                <div className="flex flex-wrap gap-2">
                  <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300">1. Cliente reserva</span>
                  <span className="text-gray-400">→</span>
                  <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300">2. Paga depósito</span>
                  <span className="text-gray-400">→</span>
                  {formData.autoConfirmAfterPayment ? (
                    <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300">3. Confirmada auto</span>
                  ) : (
                    <>
                      <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300">3. Tú confirmas</span>
                      <span className="text-gray-400">→</span>
                      <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300">4. Confirmada</span>
                    </>
                  )}
                </div>
              ) : (
                <div className="flex flex-wrap gap-2">
                  <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300">1. Cliente reserva</span>
                  <span className="text-gray-400">→</span>
                  <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300">2. Tú apruebas</span>
                  <span className="text-gray-400">→</span>
                  <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300">3. Cliente paga depósito</span>
                  <span className="text-gray-400">→</span>
                  <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300">4. Confirmada</span>
                </div>
              )}
            </div>
          </div>

          {/* Guardar */}
          <div className="flex justify-end">
            <button type="submit" disabled={saving}
              className="bg-blue-600 dark:bg-blue-700 text-white px-8 py-3 rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 disabled:opacity-50 transition-colors font-medium">
              {saving ? 'Guardando...' : 'Guardar configuración'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default SettingsPage
