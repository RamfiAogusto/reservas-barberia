'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import api from '@/utils/api'

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
        setBusinessHours(response.data)
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
        setBusinessHours(response.data)
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
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <button
                onClick={() => router.push('/dashboard')}
                className="text-blue-600 hover:text-blue-800 mb-2"
              >
                ← Volver al Dashboard
              </button>
              <h1 className="text-3xl font-bold text-gray-900">Configuración de Horarios</h1>
              <p className="text-gray-600">Gestiona tus horarios de trabajo, descansos y excepciones</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Mensajes */}
        {message && (
          <div className="mb-6 bg-green-50 border border-green-200 rounded-lg p-4">
            <p className="text-green-800">{message}</p>
          </div>
        )}

        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-800">{error}</p>
          </div>
        )}

        {/* Tabs */}
        <div className="mb-8">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8">
              <button
                onClick={() => setActiveTab('business-hours')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'business-hours'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                📅 Horarios Base
              </button>
              <button
                onClick={() => setActiveTab('breaks')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'breaks'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                ☕ Descansos
              </button>
              <button
                onClick={() => setActiveTab('exceptions')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'exceptions'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                🚫 Excepciones
              </button>
            </nav>
          </div>
        </div>

        {/* Contenido de las tabs */}
        {activeTab === 'business-hours' && (
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold">Horarios Semanales</h2>
              <button
                onClick={handleSaveBusinessHours}
                disabled={loading}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {loading ? 'Guardando...' : 'Guardar Horarios'}
              </button>
            </div>

            <div className="space-y-4">
              {businessHours.map((day, index) => (
                <div key={day.dayOfWeek} className="flex items-center space-x-4 p-4 border border-gray-200 rounded-lg">
                  <div className="w-24">
                    <span className="font-medium">{dayNames[day.dayOfWeek]}</span>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={day.isActive || false}
                      onChange={(e) => handleBusinessHoursChange(index, 'isActive', e.target.checked)}
                      className="rounded border-gray-300"
                    />
                    <span className="text-sm text-gray-600">Abierto</span>
                  </div>

                  {day.isActive && (
                    <>
                      <div className="flex items-center space-x-2">
                        <label className="text-sm text-gray-600">Desde:</label>
                        <input
                          type="time"
                          value={day.startTime || '09:00'}
                          onChange={(e) => handleBusinessHoursChange(index, 'startTime', e.target.value)}
                          className="border border-gray-300 rounded px-2 py-1"
                        />
                      </div>

                      <div className="flex items-center space-x-2">
                        <label className="text-sm text-gray-600">Hasta:</label>
                        <input
                          type="time"
                          value={day.endTime || '18:00'}
                          onChange={(e) => handleBusinessHoursChange(index, 'endTime', e.target.value)}
                          className="border border-gray-300 rounded px-2 py-1"
                        />
                      </div>
                    </>
                  )}

                  {!day.isActive && (
                    <span className="text-gray-500 italic">Cerrado</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'breaks' && (
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold">Descansos Recurrentes</h2>
              <button
                onClick={() => setShowBreakForm(true)}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
              >
                + Agregar Descanso
              </button>
            </div>

            {/* Lista de descansos */}
            <div className="space-y-4 mb-6">
              {breaks.map((breakItem) => (
                <div key={breakItem._id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                  <div>
                    <h3 className="font-semibold">{breakItem.name}</h3>
                    <p className="text-sm text-gray-600">
                      {breakItem.startTime} - {breakItem.endTime}
                    </p>
                    <p className="text-xs text-gray-500">{breakItem.recurrenceDescription}</p>
                  </div>
                  <button
                    onClick={() => handleDeleteBreak(breakItem._id)}
                    className="text-red-600 hover:text-red-800"
                  >
                    Eliminar
                  </button>
                </div>
              ))}

              {breaks.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  No hay descansos configurados
                </div>
              )}
            </div>

            {/* Formulario de descanso */}
            {showBreakForm && (
              <div className="border-t pt-6">
                <h3 className="text-lg font-semibold mb-4">Nuevo Descanso</h3>
                <form onSubmit={handleBreakSubmit} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Nombre del descanso
                    </label>
                    <input
                      type="text"
                      required
                      value={breakForm.name}
                      onChange={(e) => setBreakForm(prev => ({ ...prev, name: e.target.value }))}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2"
                      placeholder="Ej: Almuerzo, Descanso tarde"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Hora de inicio
                      </label>
                      <input
                        type="time"
                        required
                        value={breakForm.startTime}
                        onChange={(e) => setBreakForm(prev => ({ ...prev, startTime: e.target.value }))}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Hora de fin
                      </label>
                      <input
                        type="time"
                        required
                        value={breakForm.endTime}
                        onChange={(e) => setBreakForm(prev => ({ ...prev, endTime: e.target.value }))}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Recurrencia
                    </label>
                    <select
                      value={breakForm.recurrenceType}
                      onChange={(e) => setBreakForm(prev => ({ ...prev, recurrenceType: e.target.value }))}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2"
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
                              className="rounded border-gray-300"
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
                      className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
                    >
                      {loading ? 'Guardando...' : 'Guardar Descanso'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowBreakForm(false)}
                      className="bg-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-400"
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
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold">Excepciones y Días Libres</h2>
              <button
                onClick={() => setShowExceptionForm(true)}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
              >
                + Agregar Excepción
              </button>
            </div>

            {/* Lista de excepciones */}
            <div className="space-y-4 mb-6">
              {exceptions.map((exception) => (
                <div key={exception._id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                  <div>
                    <h3 className="font-semibold">{exception.name}</h3>
                    <p className="text-sm text-gray-600">
                      {exception.typeDescription} • {new Date(exception.startDate).toLocaleDateString()} - {new Date(exception.endDate).toLocaleDateString()}
                    </p>
                    {exception.hasSpecialHours && (
                      <p className="text-xs text-blue-600">
                        Horario especial: {exception.specialStartTime} - {exception.specialEndTime}
                      </p>
                    )}
                    {exception.reason && (
                      <p className="text-xs text-gray-500">{exception.reason}</p>
                    )}
                  </div>
                  <button
                    onClick={() => handleDeleteException(exception._id)}
                    className="text-red-600 hover:text-red-800"
                  >
                    Eliminar
                  </button>
                </div>
              ))}

              {exceptions.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  No hay excepciones configuradas
                </div>
              )}
            </div>

            {/* Formulario de excepción */}
            {showExceptionForm && (
              <div className="border-t pt-6">
                <h3 className="text-lg font-semibold mb-4">Nueva Excepción</h3>
                <form onSubmit={handleExceptionSubmit} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Nombre de la excepción
                    </label>
                    <input
                      type="text"
                      required
                      value={exceptionForm.name}
                      onChange={(e) => setExceptionForm(prev => ({ ...prev, name: e.target.value }))}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2"
                      placeholder="Ej: Vacaciones de verano, Día festivo"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Tipo de excepción
                    </label>
                    <select
                      value={exceptionForm.exceptionType}
                      onChange={(e) => setExceptionForm(prev => ({ ...prev, exceptionType: e.target.value }))}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2"
                    >
                      <option value="day_off">Día libre</option>
                      <option value="special_hours">Horario especial</option>
                      <option value="vacation">Vacaciones</option>
                      <option value="holiday">Día festivo</option>
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Fecha de inicio
                      </label>
                      <input
                        type="date"
                        required
                        value={exceptionForm.startDate}
                        onChange={(e) => setExceptionForm(prev => ({ ...prev, startDate: e.target.value }))}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Fecha de fin
                      </label>
                      <input
                        type="date"
                        required
                        value={exceptionForm.endDate}
                        onChange={(e) => setExceptionForm(prev => ({ ...prev, endDate: e.target.value }))}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2"
                      />
                    </div>
                  </div>

                  {exceptionForm.exceptionType === 'special_hours' && (
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Hora especial de inicio
                        </label>
                        <input
                          type="time"
                          required
                          value={exceptionForm.specialStartTime}
                          onChange={(e) => setExceptionForm(prev => ({ ...prev, specialStartTime: e.target.value }))}
                          className="w-full border border-gray-300 rounded-lg px-3 py-2"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Hora especial de fin
                        </label>
                        <input
                          type="time"
                          required
                          value={exceptionForm.specialEndTime}
                          onChange={(e) => setExceptionForm(prev => ({ ...prev, specialEndTime: e.target.value }))}
                          className="w-full border border-gray-300 rounded-lg px-3 py-2"
                        />
                      </div>
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Razón (opcional)
                    </label>
                    <textarea
                      value={exceptionForm.reason}
                      onChange={(e) => setExceptionForm(prev => ({ ...prev, reason: e.target.value }))}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2"
                      rows={3}
                      placeholder="Describe la razón de esta excepción..."
                    />
                  </div>

                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={exceptionForm.isRecurringAnnually}
                      onChange={(e) => setExceptionForm(prev => ({ ...prev, isRecurringAnnually: e.target.checked }))}
                      className="rounded border-gray-300"
                    />
                    <label className="text-sm text-gray-700">
                      Se repite anualmente (para días festivos)
                    </label>
                  </div>

                  <div className="flex space-x-3">
                    <button
                      type="submit"
                      disabled={loading}
                      className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
                    >
                      {loading ? 'Guardando...' : 'Guardar Excepción'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowExceptionForm(false)}
                      className="bg-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-400"
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