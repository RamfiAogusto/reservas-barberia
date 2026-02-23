'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import api, { getUserData, saveUserData } from '@/utils/api'
import { toast } from 'sonner'

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Separator } from '@/components/ui/separator'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2, Save, Upload, AlertCircle, CheckCircle2 } from 'lucide-react'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'

const FLOW_STEPS = {
  LIBRE: [
    { label: 'Cliente reserva', color: 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300' },
    { label: 'Tu confirmas o rechazas', color: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300' },
    { label: 'Cliente llega y paga', color: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300' },
  ],
  PREPAGO: [
    { label: 'Cliente reserva y paga deposito', color: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300' },
    { label: 'Se confirma automaticamente', color: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300' },
    { label: 'Cliente llega y paga el resto', color: 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300' },
  ],
  PAGO_POST_APROBACION: [
    { label: 'Cliente solicita reserva', color: 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300' },
    { label: 'Tu apruebas o rechazas', color: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300' },
    { label: 'Cliente paga deposito', color: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300' },
    { label: 'Reserva confirmada', color: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300' },
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
    salonName: '', phone: '', address: '', avatar: '',
    requiresDeposit: false, depositAmount: '', bookingMode: 'LIBRE',
    holdDurationMinutes: '15', cancellationMinutesBefore: '60', noShowWaitMinutes: '15'
  })

  useEffect(() => { handleLoadProfile() }, [])

  const handleLoadProfile = async () => {
    try {
      setLoading(true)
      const response = await api.get('/users/profile')
      if (response.success && response.data) {
        const d = response.data
        setFormData({
          salonName: d.salonName || '', phone: d.phone || '', address: d.address || '', avatar: d.avatar || '',
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
    } finally { setLoading(false) }
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
        toast.success('Avatar actualizado')
      } else {
        setError(data.message || 'Error al subir el avatar')
      }
    } catch (err) {
      console.error('Error subiendo avatar:', err)
      setError('Error al subir el avatar')
    } finally { setUploadingAvatar(false) }
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
        salonName: formData.salonName.trim(), phone: formData.phone.trim(), address: formData.address.trim(),
        bookingMode: formData.bookingMode, requiresDeposit: needsDeposit,
        depositAmount: needsDeposit ? parseFloat(formData.depositAmount) || 0 : 0,
        holdDurationMinutes: parseInt(formData.holdDurationMinutes) || 15,
        cancellationMinutesBefore: parseInt(formData.cancellationMinutesBefore) || 60,
        noShowWaitMinutes: parseInt(formData.noShowWaitMinutes) || 15
      }
      const response = await api.put('/users/profile', payload)
      if (response.success) {
        setMessage('Configuracion guardada correctamente')
        const userData = getUserData()
        if (userData) saveUserData({ ...userData, salonName: payload.salonName, phone: payload.phone, address: payload.address })
      } else {
        setError(response.message || 'Error al guardar')
      }
    } catch (err) {
      console.error('Error guardando:', err)
      setError('Error al guardar la configuracion')
    } finally { setSaving(false) }
  }

  const needsDeposit = formData.bookingMode !== 'LIBRE' || formData.requiresDeposit

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-10 w-10 animate-spin text-primary-600" />
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Configuración</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Personaliza tu negocio y modo de reservas</p>
      </div>

      {message && (
        <Alert variant="success">
          <CheckCircle2 className="h-4 w-4" />
          <AlertDescription>{message}</AlertDescription>
        </Alert>
      )}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* PERFIL DEL NEGOCIO */}
      <Card>
        <CardHeader>
          <CardTitle>Perfil del negocio</CardTitle>
          <CardDescription>Información visible para tus clientes</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center gap-5 pb-6 border-b border-gray-100 dark:border-gray-700">
            <div className="relative">
              <div className="w-20 h-20 rounded-xl overflow-hidden bg-gray-100 dark:bg-gray-700 flex items-center justify-center border-2 border-gray-200 dark:border-gray-600">
                {formData.avatar
                  ? <img src={formData.avatar} alt="Avatar" className="w-full h-full object-cover" />
                  : <span className="text-3xl">💈</span>}
              </div>
              {uploadingAvatar && (
                <div className="absolute inset-0 bg-black/50 rounded-xl flex items-center justify-center">
                  <Loader2 className="h-5 w-5 animate-spin text-white" />
                </div>
              )}
            </div>
            <div>
              <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp" onChange={handleAvatarUpload} className="hidden" />
              <Button type="button" variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} disabled={uploadingAvatar}>
                <Upload className="w-4 h-4 mr-2" />
                {uploadingAvatar ? 'Subiendo...' : 'Cambiar avatar'}
              </Button>
              <p className="text-xs text-gray-400 mt-1">JPG, PNG o WebP. Max 5MB.</p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="set-salonName">Nombre del salón <span className="text-red-400">*</span></Label>
              <Input id="set-salonName" value={formData.salonName} onChange={(e) => setFormData(prev => ({ ...prev, salonName: e.target.value }))} placeholder="Mi Barbería" required />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="set-phone">Teléfono <span className="text-red-400">*</span></Label>
                <Input id="set-phone" type="tel" value={formData.phone} onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))} placeholder="809-555-1234" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="set-address">Dirección <span className="text-red-400">*</span></Label>
                <Input id="set-address" value={formData.address} onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))} placeholder="Calle Principal #123" required />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* MODO DE RESERVA */}
        <Card>
          <CardHeader>
            <CardTitle>¿Cómo quieres manejar las reservas?</CardTitle>
            <CardDescription>Elige el flujo que mejor se adapte a tu negocio</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <ModeCard selected={formData.bookingMode === 'LIBRE'} onClick={() => handleModeChange('LIBRE')}
                title="Reserva libre" description="El cliente reserva, tu decides si aceptar. Se paga al llegar."
                tag="Sin pago online" tagColor="gray" />
              <ModeCard selected={formData.bookingMode === 'PREPAGO'} onClick={() => handleModeChange('PREPAGO')}
                title="Pago al reservar" description="El cliente paga un deposito al momento de reservar. La cita se confirma automaticamente."
                tag="Reduce no-shows" tagColor="blue" />
              <ModeCard selected={formData.bookingMode === 'PAGO_POST_APROBACION'} onClick={() => handleModeChange('PAGO_POST_APROBACION')}
                title="Aprobación + pago" description="Primero revisas la solicitud. Si la apruebas, el cliente recibe un link para pagar."
                tag="Control total" tagColor="green" />
            </div>

            <Separator />

            <div>
              <p className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-3">Así funciona este modo:</p>
              <div className="flex flex-wrap items-center gap-2">
                {FLOW_STEPS[formData.bookingMode].map((step, i) => (
                  <div key={i} className="flex items-center gap-2">
                    {i > 0 && <span className="text-gray-300 dark:text-gray-600 text-sm">→</span>}
                    <span className={'inline-flex items-center px-3 py-1.5 rounded-full text-xs font-medium ' + step.color}>
                      {i + 1}. {step.label}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* DEPOSITO */}
        {formData.bookingMode !== 'LIBRE' ? (
          <Card>
            <CardHeader>
              <CardTitle>Depósito</CardTitle>
              <CardDescription>Monto que el cliente paga para asegurar su cita</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Monto del depósito ($)</Label>
                <Input type="number" min="1" step="0.01" value={formData.depositAmount} onChange={(e) => setFormData(prev => ({ ...prev, depositAmount: e.target.value }))} className="max-w-xs" placeholder="Ej: 150" />
                <p className="text-xs text-gray-400">Monto fijo, independiente del precio del servicio.</p>
              </div>
              <div className="space-y-2">
                <Label>Tiempo límite para pagar (minutos)</Label>
                <Input type="number" min="5" max="60" value={formData.holdDurationMinutes} onChange={(e) => setFormData(prev => ({ ...prev, holdDurationMinutes: e.target.value }))} className="max-w-xs" />
                <p className="text-xs text-gray-400">Si el cliente no paga en este tiempo, el horario se libera.</p>
              </div>
              <div className="flex items-start gap-2 p-3 bg-amber-50 dark:bg-amber-900/15 rounded-lg">
                <AlertCircle className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
                <p className="text-xs text-amber-700 dark:text-amber-400">
                  El depósito <strong>no es reembolsable</strong>. Si el cliente cancela o no asiste, el depósito se retiene.
                </p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>Depósito (opcional)</CardTitle>
              <CardDescription>Puedes mostrar un depósito informativo sin cobro online</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center space-x-3">
                <Switch
                  id="set-requiresDeposit"
                  checked={formData.requiresDeposit}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, requiresDeposit: checked }))}
                />
                <Label htmlFor="set-requiresDeposit" className="font-normal cursor-pointer">Mostrar monto de depósito en la página de reservas</Label>
              </div>
              {formData.requiresDeposit && (
                <div className="space-y-2">
                  <Label>Monto del depósito ($)</Label>
                  <Input type="number" min="0" step="0.01" value={formData.depositAmount} onChange={(e) => setFormData(prev => ({ ...prev, depositAmount: e.target.value }))} className="max-w-xs" placeholder="Ej: 100" />
                  <p className="text-xs text-gray-400">Se muestra como referencia. El cliente paga al llegar al salón.</p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* POLITICAS */}
        <Card>
          <CardHeader>
            <CardTitle>Políticas</CardTitle>
            <CardDescription>Reglas de cancelación y puntualidad</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Cancelar con anticipación de (min)</Label>
                <Input type="number" min="0" value={formData.cancellationMinutesBefore} onChange={(e) => setFormData(prev => ({ ...prev, cancellationMinutesBefore: e.target.value }))} />
                <p className="text-xs text-gray-400">Minutos antes de la cita para permitir cancelación.</p>
              </div>
              <div className="space-y-2">
                <Label>Marcar no-show después de (min)</Label>
                <Input type="number" min="5" max="60" value={formData.noShowWaitMinutes} onChange={(e) => setFormData(prev => ({ ...prev, noShowWaitMinutes: e.target.value }))} />
                <p className="text-xs text-gray-400">Minutos de espera tras la hora de la cita.</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end pb-8">
          <Button type="submit" disabled={saving} size="lg">
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            {saving ? 'Guardando...' : 'Guardar configuración'}
          </Button>
        </div>
      </form>
    </div>
  )
}

function ModeCard({ selected, onClick, title, description, tag, tagColor }) {
  const tagColors = {
    gray: 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400',
    blue: 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400',
    green: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400',
  }
  return (
    <button type="button" onClick={onClick}
      className={'w-full text-left p-4 rounded-xl border-2 transition-all ' + (
        selected
          ? 'border-primary-500 bg-primary-50/50 dark:bg-primary-900/10 shadow-sm'
          : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
      )}
      role="radio"
      aria-checked={selected}
      tabIndex={0}
    >
      <div className="flex items-start gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={'font-semibold ' + (selected ? 'text-primary-700 dark:text-primary-300' : 'text-gray-900 dark:text-gray-100')}>
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
          selected ? 'border-primary-500 bg-primary-500' : 'border-gray-300 dark:border-gray-600'
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
