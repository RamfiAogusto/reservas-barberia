'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import api, { getUserData, saveUserData } from '@/utils/api'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'

// Flujos visuales por modo
const FLOW_STEPS = {
  LIBRE: [
    { label: 'Cliente reserva', color: 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300' },
    { label: 'Tu confirmas o rechazas', color: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300' },
    { label: 'Cliente llega y paga', color: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300' },
  ],
  PREPAGO: [
    { label: 'Cliente reserva y paga deposito', color: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300' },
    { label: 'Se confirma automaticamente', color: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300' },
    { label: 'Cliente llega y paga el resto', color: 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300' },
  ],
  PAGO_POST_APROBACION: [
    { label: 'Cliente solicita reserva', color: 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300' },
    { label: 'Tu apruebas o rechazas', color: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300' },
    { label: 'Cliente paga deposito', color: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300' },
    { label: 'Reserva confirmada', color: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300' },
  ],
}

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
    holdDurationMinutes: '15',
    cancellationMinutesBefore: '60',
    noShowWaitMinutes: '15'
  })

  useEffect(() => { handleLoadProfile() }, [])

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
          holdDurationMinutes: String(d.holdDurationMinutes ?? 15),
          cancellationMinutesBefore: String(d.cancellationMinutesBefore ?? 60),
          noShowWaitMinutes: String(d.noShowWaitMinutes ?? 15)
        })
      }
    } catch (err) {
      console.error('Error cargando perfil:', err)
      setError('Error al cargar la configuracion')
    } finally {
      setLoading(false)
    }
  }

  const handleAvatarUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg', 'image/webp']
    if (!allowedTypes.includes(file.type)) { setError('Solo se permiten imagenes JPG, PNG y WebP'); return }
    if (file.size > 5 * 1024 * 1024) { setError('La imagen no puede superar los 5MB'); return }
    try {
      setUploadingAvatar(true)
      setError('')
      const formDataUpload = new FormData()
      formDataUpload.append('avatar', file)
      const token = localStorage.getItem('authToken')
      const response = await fetch(API_BASE_URL + '/users/profile/avatar', {
        method: 'POST',
        headers: { 'Authorization': 'Bearer ' + token },
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

  const handleModeChange = (mode) => {
    setFormData(prev => ({
      ...prev,
      bookingMode: mode,
      requiresDeposit: mode !== 'LIBRE' ? true : prev.requiresDeposit
    }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setMessage('')
    setError('')
    if (!formData.salonName.trim()) { setError('El nombre del salon es requerido'); return }
    if (!formData.phone.trim()) { setError('El telefono es requerido'); return }
    if (!formData.address.trim()) { setError('La direccion es requerida'); return }
    const needsDeposit = formData.bookingMode !== 'LIBRE' || formData.requiresDeposit
    if (formData.bookingMode !== 'LIBRE' && (!formData.depositAmount || parseFloat(formData.depositAmount) <= 0)) {
      setError('El deposito es obligatorio para este modo de reserva')
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
        holdDurationMinutes: parseInt(formData.holdDurationMinutes) || 15,
        cancellationMinutesBefore: parseInt(formData.cancellationMinutesBefore) || 60,
        noShowWaitMinutes: parseInt(formData.noShowWaitMinutes) || 15
      }
      const response = await api.put('/users/profile', payload)
      if (response.success) {
        setMessage('Configuracion guardada correctamente')
        const userData = getUserData()
        if (userData) {
          saveUserData({ ...userData, salonName: payload.salonName, phone: payload.phone, address: payload.address })
        }
      } else {
        setError(response.message || 'Error al guardar')
      }
    } catch (err) {
      console.error('Error guardando:', err)
      setError('Error al guardar la configuracion')
    } finally {
      setSaving(false)
    }
  }

  const needsDeposit = formData.bookingMode !== 'LIBRE' || formData.requiresDeposit
  const needsHold = formData.bookingMode === 'PREPAGO' || formData.bookingMode === 'PAGO_POST_APROBACION'

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-2 border-blue-600 dark:border-blue-400 border-t-transparent" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 shadow-sm border-b dark:border-gray-700">
        <div className="max-w-3xl mx-auto px-4 py-6">
          <button onClick={() => router.push('/dashboard')}
            className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 text-sm mb-3 flex items-center gap-1">
            {'<-'} Volver al Dashboard
          </button>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Configuracion</h1>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
        {/* Alerts */}
        {message && (
          <div className="p-4 bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800 rounded-xl text-green-800 dark:text-green-200 text-sm">
            {message}
          </div>
        )}
        {error && (
          <div className="p-4 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-xl text-red-800 dark:text-red-200 text-sm">
            {error}
          </div>
        )}

        {/* SECCION 1: PERFIL DEL NEGOCIO */}
        <Section title="Perfil del negocio" subtitle="Informacion visible para tus clientes">
          {/* Avatar */}
          <div className="flex items-center gap-5 mb-6 pb-6 border-b border-gray-100 dark:border-gray-700">
            <div className="relative">
              <div className="w-20 h-20 rounded-xl overflow-hidden bg-gray-100 dark:bg-gray-700 flex items-center justify-center border-2 border-gray-200 dark:border-gray-600">
                {formData.avatar
                  ? <img src={formData.avatar} alt="Avatar" className="w-full h-full object-cover" />
                  : <span className="text-3xl">{''}</span>}
              </div>
              {uploadingAvatar && (
                <div className="absolute inset-0 bg-black/50 rounded-xl flex items-center justify-center">
                  <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent" />
                </div>
              )}
            </div>
            <div>
              <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp" onChange={handleAvatarUpload} className="hidden" />
              <button type="button" onClick={() => fileInputRef.current?.click()} disabled={uploadingAvatar}
                className="bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 px-4 py-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-50 transition-colors text-sm font-medium">
                {uploadingAvatar ? 'Subiendo...' : 'Cambiar avatar'}
              </button>
              <p className="text-xs text-gray-400 mt-1">JPG, PNG o WebP. Max 5MB.</p>
            </div>
          </div>
          {/* Business fields */}
          <div className="space-y-4">
            <Field label="Nombre del salon" required>
              <input type="text" value={formData.salonName}
                onChange={(e) => setFormData(prev => ({ ...prev, salonName: e.target.value }))}
                className="w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500 dark:focus:border-blue-400 transition-colors"
                placeholder="Mi Barberia" required />
            </Field>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Telefono" required>
                <input type="tel" value={formData.phone}
                  onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                  className="w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500 dark:focus:border-blue-400 transition-colors"
                  placeholder="809-555-1234" required />
              </Field>
              <Field label="Direccion" required>
                <input type="text" value={formData.address}
                  onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
                  className="w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500 dark:focus:border-blue-400 transition-colors"
                  placeholder="Calle Principal #123" required />
              </Field>
            </div>
          </div>
        </Section>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* SECCION 2: MODO DE RESERVA */}
          <Section title="Como quieres manejar las reservas?" subtitle="Elige el flujo que mejor se adapte a tu negocio">
            <div className="space-y-3">
              <ModeCard selected={formData.bookingMode === 'LIBRE'} onClick={() => handleModeChange('LIBRE')}
                icon="" title="Reserva libre"
                description="El cliente reserva, tu decides si aceptar. Se paga al llegar."
                tag="Sin pago online" tagColor="gray" />
              <ModeCard selected={formData.bookingMode === 'PREPAGO'} onClick={() => handleModeChange('PREPAGO')}
                icon="" title="Pago al reservar"
                description="El cliente paga un deposito al momento de reservar. La cita se confirma automaticamente."
                tag="Reduce no-shows" tagColor="blue" />
              <ModeCard selected={formData.bookingMode === 'PAGO_POST_APROBACION'} onClick={() => handleModeChange('PAGO_POST_APROBACION')}
                icon="" title="Aprobacion + pago"
                description="Primero revisas la solicitud. Si la apruebas, el cliente recibe un link para pagar."
                tag="Control total" tagColor="green" />
            </div>
            {/* Flujo visual */}
            <div className="mt-5 pt-5 border-t border-gray-100 dark:border-gray-700">
              <p className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-3">Asi funciona este modo:</p>
              <div className="flex flex-wrap items-center gap-2">
                {FLOW_STEPS[formData.bookingMode].map((step, i) => (
                  <div key={i} className="flex items-center gap-2">
                    {i > 0 && <span className="text-gray-300 dark:text-gray-600 text-sm">{''}</span>}
                    <span className={'inline-flex items-center px-3 py-1.5 rounded-full text-xs font-medium ' + step.color}>
                      {i + 1}. {step.label}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </Section>

          {/* SECCION 3: DEPOSITO */}
          {formData.bookingMode !== 'LIBRE' ? (
            <Section title="Deposito" subtitle="Monto que el cliente paga para asegurar su cita">
              <div className="space-y-4">
                <Field label="Monto del deposito ($)">
                  <input type="number" min="1" step="0.01" value={formData.depositAmount}
                    onChange={(e) => setFormData(prev => ({ ...prev, depositAmount: e.target.value }))}
                    className="w-full max-w-xs border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500 dark:focus:border-blue-400 transition-colors"
                    placeholder="Ej: 150" />
                  <p className="text-xs text-gray-400 mt-1">Monto fijo, independiente del precio del servicio.</p>
                </Field>
                <Field label="Tiempo limite para pagar (minutos)">
                  <input type="number" min="5" max="60" value={formData.holdDurationMinutes}
                    onChange={(e) => setFormData(prev => ({ ...prev, holdDurationMinutes: e.target.value }))}
                    className="w-full max-w-xs border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500 dark:focus:border-blue-400 transition-colors" />
                  <p className="text-xs text-gray-400 mt-1">Si el cliente no paga en este tiempo, el horario se libera.</p>
                </Field>
                <div className="flex items-start gap-2 p-3 bg-amber-50 dark:bg-amber-900/15 rounded-lg">
                  <span className="text-amber-500 mt-0.5">{''}</span>
                  <p className="text-xs text-amber-700 dark:text-amber-400">
                    El deposito <strong>no es reembolsable</strong>. Si el cliente cancela o no asiste, el deposito se retiene.
                  </p>
                </div>
              </div>
            </Section>
          ) : (
            <Section title="Deposito (opcional)" subtitle="Puedes mostrar un deposito informativo sin cobro online">
              <div className="space-y-4">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input type="checkbox" checked={formData.requiresDeposit}
                    onChange={(e) => setFormData(prev => ({ ...prev, requiresDeposit: e.target.checked }))}
                    className="rounded border-gray-300 dark:border-gray-600 dark:bg-gray-700 text-blue-600 w-4 h-4" />
                  <span className="text-sm text-gray-700 dark:text-gray-300">Mostrar monto de deposito en la pagina de reservas</span>
                </label>
                {formData.requiresDeposit && (
                  <Field label="Monto del deposito ($)">
                    <input type="number" min="0" step="0.01" value={formData.depositAmount}
                      onChange={(e) => setFormData(prev => ({ ...prev, depositAmount: e.target.value }))}
                      className="w-full max-w-xs border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500 dark:focus:border-blue-400 transition-colors"
                      placeholder="Ej: 100" />
                    <p className="text-xs text-gray-400 mt-1">Se muestra como referencia. El cliente paga al llegar al salon.</p>
                  </Field>
                )}
              </div>
            </Section>
          )}

          {/* SECCION 4: POLITICAS */}
          <Section title="Politicas" subtitle="Reglas de cancelacion y puntualidad">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Cancelar con anticipacion de (min)">
                <input type="number" min="0" value={formData.cancellationMinutesBefore}
                  onChange={(e) => setFormData(prev => ({ ...prev, cancellationMinutesBefore: e.target.value }))}
                  className="w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500 dark:focus:border-blue-400 transition-colors" />
                <p className="text-xs text-gray-400 mt-1">Minutos antes de la cita para permitir cancelacion.</p>
              </Field>
              <Field label="Marcar no-show despues de (min)">
                <input type="number" min="5" max="60" value={formData.noShowWaitMinutes}
                  onChange={(e) => setFormData(prev => ({ ...prev, noShowWaitMinutes: e.target.value }))}
                  className="w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500 dark:focus:border-blue-400 transition-colors" />
                <p className="text-xs text-gray-400 mt-1">Minutos de espera tras la hora de la cita.</p>
              </Field>
            </div>
          </Section>

          {/* Guardar */}
          <div className="flex justify-end pb-8">
            <button type="submit" disabled={saving}
              className="bg-blue-600 dark:bg-blue-500 text-white px-8 py-3 rounded-xl hover:bg-blue-700 dark:hover:bg-blue-600 disabled:opacity-50 transition-colors font-medium shadow-lg shadow-blue-600/20">
              {saving ? 'Guardando...' : 'Guardar configuracion'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// Componentes auxiliares

function Section({ title, subtitle, children }) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
      <div className="px-6 pt-5 pb-1">
        <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">{title}</h2>
        {subtitle && <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{subtitle}</p>}
      </div>
      <div className="px-6 pb-6 pt-4">{children}</div>
    </div>
  )
}

function Field({ label, required, children }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
        {label}{required && <span className="text-red-400 ml-0.5">*</span>}
      </label>
      {children}
    </div>
  )
}

function ModeCard({ selected, onClick, icon, title, description, tag, tagColor }) {
  const tagColors = {
    gray: 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400',
    blue: 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400',
    green: 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400',
  }
  return (
    <button type="button" onClick={onClick}
      className={'w-full text-left p-4 rounded-xl border-2 transition-all ' + (
        selected
          ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-900/10 shadow-sm'
          : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
      )}>
      <div className="flex items-start gap-3">
        <span className="text-2xl mt-0.5">{icon}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={'font-semibold ' + (selected ? 'text-blue-700 dark:text-blue-300' : 'text-gray-900 dark:text-gray-100')}>
              {title}
            </span>
            {tag && (
              <span className={'text-[10px] font-medium px-2 py-0.5 rounded-full ' + (tagColors[tagColor] || tagColors.gray)}>
                {tag}
              </span>
            )}
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{description}</p>
        </div>
        <div className={'w-5 h-5 rounded-full border-2 flex-shrink-0 flex items-center justify-center mt-1 transition-colors ' + (
          selected ? 'border-blue-500 bg-blue-500' : 'border-gray-300 dark:border-gray-600'
        )}>
          {selected && (
            <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          )}
        </div>
      </div>
    </button>
  )
}

export default SettingsPage
