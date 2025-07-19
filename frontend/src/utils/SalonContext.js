'use client'

import React, { createContext, useContext, useReducer, useCallback } from 'react'
import { cachedRequest, invalidateCache } from './cache'

// Estado inicial
const initialState = {
  salonData: new Map(),
  loadingStates: new Map(),
  errorStates: new Map()
}

// Tipos de acciones
const ACTIONS = {
  SET_SALON_DATA: 'SET_SALON_DATA',
  SET_LOADING: 'SET_LOADING',
  SET_ERROR: 'SET_ERROR',
  CLEAR_SALON_DATA: 'CLEAR_SALON_DATA'
}

// Reducer
const salonReducer = (state, action) => {
  switch (action.type) {
    case ACTIONS.SET_SALON_DATA:
      return {
        ...state,
        salonData: new Map(state.salonData).set(action.payload.username, action.payload.data),
        loadingStates: new Map(state.loadingStates).set(action.payload.username, false),
        errorStates: new Map(state.errorStates).set(action.payload.username, null)
      }
    
    case ACTIONS.SET_LOADING:
      return {
        ...state,
        loadingStates: new Map(state.loadingStates).set(action.payload.username, action.payload.loading)
      }
    
    case ACTIONS.SET_ERROR:
      return {
        ...state,
        errorStates: new Map(state.errorStates).set(action.payload.username, action.payload.error),
        loadingStates: new Map(state.loadingStates).set(action.payload.username, false)
      }
    
    case ACTIONS.CLEAR_SALON_DATA:
      return {
        ...state,
        salonData: new Map(),
        loadingStates: new Map(),
        errorStates: new Map()
      }
    
    default:
      return state
  }
}

// Crear contexto
const SalonContext = createContext()

// Provider del contexto
export const SalonProvider = ({ children }) => {
  const [state, dispatch] = useReducer(salonReducer, initialState)

  // Función para obtener datos del salón
  const getSalonData = useCallback(async (username) => {
    if (!username) return null

    // Verificar si ya tenemos los datos
    if (state.salonData.has(username)) {
      return state.salonData.get(username)
    }

    // Verificar si ya está cargando
    if (state.loadingStates.get(username)) {
      return null // Ya se está cargando
    }

    try {
      dispatch({ 
        type: ACTIONS.SET_LOADING, 
        payload: { username, loading: true } 
      })

      const data = await cachedRequest(`/public/salon/${username}`)
      
      if (data.success) {
        dispatch({ 
          type: ACTIONS.SET_SALON_DATA, 
          payload: { username, data: data.data } 
        })
        return data.data
      } else {
        dispatch({ 
          type: ACTIONS.SET_ERROR, 
          payload: { username, error: data.message || 'Salón no encontrado' } 
        })
        return null
      }
    } catch (error) {
      console.error('Error al cargar perfil:', error)
      dispatch({ 
        type: ACTIONS.SET_ERROR, 
        payload: { username, error: 'Error al cargar la información del salón' } 
      })
      return null
    }
  }, [state.salonData, state.loadingStates])

  // Función para invalidar caché
  const invalidateSalonCache = useCallback((username) => {
    if (username) {
      invalidateCache(`/public/salon/${username}`)
      // Limpiar del estado global
      const newSalonData = new Map(state.salonData)
      newSalonData.delete(username)
      dispatch({ 
        type: ACTIONS.SET_SALON_DATA, 
        payload: { username, data: null } 
      })
    }
  }, [state.salonData])

  // Función para limpiar todo
  const clearAllData = useCallback(() => {
    dispatch({ type: ACTIONS.CLEAR_SALON_DATA })
  }, [])

  const value = {
    // Estado
    salonData: state.salonData,
    loadingStates: state.loadingStates,
    errorStates: state.errorStates,
    
    // Funciones
    getSalonData,
    invalidateSalonCache,
    clearAllData,
    
    // Helpers
    getSalon: (username) => state.salonData.get(username),
    isLoading: (username) => state.loadingStates.get(username) || false,
    getError: (username) => state.errorStates.get(username)
  }

  return (
    <SalonContext.Provider value={value}>
      {children}
    </SalonContext.Provider>
  )
}

// Hook para usar el contexto
export const useSalonContext = () => {
  const context = useContext(SalonContext)
  if (!context) {
    throw new Error('useSalonContext debe usarse dentro de SalonProvider')
  }
  return context
}

// Hook optimizado para datos del salón
export const useSalonDataOptimized = (username) => {
  const { getSalonData, getSalon, isLoading, getError } = useSalonContext()
  
  const salon = getSalon(username)
  const loading = isLoading(username)
  const error = getError(username)

  // Cargar datos si no están disponibles y no está cargando
  React.useEffect(() => {
    if (username && !salon && !loading) {
      getSalonData(username)
    }
  }, [username, salon, loading, getSalonData])

  return {
    salon,
    loading,
    error,
    refetch: () => getSalonData(username)
  }
} 