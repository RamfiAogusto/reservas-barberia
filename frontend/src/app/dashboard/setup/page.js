"use client"

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import api, { getAuthToken, getUserData, saveUserData } from '@/utils/api'

import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Separator } from '@/components/ui/separator'
import { Loader2, AlertCircle, Trash2, Plus } from 'lucide-react'

const DAY_NAMES = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']

const SERVICE_CATEGORIES = [
  { value: 'CORTE', label: '✂️ Corte' },
  { value: 'BARBA', label: '🧔 Barba' },
  { value: 'COMBO', label: '💈 Combo' },
  { value: 'TRATAMIENTO', label: '🧴 Tratamiento' },
  { value: 'OTRO', label: '📋 Otro' }
]

const DEFAULT_HOURS = Array.from({ length: 7 }, (_, i) => ({
  dayOfWeek: i,
  isActive: i >= 1 && i <= 6,
  startTime: '09:00',
  endTime: '18:00'
}))

const COMMON_SERVICES = [
  { name: 'Corte de cabello', price: 250, duration: 30, category: 'CORTE' },
  { name: 'Arreglo de barba', price: 150, duration: 20, category: 'BARBA' },
  { name: 'Corte + Barba', price: 350, duration: 45, category: 'COMBO' },
  { name: 'Afeitado clásico', price: 200, duration: 25, category: 'BARBA' },
  { name: 'Diseño de cejas', price: 100, duration: 10, category: 'OTRO' },
  { name: 'Tratamiento capilar', price: 400, duration: 40, category: 'TRATAMIENTO' }
]

export default function SetupPage() {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const totalSteps = 4
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [user, setUser] = useState(null)

  const [salonMode, setSalonMode] = useState(null)
  const [ownerBarberName, setOwnerBarberName] = useState('')
  const [barbers, setBarbers] = useState([{ name: '', phone: '', specialty: '' }])
  const [businessHours, setBusinessHours] = useState(DEFAULT_HOURS)
  const [services, setServices] = useState([{ name: '', price: '', duration: '30', category: 'CORTE' }])

  useEffect(() => {
    const token = getAuthToken()
    if (!token) { router.push('/login'); return }
    const userData = getUserData()
    if (userData) {
      setUser(userData)
      if (userData.onboardingCompleted) router.push('/dashboard')
    }
  }, [router])

  const ownerCutsHair = salonMode === 'solo' || salonMode === 'owner_and_barbers'
  const hasOtherBarbers = salonMode === 'owner_and_barbers' || salonMode === 'only_barbers'

  const getNextStep = (currentStep) => {
    if (currentStep === 1 && salonMode === 'solo') return 3
    return currentStep + 1
  }

  const getPrevStep = (currentStep) => {
    if (currentStep === 3 && salonMode === 'solo') return 1
    return currentStep - 1
  }

  const canProceed = () => {
    switch (step) {
      case 1:
        if (salonMode === null) return false
        if ((salonMode === 'solo' || salonMode === 'owner_and_barbers') && !ownerBarberName.trim()) return false
        return true
      case 2: return barbers.every(b => b.name.trim() !== '')
      case 3: return businessHours.some(h => h.isActive)
      case 4: return services.every(s => s.name.trim() !== '' && parseFloat(s.price) > 0 && parseInt(s.duration) >= 5)
      default: return false
    }
  }

  const handleNext = () => { if (canProceed()) { setStep(getNextStep(step)); setError('') } }
  const handlePrev = () => { setStep(getPrevStep(step)); setError('') }

  const addBarber = () => setBarbers([...barbers, { name: '', phone: '', specialty: '' }])
  const removeBarber = (index) => { if (barbers.length > 1) setBarbers(barbers.filter((_, i) => i !== index)) }
  const updateBarber = (index, field, value) => {
    const updated = [...barbers]; updated[index][field] = value; setBarbers(updated)
  }

  const toggleDay = (dayOfWeek) => {
    setBusinessHours(prev => prev.map(h => h.dayOfWeek === dayOfWeek ? { ...h, isActive: !h.isActive } : h))
  }
  const updateHour = (dayOfWeek, field, value) => {
    setBusinessHours(prev => prev.map(h => h.dayOfWeek === dayOfWeek ? { ...h, [field]: value } : h))
  }

  const addService = () => setServices([...services, { name: '', price: '', duration: '30', category: 'CORTE' }])
  const removeService = (index) => { if (services.length > 1) setServices(services.filter((_, i) => i !== index)) }
  const updateService = (index, field, value) => {
    const updated = [...services]; updated[index][field] = value; setServices(updated)
  }
  const addCommonService = (common) => {
    if (services.length === 1 && !services[0].name) {
      setServices([{ ...common, price: String(common.price), duration: String(common.duration) }])
    } else if (!services.find(s => s.name === common.name)) {
      setServices([...services, { ...common, price: String(common.price), duration: String(common.duration) }])
    }
  }

  const handleSubmit = async () => {
    setIsSubmitting(true)
    setError('')
    try {
      const payload = {
        ownerCutsHair,
        ownerBarberName: ownerCutsHair ? ownerBarberName.trim() : undefined,
        barbers: hasOtherBarbers ? barbers.filter(b => b.name.trim()) : [],
        businessHours: businessHours.map(h => ({ dayOfWeek: h.dayOfWeek, isActive: h.isActive, startTime: h.startTime, endTime: h.endTime })),
        services: services.filter(s => s.name.trim()).map(s => ({ name: s.name.trim(), price: parseFloat(s.price), duration: parseInt(s.duration), category: s.category || 'CORTE' }))
      }
      const response = await api.post('/users/onboarding', payload)
      if (response.success) {
        saveUserData({ ...user, ...response.data, onboardingCompleted: true })
        router.push('/dashboard')
      } else {
        setError(response.message || 'Error al guardar la configuración')
      }
    } catch (err) {
      console.error('Error en onboarding:', err)
      setError(err.message || 'Error de conexión. Intenta nuevamente.')
    } finally { setIsSubmitting(false) }
  }

  const progress = Math.round((step / totalSteps) * 100)

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            💈 Configura tu barbería
          </h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            {user?.salonName ? `¡Bienvenido a ${user.salonName}!` : '¡Bienvenido!'} Vamos a configurar tu espacio en pocos pasos.
          </p>
        </div>

        <div className="mb-8">
          <div className="flex justify-between text-sm text-gray-500 dark:text-gray-400 mb-2">
            <span>Paso {step} de {totalSteps}</span>
            <span>{progress}%</span>
          </div>
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5">
            <div className="bg-primary-600 h-2.5 rounded-full transition-all duration-500" style={{ width: `${progress}%` }} />
          </div>
        </div>

        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <Card>
          <CardContent className="p-6 md:p-8">
            {/* STEP 1: Modo de operación */}
            {step === 1 && (
              <div>
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">¿Cómo funciona tu barbería?</h2>
                <p className="text-gray-500 dark:text-gray-400 mb-6 text-sm">Esto nos ayuda a configurar correctamente tu sistema de reservas.</p>

                <div className="space-y-4">
                  {[
                    { value: 'solo', emoji: '🧑‍🦱', title: 'Soy el único barbero', desc: 'Solo yo atiendo a los clientes. No tengo empleados.' },
                    { value: 'owner_and_barbers', emoji: '👥', title: 'Yo y otros barberos', desc: 'Yo también corto pelo, pero tengo barberos adicionales que trabajan conmigo.' },
                    { value: 'only_barbers', emoji: '🏢', title: 'Solo administro', desc: 'Yo no corto pelo. Solo gestiono la barbería y mis barberos atienden.' },
                  ].map(opt => (
                    <button key={opt.value} onClick={() => setSalonMode(opt.value)} className={`w-full p-5 rounded-xl border-2 text-left transition-all ${salonMode === opt.value ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20 ring-2 ring-primary-200 dark:ring-primary-800' : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'}`} role="radio" aria-checked={salonMode === opt.value} tabIndex={0}>
                      <div className="flex items-start gap-4">
                        <span className="text-3xl">{opt.emoji}</span>
                        <div>
                          <p className="font-semibold text-gray-900 dark:text-white">{opt.title}</p>
                          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{opt.desc}</p>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>

                {(salonMode === 'solo' || salonMode === 'owner_and_barbers') && (
                  <div className="mt-6 p-4 bg-primary-50 dark:bg-primary-900/20 rounded-lg border border-primary-200 dark:border-primary-800">
                    <Label htmlFor="ownerBarberName" className="mb-2">¿Con qué nombre te verán los clientes al reservar?</Label>
                    <Input id="ownerBarberName" type="text" placeholder="Ej: Juan, Mike el Barbero..." value={ownerBarberName} onChange={(e) => setOwnerBarberName(e.target.value)} autoFocus />
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Este nombre aparecerá en la lista de barberos cuando los clientes reserven.</p>
                  </div>
                )}
              </div>
            )}

            {/* STEP 2: Barberos adicionales */}
            {step === 2 && (
              <div>
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">{salonMode === 'only_barbers' ? 'Agrega tus barberos' : 'Agrega tus otros barberos'}</h2>
                <p className="text-gray-500 dark:text-gray-400 mb-6 text-sm">
                  {salonMode === 'owner_and_barbers' ? 'Tú ya estás incluido como barbero. Agrega a quienes trabajan contigo.' : 'Agrega a los barberos que trabajan en tu salón.'} Podrás agregar más después.
                </p>

                <div className="space-y-4">
                  {barbers.map((barber, index) => (
                    <div key={index} className="p-4 border border-gray-200 dark:border-gray-600 rounded-lg">
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Barbero {index + 1}</span>
                        {barbers.length > 1 && (
                          <Button variant="ghost" size="sm" className="text-red-500 hover:text-red-700" onClick={() => removeBarber(index)}>
                            <Trash2 className="w-3.5 h-3.5 mr-1" />Eliminar
                          </Button>
                        )}
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <Input type="text" placeholder="Nombre *" value={barber.name} onChange={(e) => updateBarber(index, 'name', e.target.value)} />
                        <Input type="tel" placeholder="Teléfono (opcional)" value={barber.phone} onChange={(e) => updateBarber(index, 'phone', e.target.value)} />
                        <Input type="text" placeholder="Especialidad (opcional)" value={barber.specialty} onChange={(e) => updateBarber(index, 'specialty', e.target.value)} />
                      </div>
                    </div>
                  ))}
                  <button onClick={addBarber} className="w-full py-3 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg text-gray-500 dark:text-gray-400 hover:border-primary-400 hover:text-primary-600 dark:hover:text-primary-400 transition-colors" tabIndex={0} aria-label="Agregar otro barbero">
                    + Agregar otro barbero
                  </button>
                </div>
              </div>
            )}

            {/* STEP 3: Horarios */}
            {step === 3 && (
              <div>
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">Horario de atención</h2>
                <p className="text-gray-500 dark:text-gray-400 mb-6 text-sm">Configura los días y horas en que tu barbería está abierta. Puedes ajustar esto después.</p>

                <div className="space-y-3">
                  {businessHours.map((hour) => (
                    <div key={hour.dayOfWeek} className={`flex items-center gap-4 p-3 rounded-lg border transition-colors ${hour.isActive ? 'border-primary-200 dark:border-primary-800 bg-primary-50/50 dark:bg-primary-900/10' : 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50'}`}>
                      <Checkbox id={`setup-day-${hour.dayOfWeek}`} checked={hour.isActive} onCheckedChange={() => toggleDay(hour.dayOfWeek)} />
                      <Label htmlFor={`setup-day-${hour.dayOfWeek}`} className={`w-24 text-sm font-medium cursor-pointer ${hour.isActive ? 'text-gray-900 dark:text-white' : 'text-gray-400 dark:text-gray-500'}`}>
                        {DAY_NAMES[hour.dayOfWeek]}
                      </Label>
                      {hour.isActive ? (
                        <div className="flex items-center gap-2 flex-1">
                          <Input type="time" value={hour.startTime} onChange={(e) => updateHour(hour.dayOfWeek, 'startTime', e.target.value)} className="w-auto text-sm" />
                          <span className="text-gray-400">—</span>
                          <Input type="time" value={hour.endTime} onChange={(e) => updateHour(hour.dayOfWeek, 'endTime', e.target.value)} className="w-auto text-sm" />
                        </div>
                      ) : (
                        <span className="text-sm text-gray-400 dark:text-gray-500 italic">Cerrado</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* STEP 4: Servicios */}
            {step === 4 && (
              <div>
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">Tus servicios</h2>
                <p className="text-gray-500 dark:text-gray-400 mb-4 text-sm">Agrega los servicios que ofreces. Puedes usar los sugeridos o crear los tuyos.</p>

                <div className="mb-6">
                  <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">Servicios comunes (clic para agregar)</p>
                  <div className="flex flex-wrap gap-2">
                    {COMMON_SERVICES.map((common) => {
                      const alreadyAdded = services.some(s => s.name === common.name)
                      return (
                        <button key={common.name} onClick={() => addCommonService(common)} disabled={alreadyAdded}
                          className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${alreadyAdded ? 'bg-primary-100 dark:bg-primary-900/30 border-primary-300 dark:border-primary-700 text-primary-700 dark:text-primary-300 cursor-default' : 'border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:border-primary-400 hover:text-primary-600 dark:hover:text-primary-400'}`}
                          tabIndex={0} aria-label={`Agregar ${common.name}`}>
                          {alreadyAdded ? '✓ ' : '+ '}{common.name}
                        </button>
                      )
                    })}
                  </div>
                </div>

                <div className="space-y-4">
                  {services.map((service, index) => (
                    <div key={index} className="p-4 border border-gray-200 dark:border-gray-600 rounded-lg">
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Servicio {index + 1}</span>
                        {services.length > 1 && (
                          <Button variant="ghost" size="sm" className="text-red-500 hover:text-red-700" onClick={() => removeService(index)}>
                            <Trash2 className="w-3.5 h-3.5 mr-1" />Eliminar
                          </Button>
                        )}
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <Input type="text" placeholder="Nombre del servicio *" value={service.name} onChange={(e) => updateService(index, 'name', e.target.value)} />
                        <Select value={service.category} onValueChange={(val) => updateService(index, 'category', val)}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {SERVICE_CATEGORIES.map(cat => (
                              <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">RD$</span>
                          <Input type="number" placeholder="Precio *" value={service.price} onChange={(e) => updateService(index, 'price', e.target.value)} className="pl-12" min="0" step="10" />
                        </div>
                        <div className="relative">
                          <Input type="number" placeholder="Duración (min) *" value={service.duration} onChange={(e) => updateService(index, 'duration', e.target.value)} className="pr-12" min="5" step="5" />
                          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">min</span>
                        </div>
                      </div>
                    </div>
                  ))}
                  <button onClick={addService} className="w-full py-3 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg text-gray-500 dark:text-gray-400 hover:border-primary-400 hover:text-primary-600 dark:hover:text-primary-400 transition-colors" tabIndex={0} aria-label="Agregar otro servicio">
                    + Agregar otro servicio
                  </button>
                </div>
              </div>
            )}

            <Separator className="mt-8 mb-6" />

            <div className="flex justify-between">
              {step > 1 ? (
                <Button variant="outline" onClick={handlePrev}>← Anterior</Button>
              ) : <div />}

              {step < totalSteps ? (
                <Button onClick={handleNext} disabled={!canProceed()}>Siguiente →</Button>
              ) : (
                <Button onClick={handleSubmit} disabled={!canProceed() || isSubmitting}>
                  {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {isSubmitting ? 'Guardando...' : '🚀 Completar configuración'}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        <p className="text-center text-xs text-gray-400 dark:text-gray-500 mt-6">
          Toda esta configuración puede modificarse después desde tu panel de control.
        </p>
      </div>
    </div>
  )
}
