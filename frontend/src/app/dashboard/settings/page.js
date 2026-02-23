'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import api, { getUserData, saveUserData } from '@/utils/api'
import { toast } from 'sonner'

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Loader2, Save, Upload, AlertCircle, CheckCircle2,
  Store, CalendarCheck, ShieldCheck, BookOpen,
  ArrowRight, Clock, Ban, DollarSign, UserCheck, CreditCard,
} from 'lucide-react'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'

const MODES = [
  {
    id: 'LIBRE',
    icon: CalendarCheck,
    title: 'Reserva libre',
    subtitle: 'Sin pago online',
    description: 'El cliente reserva un horario y tú decides si aceptarlo. No se cobra nada online, el pago es al llegar.',
    color: 'emerald',
    ideal: 'Ideal si prefieres confirmar manualmente y no necesitas cobrar por adelantado.',
    steps: [
      { icon: '📅', text: 'El cliente elige servicio, fecha y hora' },
      { icon: '📩', text: 'Recibes la solicitud en tu dashboard' },
      { icon: '✅', text: 'Tú confirmas o rechazas la cita' },
      { icon: '💰', text: 'El cliente paga al llegar al salón' },
    ],
  },
  {
    id: 'PREPAGO',
    icon: CreditCard,
    title: 'Pago al reservar',
    subtitle: 'Confirmación automática',
    description: 'El cliente paga un depósito al momento de reservar. La cita se confirma automáticamente sin tu intervención.',
    color: 'blue',
    ideal: 'Ideal para reducir no-shows. El depósito asegura que el cliente asista.',
    steps: [
      { icon: '📅', text: 'El cliente elige servicio, fecha y hora' },
      { icon: '💳', text: 'Paga el depósito online inmediatamente' },
      { icon: '✅', text: 'La cita se confirma automáticamente' },
      { icon: '💰', text: 'El cliente paga el resto al llegar' },
    ],
  },
  {
    id: 'PAGO_POST_APROBACION',
    icon: ShieldCheck,
    title: 'Aprobación + pago',
    subtitle: 'Control total',
    description: 'El cliente solicita una cita. Tú la revisas y si la apruebas, le envías un link para que pague el depósito.',
    color: 'violet',
    ideal: 'Ideal si quieres revisar cada solicitud antes de comprometerte y asegurar el pago.',
    steps: [
      { icon: '📅', text: 'El cliente solicita una cita' },
      { icon: '👀', text: 'Tú revisas y apruebas (o rechazas)' },
      { icon: '📧', text: 'El cliente recibe un link para pagar' },
      { icon: '💳', text: 'Paga el depósito dentro del tiempo límite' },
      { icon: '✅', text: 'La cita queda confirmada' },
    ],
  },
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
    salonName: '', phone: '', address: '', avatar: '',
    requiresDeposit: false, depositAmount: '', bookingMode: 'LIBRE',
    holdDurationMinutes: '15', cancellationMinutesBefore: '60', noShowWaitMinutes: '15',
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
          noShowWaitMinutes: String(d.noShowWaitMinutes ?? 15),
        })
      }
    } catch (err) {
      console.error('Error cargando perfil:', err)
      setError('Error al cargar la configuración')
    } finally { setLoading(false) }
  }

  const handleAvatarUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg', 'image/webp']
    if (!allowedTypes.includes(file.type)) { toast.error('Solo se permiten imágenes JPG, PNG y WebP'); return }
    if (file.size > 5 * 1024 * 1024) { toast.error('La imagen no puede superar los 5MB'); return }
    try {
      setUploadingAvatar(true)
      const formDataUpload = new FormData()
      formDataUpload.append('avatar', file)
      const token = localStorage.getItem('authToken')
      const response = await fetch(API_BASE_URL + '/users/profile/avatar', {
        method: 'POST',
        headers: { 'Authorization': 'Bearer ' + token },
        body: formDataUpload,
      })
      const data = await response.json()
      if (data.success) {
        setFormData(prev => ({ ...prev, avatar: data.data.avatar }))
        const userData = getUserData()
        if (userData) saveUserData({ ...userData, avatar: data.data.avatar })
        toast.success('Avatar actualizado')
      } else {
        toast.error(data.message || 'Error al subir el avatar')
      }
    } catch (err) {
      console.error('Error subiendo avatar:', err)
      toast.error('Error al subir el avatar')
    } finally { setUploadingAvatar(false) }
  }

  const handleModeChange = (mode) => {
    setFormData(prev => ({
      ...prev,
      bookingMode: mode,
      requiresDeposit: mode !== 'LIBRE' ? true : prev.requiresDeposit,
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
    if (formData.bookingMode !== 'LIBRE' && (!formData.depositAmount || parseFloat(formData.depositAmount) <= 0)) {
      setError('El depósito es obligatorio para este modo de reserva')
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
        noShowWaitMinutes: parseInt(formData.noShowWaitMinutes) || 15,
      }
      const response = await api.put('/users/profile', payload)
      if (response.success) {
        toast.success('Configuración guardada correctamente')
        setMessage('Configuración guardada correctamente')
        const userData = getUserData()
        if (userData) saveUserData({ ...userData, salonName: payload.salonName, phone: payload.phone, address: payload.address })
      } else {
        setError(response.message || 'Error al guardar')
      }
    } catch (err) {
      console.error('Error guardando:', err)
      setError('Error al guardar la configuración')
    } finally { setSaving(false) }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-10 w-10 animate-spin text-primary-600" />
      </div>
    )
  }

  const selectedMode = MODES.find(m => m.id === formData.bookingMode) || MODES[0]

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Configuración</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Personaliza tu negocio y modo de reservas</p>
        </div>
        <Link href="/dashboard/guide">
          <Button variant="outline" size="sm">
            <BookOpen className="w-4 h-4 mr-2" />
            Ver guía completa
          </Button>
        </Link>
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

      <Tabs defaultValue="profile" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="profile" className="gap-2">
            <Store className="w-4 h-4 hidden sm:block" /> Negocio
          </TabsTrigger>
          <TabsTrigger value="booking" className="gap-2">
            <CalendarCheck className="w-4 h-4 hidden sm:block" /> Reservas
          </TabsTrigger>
          <TabsTrigger value="policies" className="gap-2">
            <ShieldCheck className="w-4 h-4 hidden sm:block" /> Políticas
          </TabsTrigger>
        </TabsList>

        {/* ═══════════ TAB 1: PERFIL DEL NEGOCIO ═══════════ */}
        <TabsContent value="profile">
          <Card>
            <CardHeader>
              <CardTitle>Perfil del negocio</CardTitle>
              <CardDescription>Esta información es visible para tus clientes en tu página pública de reservas</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center gap-5 pb-6 border-b border-gray-100 dark:border-gray-800">
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
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">JPG, PNG o WebP. Max 5MB.</p>
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
        </TabsContent>

        {/* ═══════════ TAB 2: MODO DE RESERVAS + DEPÓSITO ═══════════ */}
        <TabsContent value="booking">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Selector de modo */}
            <Card>
              <CardHeader>
                <CardTitle>Modo de reservas</CardTitle>
                <CardDescription>
                  Elige cómo quieres que funcione el proceso de reserva. Esto aplica a todo el salón.
                  <Link href="/dashboard/guide" className="text-primary-600 dark:text-primary-400 hover:underline ml-1">¿Necesitas ayuda para decidir?</Link>
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="space-y-3" role="radiogroup" aria-label="Modo de reservas">
                  {MODES.map((mode) => {
                    const isSelected = formData.bookingMode === mode.id
                    const colorMap = {
                      emerald: { border: 'border-emerald-500', bg: 'bg-emerald-50 dark:bg-emerald-900/10', text: 'text-emerald-700 dark:text-emerald-300', badge: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300' },
                      blue: { border: 'border-blue-500', bg: 'bg-blue-50 dark:bg-blue-900/10', text: 'text-blue-700 dark:text-blue-300', badge: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300' },
                      violet: { border: 'border-violet-500', bg: 'bg-violet-50 dark:bg-violet-900/10', text: 'text-violet-700 dark:text-violet-300', badge: 'bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300' },
                    }
                    const c = colorMap[mode.color]
                    return (
                      <button key={mode.id} type="button" onClick={() => handleModeChange(mode.id)}
                        className={`w-full text-left p-5 rounded-xl border-2 transition-all ${isSelected ? `${c.border} ${c.bg} shadow-sm` : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'}`}
                        role="radio" aria-checked={isSelected} tabIndex={0}
                      >
                        <div className="flex items-start gap-4">
                          <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${isSelected ? c.badge : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400'}`}>
                            <mode.icon className="w-5 h-5" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className={`font-semibold ${isSelected ? c.text : 'text-gray-900 dark:text-gray-100'}`}>{mode.title}</span>
                              <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${isSelected ? c.badge : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400'}`}>{mode.subtitle}</span>
                            </div>
                            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{mode.description}</p>
                            {isSelected && <p className="text-xs text-gray-400 dark:text-gray-500 mt-2 italic">{mode.ideal}</p>}
                          </div>
                          <div className={`w-5 h-5 rounded-full border-2 flex-shrink-0 flex items-center justify-center mt-1 transition-colors ${isSelected ? `${c.border} bg-current` : 'border-gray-300 dark:border-gray-600'}`}>
                            {isSelected && (
                              <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                              </svg>
                            )}
                          </div>
                        </div>
                      </button>
                    )
                  })}
                </div>

                <Separator />

                {/* Flujo visual del modo seleccionado */}
                <div className="p-4 rounded-xl bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-700">
                  <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-4">
                    Así funciona "{selectedMode.title}" paso a paso:
                  </p>
                  <div className="space-y-2.5">
                    {selectedMode.steps.map((step, i) => (
                      <div key={i} className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 flex items-center justify-center flex-shrink-0 text-sm">
                          {step.icon}
                        </div>
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <span className="text-xs font-bold text-gray-400 dark:text-gray-500 w-4">{i + 1}.</span>
                          <span className="text-sm text-gray-700 dark:text-gray-300">{step.text}</span>
                        </div>
                        {i < selectedMode.steps.length - 1 && (
                          <ArrowRight className="w-3.5 h-3.5 text-gray-300 dark:text-gray-600 flex-shrink-0 hidden sm:block" />
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Depósito */}
            {formData.bookingMode !== 'LIBRE' ? (
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <DollarSign className="w-5 h-5 text-primary-600" />
                    <div>
                      <CardTitle>Depósito de reserva</CardTitle>
                      <CardDescription>Monto que el cliente paga para asegurar su cita</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-5">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="set-deposit">Monto del depósito ($) <span className="text-red-400">*</span></Label>
                      <Input id="set-deposit" type="number" min="1" step="0.01" value={formData.depositAmount} onChange={(e) => setFormData(prev => ({ ...prev, depositAmount: e.target.value }))} placeholder="Ej: 150" />
                      <p className="text-xs text-gray-400 dark:text-gray-500">Es un monto fijo para apartar cupo, no el precio del servicio.</p>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="set-hold">Tiempo límite para pagar (min)</Label>
                      <Input id="set-hold" type="number" min="5" max="60" value={formData.holdDurationMinutes} onChange={(e) => setFormData(prev => ({ ...prev, holdDurationMinutes: e.target.value }))} />
                      <p className="text-xs text-gray-400 dark:text-gray-500">
                        {formData.bookingMode === 'PREPAGO'
                          ? 'Tiempo que tiene el cliente para completar el pago en el checkout.'
                          : 'Tiempo que tiene el cliente para pagar después de que apruebes la cita.'}
                      </p>
                    </div>
                  </div>

                  <div className="p-3 bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800/40 rounded-lg flex items-start gap-2.5">
                    <AlertCircle className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
                    <div className="text-xs text-amber-700 dark:text-amber-400 space-y-1">
                      <p><strong>El depósito no es reembolsable.</strong></p>
                      <p>Si el cliente cancela o no asiste, el depósito se retiene. El cliente paga la diferencia (precio del servicio - depósito) al llegar al salón.</p>
                    </div>
                  </div>

                  {/* Preview de lo que ve el cliente */}
                  <div className="p-4 bg-white dark:bg-gray-900 border border-dashed border-gray-300 dark:border-gray-600 rounded-xl">
                    <p className="text-[10px] font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2">Vista previa del cliente</p>
                    <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 text-sm">
                      <p className="text-gray-700 dark:text-gray-300">
                        💰 Depósito de reserva: <strong>${formData.depositAmount || '—'}</strong>
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        {formData.bookingMode === 'PREPAGO'
                          ? 'Se cobra al momento de reservar para asegurar tu cupo.'
                          : `Después de que el barbero apruebe tu cita, tendrás ${formData.holdDurationMinutes || 15} minutos para pagar.`}
                      </p>
                      <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Este depósito no es reembolsable.</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <DollarSign className="w-5 h-5 text-gray-400" />
                    <div>
                      <CardTitle>Depósito informativo (opcional)</CardTitle>
                      <CardDescription>Puedes mostrar un monto de depósito como referencia. No se cobra online.</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center space-x-3">
                    <Switch id="set-requiresDeposit" checked={formData.requiresDeposit} onCheckedChange={(checked) => setFormData(prev => ({ ...prev, requiresDeposit: checked }))} />
                    <Label htmlFor="set-requiresDeposit" className="font-normal cursor-pointer">Mostrar monto de depósito en la página de reservas</Label>
                  </div>
                  {formData.requiresDeposit && (
                    <div className="space-y-2 pl-14">
                      <Label htmlFor="set-deposit-libre">Monto del depósito ($)</Label>
                      <Input id="set-deposit-libre" type="number" min="0" step="0.01" value={formData.depositAmount} onChange={(e) => setFormData(prev => ({ ...prev, depositAmount: e.target.value }))} className="max-w-xs" placeholder="Ej: 100" />
                      <p className="text-xs text-gray-400 dark:text-gray-500">Solo informativo. El cliente lo ve pero no paga online.</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            <div className="flex justify-end">
              <Button type="submit" disabled={saving} size="lg">
                {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                {saving ? 'Guardando...' : 'Guardar reservas'}
              </Button>
            </div>
          </form>
        </TabsContent>

        {/* ═══════════ TAB 3: POLÍTICAS ═══════════ */}
        <TabsContent value="policies">
          <form onSubmit={handleSubmit} className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Ban className="w-5 h-5 text-primary-600" />
                  <div>
                    <CardTitle>Política de cancelación</CardTitle>
                    <CardDescription>Define hasta cuándo pueden cancelar los clientes sin penalización</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="set-cancel">Tiempo mínimo de anticipación para cancelar</Label>
                  <div className="flex items-center gap-3">
                    <Input id="set-cancel" type="number" min="0" value={formData.cancellationMinutesBefore} onChange={(e) => setFormData(prev => ({ ...prev, cancellationMinutesBefore: e.target.value }))} className="max-w-[120px]" />
                    <span className="text-sm text-gray-500 dark:text-gray-400">minutos antes de la cita</span>
                  </div>
                </div>

                <div className="p-3 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-lg">
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    <strong>Ejemplo:</strong> Si configuras 60 minutos, un cliente con cita a las 3:00 PM solo puede cancelar hasta las 2:00 PM.
                    Después de esa hora, la cancelación no se permite{formData.bookingMode !== 'LIBRE' ? ' y el depósito no se devuelve' : ''}.
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Clock className="w-5 h-5 text-primary-600" />
                  <div>
                    <CardTitle>Política de no-show</CardTitle>
                    <CardDescription>Cuánto tiempo esperar antes de marcar al cliente como ausente</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="set-noshow">Tiempo de espera tras la hora de la cita</Label>
                  <div className="flex items-center gap-3">
                    <Input id="set-noshow" type="number" min="5" max="60" value={formData.noShowWaitMinutes} onChange={(e) => setFormData(prev => ({ ...prev, noShowWaitMinutes: e.target.value }))} className="max-w-[120px]" />
                    <span className="text-sm text-gray-500 dark:text-gray-400">minutos después de la hora pautada</span>
                  </div>
                </div>

                <div className="p-3 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-lg">
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    <strong>Ejemplo:</strong> Si configuras 15 minutos, un cliente con cita a las 3:00 PM que no llegue a las 3:15 PM puede ser marcado como "no asistió".
                    {formData.bookingMode !== 'LIBRE' && ' El depósito se retiene.'}
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Preview resumen de políticas */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Vista previa — lo que ve tu cliente</CardTitle>
                <CardDescription>Así se muestran tus políticas en la página de reservas</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4 space-y-3 text-sm border border-gray-200 dark:border-gray-700">
                  <div className="flex items-start gap-2">
                    <Ban className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                    <p className="text-gray-700 dark:text-gray-300">
                      Puedes cancelar hasta <strong>{formData.cancellationMinutesBefore || 60} minutos</strong> antes de tu cita.
                      {formData.bookingMode !== 'LIBRE' && ' Si cancelas después de este plazo, el depósito no se devuelve.'}
                    </p>
                  </div>
                  <div className="flex items-start gap-2">
                    <Clock className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                    <p className="text-gray-700 dark:text-gray-300">
                      Si no llegas dentro de <strong>{formData.noShowWaitMinutes || 15} minutos</strong> de la hora pautada, tu cita puede ser cancelada.
                      {formData.bookingMode !== 'LIBRE' && ' El depósito no se devuelve.'}
                    </p>
                  </div>
                  {formData.bookingMode !== 'LIBRE' && (
                    <div className="flex items-start gap-2">
                      <DollarSign className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                      <p className="text-gray-700 dark:text-gray-300">
                        El depósito de <strong>${formData.depositAmount || '—'}</strong> no es reembolsable y se usa para asegurar tu cupo.
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            <div className="flex justify-end">
              <Button type="submit" disabled={saving} size="lg">
                {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                {saving ? 'Guardando...' : 'Guardar políticas'}
              </Button>
            </div>
          </form>
        </TabsContent>
      </Tabs>
    </div>
  )
}

export default SettingsPage
