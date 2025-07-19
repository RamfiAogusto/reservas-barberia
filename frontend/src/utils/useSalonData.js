import { useState, useEffect, useCallback } from 'react'
import { cachedRequest, invalidateCache } from './cache'
import { useDebounce } from './useDebounce'

// Estado global para datos del salón
let globalSalonData = new Map()
let globalLoadingStates = new Map()

export const useSalonData = (username) => {
  const [salon, setSalon] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const fetchSalonData = useCallback(async () => {
    if (!username) return

    // Verificar si ya tenemos los datos en memoria
    if (globalSalonData.has(username)) {
      setSalon(globalSalonData.get(username))
      setLoading(false)
      return
    }

    // Verificar si ya está cargando
    if (globalLoadingStates.has(username)) {
      return // Ya se está cargando, no hacer otra llamada
    }

    try {
      globalLoadingStates.set(username, true)
      setLoading(true)
      setError('')

      const data = await cachedRequest(`/public/salon/${username}`)
      
      if (data.success) {
        // Guardar en estado global
        globalSalonData.set(username, data.data)
        setSalon(data.data)
      } else {
        setError(data.message || 'Salón no encontrado')
      }
    } catch (error) {
      console.error('Error al cargar perfil:', error)
      setError('Error al cargar la información del salón')
    } finally {
      setLoading(false)
      globalLoadingStates.delete(username)
    }
  }, [username])

  // Función para invalidar caché del salón
  const invalidateSalonCache = useCallback(() => {
    if (username) {
      invalidateCache(`/public/salon/${username}`)
      globalSalonData.delete(username)
    }
  }, [username])

  useEffect(() => {
    fetchSalonData()
  }, [fetchSalonData])

  return {
    salon,
    loading,
    error,
    refetch: fetchSalonData,
    invalidateCache: invalidateSalonCache
  }
}

// Hook para disponibilidad de días
export const useDaysStatus = (username, selectedService) => {
  const [daysStatus, setDaysStatus] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const fetchDaysStatus = useCallback(async () => {
    if (!selectedService || !username) return

    try {
      setLoading(true)
      setError('')

      const today = new Date()
      const futureDate = new Date()
      futureDate.setDate(today.getDate() + 30)

      const startDate = today.toISOString().split('T')[0]
      const endDate = futureDate.toISOString().split('T')[0]

      const data = await cachedRequest(`/public/salon/${username}/days-status`, {
        startDate,
        endDate
      }, 2 * 60 * 1000) // 2 minutos de caché para disponibilidad

      if (data.success) {
        setDaysStatus(data.data.days)
      } else {
        setError('Error al cargar disponibilidad de días')
        setDaysStatus([])
      }
    } catch (error) {
      console.error('Error cargando días:', error)
      setError('Error al cargar disponibilidad')
      setDaysStatus([])
    } finally {
      setLoading(false)
    }
  }, [selectedService, username])

  useEffect(() => {
    fetchDaysStatus()
  }, [fetchDaysStatus])

  return {
    daysStatus,
    loading,
    error,
    refetch: fetchDaysStatus
  }
}

// Hook para slots disponibles
export const useAvailableSlots = (username, selectedDate, selectedService) => {
  const [availableSlots, setAvailableSlots] = useState([])
  const [allSlots, setAllSlots] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Usar debounce para evitar llamadas excesivas
  const debouncedDate = useDebounce(selectedDate, 300) // 300ms de debounce
  const debouncedService = useDebounce(selectedService?._id, 300)

  const fetchAvailableSlots = useCallback(async () => {
    if (!debouncedDate || !debouncedService || !username) return

    try {
      setLoading(true)
      setError('')

      const data = await cachedRequest(`/public/salon/${username}/availability/advanced`, {
        date: debouncedDate,
        serviceId: debouncedService
      }, 1 * 60 * 1000) // 1 minuto de caché para slots

      if (data.success) {
        if (data.data.isBusinessDay) {
          setAvailableSlots(data.data.availableSlots)
          setAllSlots(data.data.allSlots)
        } else {
          setAvailableSlots([])
          setAllSlots([])
          setError(`${debouncedDate}: ${data.data.reason}`)
        }
      } else {
        setError('Error al cargar horarios disponibles')
        setAvailableSlots([])
        setAllSlots([])
      }
    } catch (error) {
      console.error('Error cargando slots:', error)
      setError('Error al cargar horarios')
      setAvailableSlots([])
      setAllSlots([])
    } finally {
      setLoading(false)
    }
  }, [debouncedDate, debouncedService, username])

  useEffect(() => {
    fetchAvailableSlots()
  }, [fetchAvailableSlots])

  // Función para verificar disponibilidad en tiempo real (sin caché)
  const checkRealTimeAvailability = useCallback(async (time) => {
    if (!selectedDate || !selectedService || !username) return false

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'}/public/salon/${username}/availability/advanced?date=${selectedDate}&serviceId=${selectedService._id}`
      )
      const data = await response.json()

      if (data.success && data.data.isBusinessDay) {
        return data.data.availableSlots.includes(time)
      }
      return false
    } catch (error) {
      console.error('Error verificando disponibilidad:', error)
      return false
    }
  }, [selectedDate, selectedService, username])

  return {
    availableSlots,
    allSlots,
    loading,
    error,
    refetch: fetchAvailableSlots,
    checkRealTimeAvailability
  }
}

// Función para limpiar todo el estado global
export const clearGlobalSalonData = () => {
  globalSalonData.clear()
  globalLoadingStates.clear()
} 