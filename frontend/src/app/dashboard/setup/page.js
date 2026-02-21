"use client"

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import api, { getAuthToken, getUserData, saveUserData } from '@/utils/api'

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
  isActive: i >= 1 && i <= 6, // Lunes a Sábado activos por defecto
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

  // Step 1: ¿Quién corta?
  const [salonMode, setSalonMode] = useState(null) // 'solo' | 'owner_and_barbers' | 'only_barbers'
  const [ownerBarberName, setOwnerBarberName] = useState('') // Nombre del dueño como barbero

  // Step 2: Barberos adicionales
  const [barbers, setBarbers] = useState([{ name: '', phone: '', specialty: '' }])

  // Step 3: Horarios
  const [businessHours, setBusinessHours] = useState(DEFAULT_HOURS)

  // Step 4: Servicios
  const [services, setServices] = useState([{ name: '', price: '', duration: '30', category: 'CORTE' }])

  useEffect(() => {
    const token = getAuthToken()
    if (!token) {
      router.push('/login')
      return
    }
    const userData = getUserData()
    if (userData) {
      setUser(userData)
      // Si ya completó onboarding, redirigir al dashboard
      if (userData.onboardingCompleted) {
        router.push('/dashboard')
      }
    }
  }, [router])

  const ownerCutsHair = salonMode === 'solo' || salonMode === 'owner_and_barbers'
  const hasOtherBarbers = salonMode === 'owner_and_barbers' || salonMode === 'only_barbers'

  // Step navigation
  const getNextStep = (currentStep) => {
    if (currentStep === 1) {
      // Si solo el dueño corta, saltar paso de barberos
      if (salonMode === 'solo') return 3
      return 2
    }
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
        // Si el dueño corta, necesita su nombre de barbero
        if ((salonMode === 'solo' || salonMode === 'owner_and_barbers') && !ownerBarberName.trim()) return false
        return true
      case 2:
        return barbers.every(b => b.name.trim() !== '')
      case 3:
        return businessHours.some(h => h.isActive)
      case 4:
        return services.every(s => s.name.trim() !== '' && parseFloat(s.price) > 0 && parseInt(s.duration) >= 5)
      default:
        return false
    }
  }

  const handleNext = () => {
    if (canProceed()) {
      setStep(getNextStep(step))
      setError('')
    }
  }

  const handlePrev = () => {
    setStep(getPrevStep(step))
    setError('')
  }

  // === Barbers handlers ===
  const addBarber = () => setBarbers([...barbers, { name: '', phone: '', specialty: '' }])
  const removeBarber = (index) => {
    if (barbers.length > 1) {
      setBarbers(barbers.filter((_, i) => i !== index))
    }
  }
  const updateBarber = (index, field, value) => {
    const updated = [...barbers]
    updated[index][field] = value
    setBarbers(updated)
  }

  // === Hours handlers ===
  const toggleDay = (dayOfWeek) => {
    setBusinessHours(prev => prev.map(h => 
      h.dayOfWeek === dayOfWeek ? { ...h, isActive: !h.isActive } : h
    ))
  }
  const updateHour = (dayOfWeek, field, value) => {
    setBusinessHours(prev => prev.map(h => 
      h.dayOfWeek === dayOfWeek ? { ...h, [field]: value } : h
    ))
  }

  // === Services handlers ===
  const addService = () => setServices([...services, { name: '', price: '', duration: '30', category: 'CORTE' }])
  const removeService = (index) => {
    if (services.length > 1) {
      setServices(services.filter((_, i) => i !== index))
    }
  }
  const updateService = (index, field, value) => {
    const updated = [...services]
    updated[index][field] = value
    setServices(updated)
  }
  const addCommonService = (common) => {
    // Si el primer servicio está vacío, reemplazarlo
    if (services.length === 1 && !services[0].name) {
      setServices([{ ...common, price: String(common.price), duration: String(common.duration) }])
    } else {
      // Evitar duplicados
      if (!services.find(s => s.name === common.name)) {
        setServices([...services, { ...common, price: String(common.price), duration: String(common.duration) }])
      }
    }
  }

  // === Submit ===
  const handleSubmit = async () => {
    setIsSubmitting(true)
    setError('')

    try {
      const payload = {
        ownerCutsHair,
        ownerBarberName: ownerCutsHair ? ownerBarberName.trim() : undefined,
        barbers: hasOtherBarbers ? barbers.filter(b => b.name.trim()) : [],
        businessHours: businessHours.map(h => ({
          dayOfWeek: h.dayOfWeek,
          isActive: h.isActive,
          startTime: h.startTime,
          endTime: h.endTime
        })),
        services: services.filter(s => s.name.trim()).map(s => ({
          name: s.name.trim(),
          price: parseFloat(s.price),
          duration: parseInt(s.duration),
          category: s.category || 'CORTE'
        }))
      }

      const response = await api.post('/users/onboarding', payload)

      if (response.success) {
        // Actualizar datos del usuario en localStorage
        saveUserData({ ...user, ...response.data, onboardingCompleted: true })
        router.push('/dashboard')
      } else {
        setError(response.message || 'Error al guardar la configuración')
      }
    } catch (err) {
      console.error('Error en onboarding:', err)
      setError(err.message || 'Error de conexión. Intenta nuevamente.')
    } finally {
      setIsSubmitting(false)
    }
  }

  // Progress bar
  const progress = Math.round((step / totalSteps) * 100)

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            💈 Configura tu barbería
          </h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            {user?.salonName ? `¡Bienvenido a ${user.salonName}!` : '¡Bienvenido!'} Vamos a configurar tu espacio en pocos pasos.
          </p>
        </div>

        {/* Progress bar */}
        <div className="mb-8">
          <div className="flex justify-between text-sm text-gray-500 dark:text-gray-400 mb-2">
            <span>Paso {step} de {totalSteps}</span>
            <span>{progress}%</span>
          </div>
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5">
            <div
              className="bg-primary-600 h-2.5 rounded-full transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Error message */}
        {error && (
          <div className="mb-6 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 px-4 py-3 rounded-lg">
            {error}
          </div>
        )}

        {/* Card container */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-6 md:p-8">
          
          {/* ============ STEP 1: Modo de operación ============ */}
          {step === 1 && (
            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                ¿Cómo funciona tu barbería?
              </h2>
              <p className="text-gray-500 dark:text-gray-400 mb-6 text-sm">
                Esto nos ayuda a configurar correctamente tu sistema de reservas.
              </p>

              <div className="space-y-4">
                <button
                  onClick={() => setSalonMode('solo')}
                  className={`w-full p-5 rounded-xl border-2 text-left transition-all ${
                    salonMode === 'solo'
                      ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20 ring-2 ring-primary-200 dark:ring-primary-800'
                      : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
                  }`}
                >
                  <div className="flex items-start gap-4">
                    <span className="text-3xl">🧑‍🦱</span>
                    <div>
                      <p className="font-semibold text-gray-900 dark:text-white">Soy el único barbero</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                        Solo yo atiendo a los clientes. No tengo empleados.
                      </p>
                    </div>
                  </div>
                </button>

                <button
                  onClick={() => setSalonMode('owner_and_barbers')}
                  className={`w-full p-5 rounded-xl border-2 text-left transition-all ${
                    salonMode === 'owner_and_barbers'
                      ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20 ring-2 ring-primary-200 dark:ring-primary-800'
                      : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
                  }`}
                >
                  <div className="flex items-start gap-4">
                    <span className="text-3xl">👥</span>
                    <div>
                      <p className="font-semibold text-gray-900 dark:text-white">Yo y otros barberos</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                        Yo también corto pelo, pero tengo barberos adicionales que trabajan conmigo.
                      </p>
                    </div>
                  </div>
                </button>

                <button
                  onClick={() => setSalonMode('only_barbers')}
                  className={`w-full p-5 rounded-xl border-2 text-left transition-all ${
                    salonMode === 'only_barbers'
                      ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20 ring-2 ring-primary-200 dark:ring-primary-800'
                      : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
                  }`}
                >
                  <div className="flex items-start gap-4">
                    <span className="text-3xl">🏢</span>
                    <div>
                      <p className="font-semibold text-gray-900 dark:text-white">Solo administro</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                        Yo no corto pelo. Solo gestiono la barbería y mis barberos atienden.
                      </p>
                    </div>
                  </div>
                </button>
              </div>

              {/* Campo de nombre del dueño cuando corta pelo */}
              {(salonMode === 'solo' || salonMode === 'owner_and_barbers') && (
                <div className="mt-6 p-4 bg-primary-50 dark:bg-primary-900/20 rounded-lg border border-primary-200 dark:border-primary-800">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    ¿Con qué nombre te verán los clientes al reservar?
                  </label>
                  <input
                    type="text"
                    placeholder="Ej: Juan, Mike el Barbero..."
                    value={ownerBarberName}
                    onChange={(e) => setOwnerBarberName(e.target.value)}
                    className="input-field"
                    autoFocus
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Este nombre aparecerá en la lista de barberos cuando los clientes reserven.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* ============ STEP 2: Barberos adicionales ============ */}
          {step === 2 && (
            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                {salonMode === 'only_barbers' ? 'Agrega tus barberos' : 'Agrega tus otros barberos'}
              </h2>
              <p className="text-gray-500 dark:text-gray-400 mb-6 text-sm">
                {salonMode === 'owner_and_barbers' 
                  ? 'Tú ya estás incluido como barbero. Agrega a quienes trabajan contigo.'
                  : 'Agrega a los barberos que trabajan en tu salón.'}
                {' '}Podrás agregar más después.
              </p>

              <div className="space-y-4">
                {barbers.map((barber, index) => (
                  <div key={index} className="p-4 border border-gray-200 dark:border-gray-600 rounded-lg">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        Barbero {index + 1}
                      </span>
                      {barbers.length > 1 && (
                        <button
                          onClick={() => removeBarber(index)}
                          className="text-red-500 hover:text-red-700 text-sm"
                        >
                          Eliminar
                        </button>
                      )}
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <input
                        type="text"
                        placeholder="Nombre *"
                        value={barber.name}
                        onChange={(e) => updateBarber(index, 'name', e.target.value)}
                        className="input-field"
                      />
                      <input
                        type="tel"
                        placeholder="Teléfono (opcional)"
                        value={barber.phone}
                        onChange={(e) => updateBarber(index, 'phone', e.target.value)}
                        className="input-field"
                      />
                      <input
                        type="text"
                        placeholder="Especialidad (opcional)"
                        value={barber.specialty}
                        onChange={(e) => updateBarber(index, 'specialty', e.target.value)}
                        className="input-field"
                      />
                    </div>
                  </div>
                ))}

                <button
                  onClick={addBarber}
                  className="w-full py-3 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg text-gray-500 dark:text-gray-400 hover:border-primary-400 hover:text-primary-600 dark:hover:text-primary-400 transition-colors"
                >
                  + Agregar otro barbero
                </button>
              </div>
            </div>
          )}

          {/* ============ STEP 3: Horarios ============ */}
          {step === 3 && (
            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                Horario de atención
              </h2>
              <p className="text-gray-500 dark:text-gray-400 mb-6 text-sm">
                Configura los días y horas en que tu barbería está abierta. Puedes ajustar esto después.
              </p>

              <div className="space-y-3">
                {businessHours.map((hour) => (
                  <div
                    key={hour.dayOfWeek}
                    className={`flex items-center gap-4 p-3 rounded-lg border transition-colors ${
                      hour.isActive
                        ? 'border-primary-200 dark:border-primary-800 bg-primary-50/50 dark:bg-primary-900/10'
                        : 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50'
                    }`}
                  >
                    <button
                      onClick={() => toggleDay(hour.dayOfWeek)}
                      className={`flex-shrink-0 w-6 h-6 rounded border-2 flex items-center justify-center transition-colors ${
                        hour.isActive
                          ? 'bg-primary-600 border-primary-600 text-white'
                          : 'border-gray-300 dark:border-gray-600'
                      }`}
                    >
                      {hour.isActive && (
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </button>

                    <span className={`w-24 text-sm font-medium ${
                      hour.isActive ? 'text-gray-900 dark:text-white' : 'text-gray-400 dark:text-gray-500'
                    }`}>
                      {DAY_NAMES[hour.dayOfWeek]}
                    </span>

                    {hour.isActive ? (
                      <div className="flex items-center gap-2 flex-1">
                        <input
                          type="time"
                          value={hour.startTime}
                          onChange={(e) => updateHour(hour.dayOfWeek, 'startTime', e.target.value)}
                          className="input-field !w-auto text-sm"
                        />
                        <span className="text-gray-400">—</span>
                        <input
                          type="time"
                          value={hour.endTime}
                          onChange={(e) => updateHour(hour.dayOfWeek, 'endTime', e.target.value)}
                          className="input-field !w-auto text-sm"
                        />
                      </div>
                    ) : (
                      <span className="text-sm text-gray-400 dark:text-gray-500 italic">Cerrado</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ============ STEP 4: Servicios ============ */}
          {step === 4 && (
            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                Tus servicios
              </h2>
              <p className="text-gray-500 dark:text-gray-400 mb-4 text-sm">
                Agrega los servicios que ofreces. Puedes usar los sugeridos o crear los tuyos.
              </p>

              {/* Quick add common services */}
              <div className="mb-6">
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
                  Servicios comunes (clic para agregar)
                </p>
                <div className="flex flex-wrap gap-2">
                  {COMMON_SERVICES.map((common) => {
                    const alreadyAdded = services.some(s => s.name === common.name)
                    return (
                      <button
                        key={common.name}
                        onClick={() => addCommonService(common)}
                        disabled={alreadyAdded}
                        className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${
                          alreadyAdded
                            ? 'bg-primary-100 dark:bg-primary-900/30 border-primary-300 dark:border-primary-700 text-primary-700 dark:text-primary-300 cursor-default'
                            : 'border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:border-primary-400 hover:text-primary-600 dark:hover:text-primary-400'
                        }`}
                      >
                        {alreadyAdded ? '✓ ' : '+ '}{common.name}
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Custom services */}
              <div className="space-y-4">
                {services.map((service, index) => (
                  <div key={index} className="p-4 border border-gray-200 dark:border-gray-600 rounded-lg">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        Servicio {index + 1}
                      </span>
                      {services.length > 1 && (
                        <button
                          onClick={() => removeService(index)}
                          className="text-red-500 hover:text-red-700 text-sm"
                        >
                          Eliminar
                        </button>
                      )}
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <input
                        type="text"
                        placeholder="Nombre del servicio *"
                        value={service.name}
                        onChange={(e) => updateService(index, 'name', e.target.value)}
                        className="input-field"
                      />
                      <select
                        value={service.category}
                        onChange={(e) => updateService(index, 'category', e.target.value)}
                        className="input-field"
                      >
                        {SERVICE_CATEGORIES.map(cat => (
                          <option key={cat.value} value={cat.value}>{cat.label}</option>
                        ))}
                      </select>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">RD$</span>
                        <input
                          type="number"
                          placeholder="Precio *"
                          value={service.price}
                          onChange={(e) => updateService(index, 'price', e.target.value)}
                          className="input-field !pl-12"
                          min="0"
                          step="10"
                        />
                      </div>
                      <div className="relative">
                        <input
                          type="number"
                          placeholder="Duración (min) *"
                          value={service.duration}
                          onChange={(e) => updateService(index, 'duration', e.target.value)}
                          className="input-field !pr-12"
                          min="5"
                          step="5"
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">min</span>
                      </div>
                    </div>
                  </div>
                ))}

                <button
                  onClick={addService}
                  className="w-full py-3 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg text-gray-500 dark:text-gray-400 hover:border-primary-400 hover:text-primary-600 dark:hover:text-primary-400 transition-colors"
                >
                  + Agregar otro servicio
                </button>
              </div>
            </div>
          )}

          {/* ============ Navigation ============ */}
          <div className="flex justify-between mt-8 pt-6 border-t border-gray-200 dark:border-gray-700">
            {step > 1 ? (
              <button
                onClick={handlePrev}
                className="btn-secondary px-6 py-2.5"
              >
                ← Anterior
              </button>
            ) : (
              <div />
            )}

            {step < totalSteps ? (
              <button
                onClick={handleNext}
                disabled={!canProceed()}
                className={`btn-primary px-6 py-2.5 ${!canProceed() ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                Siguiente →
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={!canProceed() || isSubmitting}
                className={`btn-primary px-8 py-2.5 ${(!canProceed() || isSubmitting) ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                {isSubmitting ? (
                  <span className="flex items-center gap-2">
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Guardando...
                  </span>
                ) : (
                  '🚀 Completar configuración'
                )}
              </button>
            )}
          </div>
        </div>

        {/* Footer hint */}
        <p className="text-center text-xs text-gray-400 dark:text-gray-500 mt-6">
          Toda esta configuración puede modificarse después desde tu panel de control.
        </p>
      </div>
    </div>
  )
}
