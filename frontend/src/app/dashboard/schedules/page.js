'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import api from '@/utils/api'
import { formatTime12h } from '@/utils/formatTime'
import TimeInput12h from '@/components/TimeInput12h'

const SchedulesPage = () => {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState('business-hours')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  // Estados para horarios base
  const [businessHours, setBusinessHours] = useState([])
  
  // Estados para descansos
  const [breaks, setBreaks] = useState([])
  const [showBreakForm, setShowBreakForm] = useState(false)
  const [breakForm, setBreakForm] = useState({
    name: '',
    startTime: '',
    endTime: '',
    recurrenceType: 'daily',
    specificDays: []
  })

  // Estados para excepciones
  const [exceptions, setExceptions] = useState([])
  const [showExceptionForm, setShowExceptionForm] = useState(false)
  const [exceptionForm, setExceptionForm] = useState({
    name: '',
    exceptionType: 'day_off',
    startDate: '',
    endDate: '',
    specialStartTime: '',
    specialEndTime: '',
    isRecurringAnnually: false,
    reason: ''
  })

  const dayNames = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']

  const formatRecurrence = (recurrenceType, specificDays = []) => {
    if (recurrenceType === 'DAILY' || recurrenceType === 'daily') return 'Todos los días'
    if (recurrenceType === 'WEEKLY' || recurrenceType === 'weekly') return 'Semanalmente'
    if (recurrenceType === 'SPECIFIC_DAYS' || recurrenceType === 'specific_days') {
      if (specificDays?.length > 0) {
        return specificDays.map(d => dayNames[d]).join(', ')
      }
      return 'Días específicos'
    }
    return ''
  }

  const formatExceptionType = (exceptionType) => {
    const types = {
      DAY_OFF: 'Día libre',
      day_off: 'Día libre',
      SPECIAL_HOURS: 'Horario especial',
      special_hours: 'Horario especial',
      VACATION: 'Vacaciones',
      vacation: 'Vacaciones',
      HOLIDAY: 'Día festivo',
      holiday: 'Día festivo'
    }
    return types[exceptionType] || exceptionType || ''
  }

  // Función auxiliar para normalizar horarios (asegurar que tenemos los 7 días)
  const normalizeBusinessHours = (data) => {
    const normalizedHours = []
    
    for (let dayOfWeek = 0; dayOfWeek <= 6; dayOfWeek++) {
      const existingDay = data.find(day => day.dayOfWeek === dayOfWeek)
      
      if (existingDay) {
        normalizedHours.push(existingDay)
      } else {
        // Crear día por defecto si no existe
        normalizedHours.push({
          dayOfWeek,
          startTime: '09:00',
          endTime: '18:00',
          isActive: false
        })
      }
    }
    
    return normalizedHours
  }

  // Cargar datos iniciales
  useEffect(() => {
    handleLoadData()
  }, [])

  const handleLoadData = async () => {
    await Promise.all([
      loadBusinessHours(),
      loadBreaks(),
      loadExceptions()
    ])
  }

  // ========== HORARIOS BASE ==========

  const loadBusinessHours = async () => {
    try {
      const response = await api.get('/schedules/business-hours')
      if (response.success) {
        // Asegurar que tenemos los 7 días de la semana
        const normalizedHours = normalizeBusinessHours(response.data)
        
        setBusinessHours(normalizedHours)
      } else {
        setError('Error cargando horarios base')
      }
    } catch (error) {
      console.error('Error cargando horarios base:', error)
      setError('Error de conexión')
    }
  }

  const handleBusinessHoursChange = (dayIndex, field, value) => {
    setBusinessHours(prev => 
      prev.map((day, index) => 
        index === dayIndex ? { ...day, [field]: value } : day
      )
    )
  }

  const handleSaveBusinessHours = async () => {
    try {
      setLoading(true)
      setError('')
      setMessage('')

      const response = await api.put('/schedules/business-hours', { schedule: businessHours })
      if (response.success) {
        setMessage('Horarios base actualizados exitosamente')
        
        // Normalizar la respuesta para asegurar que tenemos los 7 días
        const normalizedHours = normalizeBusinessHours(response.data)
        
        setBusinessHours(normalizedHours)
      } else {
        setError(response.message || 'Error actualizando horarios')
      }
    } catch (error) {
      console.error('Error actualizando horarios:', error)
      setError('Error de conexión')
    } finally {
      setLoading(false)
    }
  }

  // ========== DESCANSOS RECURRENTES ==========

  const loadBreaks = async () => {
    try {
      const response = await api.get('/schedules/recurring-breaks')
      if (response.success) {
        setBreaks(response.data)
      }
    } catch (error) {
      console.error('Error cargando descansos:', error)
    }
  }

  const handleBreakSubmit = async (e) => {
    e.preventDefault()
    try {
      setLoading(true)
      setError('')

      const response = await api.post('/schedules/recurring-breaks', breakForm)
      if (response.success) {
        setMessage('Descanso creado exitosamente')
        await loadBreaks()
        setShowBreakForm(false)
        setBreakForm({
          name: '',
          startTime: '',
          endTime: '',
          recurrenceType: 'daily',
          specificDays: []
        })
      } else {
        setError(response.message || 'Error creando descanso')
      }
    } catch (error) {
      console.error('Error creando descanso:', error)
      setError('Error de conexión')
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteBreak = async (breakId) => {
    if (!breakId) {
      setError('Error: ID del descanso no encontrado')
      return
    }
    if (!confirm('¿Estás seguro de eliminar este descanso?')) return

    try {
      const response = await api.delete(`/schedules/recurring-breaks/${breakId}`)
      if (response.success) {
        setMessage('Descanso eliminado exitosamente')
        await loadBreaks()
      } else {
        setError(response.message || 'Error eliminando descanso')
      }
    } catch (error) {
      console.error('Error eliminando descanso:', error)
      setError('Error de conexión')
    }
  }

  // ========== EXCEPCIONES ==========

  const loadExceptions = async () => {
    try {
      const response = await api.get('/schedules/exceptions')
      if (response.success) {
        setExceptions(response.data)
      }
    } catch (error) {
      console.error('Error cargando excepciones:', error)
    }
  }

  const handleExceptionSubmit = async (e) => {
    e.preventDefault()
    try {
      setLoading(true)
      setError('')

      const response = await api.post('/schedules/exceptions', exceptionForm)
      if (response.success) {
        setMessage('Excepción creada exitosamente')
        await loadExceptions()
        setShowExceptionForm(false)
        setExceptionForm({
          name: '',
          exceptionType: 'day_off',
          startDate: '',
          endDate: '',
          specialStartTime: '',
          specialEndTime: '',
          isRecurringAnnually: false,
          reason: ''
        })
      } else {
        setError(response.message || 'Error creando excepción')
      }
    } catch (error) {
      console.error('Error creando excepción:', error)
      setError('Error de conexión')
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteException = async (exceptionId) => {
    if (!exceptionId) {
      setError('Error: ID de la excepción no encontrado')
      return
    }
    if (!confirm('¿Estás seguro de eliminar esta excepción?')) return

    try {
      const response = await api.delete(`/schedules/exceptions/${exceptionId}`)
      if (response.success) {
        setMessage('Excepción eliminada exitosamente')
        await loadExceptions()
      } else {
        setError(response.message || 'Error eliminando excepción')
      }
    } catch (error) {
      console.error('Error eliminando excepción:', error)
      setError('Error de conexión')
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 shadow-sm border-b dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <button
                onClick={() => router.push('/dashboard')}
                className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 mb-2"
              >
                ← Volver al Dashboard
              </button>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Configuración de Horarios</h1>
              <p className="text-gray-600 dark:text-gray-300">Gestiona tus horarios de trabajo, descansos y excepciones</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Mensajes */}
        {message && (
          <div className="mb-6 bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800 rounded-lg p-4">
            <p className="text-green-800 dark:text-green-200">{message}</p>
          </div>
        )}

        {error && (
          <div className="mb-6 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg p-4">
            <p className="text-red-800 dark:text-red-200">{error}</p>
          </div>
        )}

        {/* Tabs */}
        <div className="mb-8">
            <div className="border-b border-gray-200 dark:border-gray-700">
            <nav className="-mb-px flex space-x-8">
              <button
                onClick={() => setActiveTab('business-hours')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'business-hours'
                    ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
                }`}
              >
                📅 Horarios Base
              </button>
              <button
                onClick={() => setActiveTab('breaks')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'breaks'
                    ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
                }`}
              >
                ☕ Descansos
              </button>
              <button
                onClick={() => setActiveTab('exceptions')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'exceptions'
                    ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
                }`}
              >
                🚫 Excepciones
              </button>
            </nav>
          </div>
        </div>

        {/* Contenido de las tabs */}
        {activeTab === 'business-hours' && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 border border-gray-200 dark:border-gray-700">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Horarios Semanales</h2>
              <button
                onClick={handleSaveBusinessHours}
                disabled={loading}
                className="bg-blue-600 dark:bg-blue-700 text-white px-4 py-2 rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 disabled:opacity-50"
              >
                {loading ? 'Guardando...' : 'Guardar Horarios'}
              </button>
            </div>

            <div className="space-y-4">
              {businessHours.map((day, index) => (
                <div key={day.dayOfWeek} className="flex items-center space-x-4 p-4 border border-gray-200 dark:border-gray-600 rounded-lg">
                  <div className="w-24">
                    <span className="font-medium text-gray-900 dark:text-gray-100">{dayNames[day.dayOfWeek]}</span>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={day.isActive || false}
                      onChange={(e) => handleBusinessHoursChange(index, 'isActive', e.target.checked)}
                      className="rounded border-gray-300 dark:border-gray-600 dark:bg-gray-700"
                    />
                    <span className="text-sm text-gray-600 dark:text-gray-300">Abierto</span>
                  </div>

                  {day.isActive && (
                    <>
                      <div className="flex items-center space-x-2">
                        <label className="text-sm text-gray-600 dark:text-gray-300">Desde:</label>
                        <TimeInput12h
                          value={day.startTime || '09:00'}
                          onChange={(val) => handleBusinessHoursChange(index, 'startTime', val)}
                          className="border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded px-2 py-1 min-w-[120px]"
                        />
                      </div>

                      <div className="flex items-center space-x-2">
                        <label className="text-sm text-gray-600 dark:text-gray-300">Hasta:</label>
                        <TimeInput12h
                          value={day.endTime || '18:00'}
                          onChange={(val) => handleBusinessHoursChange(index, 'endTime', val)}
                          className="border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded px-2 py-1 min-w-[120px]"
                        />
                      </div>
                    </>
                  )}

                  {!day.isActive && (
                    <span className="text-gray-500 dark:text-gray-400 italic">Cerrado</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'breaks' && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 border border-gray-200 dark:border-gray-700">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Descansos Recurrentes</h2>
              <button
                onClick={() => setShowBreakForm(true)}
                      className="bg-blue-600 dark:bg-blue-700 text-white px-4 py-2 rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600"
              >
                + Agregar Descanso
              </button>
            </div>

            {/* Lista de descansos */}
            <div className="space-y-4 mb-6">
              {breaks.map((breakItem, index) => (
                <div key={breakItem.id || breakItem._id || `break-${index}`} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-gray-100">{breakItem.name}</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-300">
                      {formatTime12h(breakItem.startTime)} - {formatTime12h(breakItem.endTime)}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{breakItem.recurrenceDescription || formatRecurrence(breakItem.recurrenceType, breakItem.specificDays)}</p>
                  </div>
                  <button
                    onClick={() => handleDeleteBreak(breakItem.id || breakItem._id)}
                    className="text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300"
                  >
                    Eliminar
                  </button>
                </div>
              ))}

              {breaks.length === 0 && (
                <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                  No hay descansos configurados
                </div>
              )}
            </div>

            {/* Formulario de descanso */}
            {showBreakForm && (
              <div className="border-t border-gray-200 dark:border-gray-600 pt-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Nuevo Descanso</h3>
                <form onSubmit={handleBreakSubmit} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Nombre del descanso
                    </label>
                    <input
                      type="text"
                      required
                      value={breakForm.name}
                      onChange={(e) => setBreakForm(prev => ({ ...prev, name: e.target.value }))}
                      className="w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-lg px-3 py-2"
                      placeholder="Ej: Almuerzo, Descanso tarde"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Hora de inicio
                      </label>
                      <TimeInput12h
                        required
                        value={breakForm.startTime}
                        onChange={(val) => setBreakForm(prev => ({ ...prev, startTime: val }))}
                        className="w-full border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
                        aria-label="Hora de inicio del descanso"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Hora de fin
                      </label>
                      <TimeInput12h
                        required
                        value={breakForm.endTime}
                        onChange={(val) => setBreakForm(prev => ({ ...prev, endTime: val }))}
                        className="w-full border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
                        aria-label="Hora de fin del descanso"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Recurrencia
                    </label>
                    <select
                      value={breakForm.recurrenceType}
                      onChange={(e) => setBreakForm(prev => ({ ...prev, recurrenceType: e.target.value }))}
                      className="w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-lg px-3 py-2"
                    >
                      <option value="daily">Todos los días</option>
                      <option value="weekly">Semanalmente</option>
                      <option value="specific_days">Días específicos</option>
                    </select>
                  </div>

                  {breakForm.recurrenceType === 'specific_days' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Selecciona los días
                      </label>
                      <div className="grid grid-cols-4 gap-2">
                        {dayNames.map((day, index) => (
                          <label key={index} className="flex items-center space-x-2">
                            <input
                              type="checkbox"
                              checked={breakForm.specificDays.includes(index)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setBreakForm(prev => ({
                                    ...prev,
                                    specificDays: [...prev.specificDays, index]
                                  }))
                                } else {
                                  setBreakForm(prev => ({
                                    ...prev,
                                    specificDays: prev.specificDays.filter(d => d !== index)
                                  }))
                                }
                              }}
                              className="rounded border-gray-300 dark:border-gray-600 dark:bg-gray-700"
                            />
                            <span className="text-sm">{day}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="flex space-x-3">
                    <button
                      type="submit"
                      disabled={loading}
                      className="bg-blue-600 dark:bg-blue-700 text-white px-4 py-2 rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 disabled:opacity-50"
                    >
                      {loading ? 'Guardando...' : 'Guardar Descanso'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowBreakForm(false)}
                      className="bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-200 px-4 py-2 rounded-lg hover:bg-gray-400 dark:hover:bg-gray-500"
                    >
                      Cancelar
                    </button>
                  </div>
                </form>
              </div>
            )}
          </div>
        )}

        {activeTab === 'exceptions' && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 border border-gray-200 dark:border-gray-700">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold">Excepciones y Días Libres</h2>
              <button
                onClick={() => setShowExceptionForm(true)}
                      className="bg-blue-600 dark:bg-blue-700 text-white px-4 py-2 rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600"
              >
                + Agregar Excepción
              </button>
            </div>

            {/* Lista de excepciones */}
            <div className="space-y-4 mb-6">
              {exceptions.map((exception, index) => (
                <div key={exception.id || exception._id || `exception-${index}`} className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-600 rounded-lg">
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-gray-100">{exception.name}</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-300">
                      {exception.typeDescription || formatExceptionType(exception.exceptionType)} • {new Date(exception.startDate).toLocaleDateString()} - {new Date(exception.endDate).toLocaleDateString()}
                    </p>
                    {(exception.specialStartTime || exception.specialEndTime) && (
                      <p className="text-xs text-blue-600 dark:text-blue-400">
                        Horario especial: {formatTime12h(exception.specialStartTime)} - {formatTime12h(exception.specialEndTime)}
                      </p>
                    )}
                    {exception.reason && (
                      <p className="text-xs text-gray-500 dark:text-gray-400">{exception.reason}</p>
                    )}
                  </div>
                  <button
                    onClick={() => handleDeleteException(exception.id || exception._id)}
                    className="text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300"
                  >
                    Eliminar
                  </button>
                </div>
              ))}

              {exceptions.length === 0 && (
                <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                  No hay excepciones configuradas
                </div>
              )}
            </div>

            {/* Formulario de excepción */}
            {showExceptionForm && (
              <div className="border-t border-gray-200 dark:border-gray-600 pt-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Nueva Excepción</h3>
                <form onSubmit={handleExceptionSubmit} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Nombre de la excepción
                    </label>
                    <input
                      type="text"
                      required
                      value={exceptionForm.name}
                      onChange={(e) => setExceptionForm(prev => ({ ...prev, name: e.target.value }))}
                      className="w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-lg px-3 py-2"
                      placeholder="Ej: Vacaciones de verano, Día festivo"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Tipo de excepción
                    </label>
                    <select
                      value={exceptionForm.exceptionType}
                      onChange={(e) => setExceptionForm(prev => ({ ...prev, exceptionType: e.target.value }))}
                      className="w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-lg px-3 py-2"
                    >
                      <option value="day_off">Día libre</option>
                      <option value="special_hours">Horario especial</option>
                      <option value="vacation">Vacaciones</option>
                      <option value="holiday">Día festivo</option>
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Fecha de inicio
                      </label>
                      <input
                        type="date"
                        required
                        value={exceptionForm.startDate}
                        onChange={(e) => setExceptionForm(prev => ({ ...prev, startDate: e.target.value }))}
                        className="w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-lg px-3 py-2"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Fecha de fin
                      </label>
                      <input
                        type="date"
                        required
                        value={exceptionForm.endDate}
                        onChange={(e) => setExceptionForm(prev => ({ ...prev, endDate: e.target.value }))}
                        className="w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-lg px-3 py-2"
                      />
                    </div>
                  </div>

                  {exceptionForm.exceptionType === 'special_hours' && (
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Hora especial de inicio
                        </label>
                        <TimeInput12h
                          required
                          value={exceptionForm.specialStartTime}
                          onChange={(val) => setExceptionForm(prev => ({ ...prev, specialStartTime: val }))}
                          className="w-full border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
                          aria-label="Hora especial de inicio"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Hora especial de fin
                        </label>
                        <TimeInput12h
                          required
                          value={exceptionForm.specialEndTime}
                          onChange={(val) => setExceptionForm(prev => ({ ...prev, specialEndTime: val }))}
                          className="w-full border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
                          aria-label="Hora especial de fin"
                        />
                      </div>
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Razón (opcional)
                    </label>
                    <textarea
                      value={exceptionForm.reason}
                      onChange={(e) => setExceptionForm(prev => ({ ...prev, reason: e.target.value }))}
                      className="w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-lg px-3 py-2"
                      rows={3}
                      placeholder="Describe la razón de esta excepción..."
                    />
                  </div>

                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={exceptionForm.isRecurringAnnually}
                      onChange={(e) => setExceptionForm(prev => ({ ...prev, isRecurringAnnually: e.target.checked }))}
                      className="rounded border-gray-300 dark:border-gray-600 dark:bg-gray-700"
                    />
                    <label className="text-sm text-gray-700 dark:text-gray-300">
                      Se repite anualmente (para días festivos)
                    </label>
                  </div>

                  <div className="flex space-x-3">
                    <button
                      type="submit"
                      disabled={loading}
                      className="bg-blue-600 dark:bg-blue-700 text-white px-4 py-2 rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 disabled:opacity-50"
                    >
                      {loading ? 'Guardando...' : 'Guardar Excepción'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowExceptionForm(false)}
                      className="bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-200 px-4 py-2 rounded-lg hover:bg-gray-400 dark:hover:bg-gray-500"
                    >
                      Cancelar
                    </button>
                  </div>
                </form>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default SchedulesPage 