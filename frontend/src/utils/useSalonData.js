import { useState, useEffect, useCallback, useRef } from 'react'
import { cachedRequest } from './cache'
import { useDebounce } from './useDebounce'
import { API_URL } from './config'

// Hook para disponibilidad de días
export const useDaysStatus = (username, selectedService) => {
  const [daysStatus, setDaysStatus] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const abortControllerRef = useRef(null)

  const fetchDaysStatus = useCallback(async () => {
    if (!selectedService || !username) return

    // Cancelar petición anterior si sigue en curso para evitar
    // que una respuesta fuera de orden sobrescriba el estado más reciente
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }
    const abortController = new AbortController()
    abortControllerRef.current = abortController

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
      }, 2 * 60 * 1000, { signal: abortController.signal }) // 2 minutos de caché para disponibilidad

      if (abortController.signal.aborted) return

      if (data.success) {
        setDaysStatus(data.data.days)
      } else {
        setError('Error al cargar disponibilidad de días')
        setDaysStatus([])
      }
    } catch (error) {
      if (error.name === 'AbortError') return
      console.error('Error cargando días:', error)
      setError('Error al cargar disponibilidad')
      setDaysStatus([])
    } finally {
      if (!abortController.signal.aborted) {
        setLoading(false)
      }
    }
  }, [selectedService, username])

  useEffect(() => {
    fetchDaysStatus()
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
    }
  }, [fetchDaysStatus])

  return {
    daysStatus,
    loading,
    error,
    refetch: fetchDaysStatus
  }
}

// Hook para slots disponibles
export const useAvailableSlots = (username, selectedDate, selectedService, barberId = null, totalDuration = null) => {
  const [availableSlots, setAvailableSlots] = useState([])
  const [allSlots, setAllSlots] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const abortControllerRef = useRef(null)

  // Usar debounce para evitar llamadas excesivas
  const debouncedDate = useDebounce(selectedDate, 300) // 300ms de debounce
  const debouncedService = useDebounce(selectedService?._id || selectedService?.id, 300)
  const debouncedBarber = useDebounce(barberId, 300)
  const debouncedDuration = useDebounce(totalDuration, 300)

  const fetchAvailableSlots = useCallback(async () => {
    if (!debouncedDate || !debouncedService || !username) return

    // Cancelar petición anterior si sigue en curso para evitar
    // que una respuesta fuera de orden sobrescriba el estado más reciente
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }
    const abortController = new AbortController()
    abortControllerRef.current = abortController

    try {
      setLoading(true)
      setError('')

      const params = {
        date: debouncedDate,
        serviceId: debouncedService
      }
      if (debouncedBarber) {
        params.barberId = debouncedBarber
      }
      // Si se pasa totalDuration (multi-servicio), enviarlo al endpoint
      if (debouncedDuration && debouncedDuration > 0) {
        params.totalDuration = debouncedDuration
      }

      const data = await cachedRequest(`/public/salon/${username}/availability/advanced`, params, 1 * 60 * 1000, { signal: abortController.signal }) // 1 minuto de caché para slots

      if (abortController.signal.aborted) return

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
      if (error.name === 'AbortError') return
      console.error('Error cargando slots:', error)
      setError('Error al cargar horarios')
      setAvailableSlots([])
      setAllSlots([])
    } finally {
      if (!abortController.signal.aborted) {
        setLoading(false)
      }
    }
  }, [debouncedDate, debouncedService, debouncedBarber, debouncedDuration, username])

  useEffect(() => {
    fetchAvailableSlots()
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
    }
  }, [fetchAvailableSlots])

  // Función para verificar disponibilidad en tiempo real (sin caché)
  const checkRealTimeAvailability = useCallback(async (time) => {
    if (!selectedDate || !selectedService || !username) return false

    try {
      let url = `${API_URL}/public/salon/${username}/availability/advanced?date=${selectedDate}&serviceId=${selectedService._id || selectedService.id}`
      if (barberId) {
        url += `&barberId=${barberId}`
      }
      if (totalDuration && totalDuration > 0) {
        url += `&totalDuration=${totalDuration}`
      }
      const response = await fetch(url)
      const data = await response.json()

      if (data.success && data.data.isBusinessDay) {
        return data.data.availableSlots.includes(time)
      }
      return false
    } catch (error) {
      console.error('Error verificando disponibilidad:', error)
      return false
    }
  }, [selectedDate, selectedService, barberId, totalDuration, username])

  return {
    availableSlots,
    allSlots,
    loading,
    error,
    refetch: fetchAvailableSlots,
    checkRealTimeAvailability,
    setAvailableSlots,
    setAllSlots,
    setError
  }
}
