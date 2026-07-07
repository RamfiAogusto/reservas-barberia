import { API_URL } from './config'

// Sistema de caché para optimizar llamadas al API
class APICache {
  constructor() {
    this.cache = new Map()
    this.timestamps = new Map()
    this.defaultTTL = 5 * 60 * 1000 // 5 minutos por defecto
  }

  // Generar clave única para el caché
  generateKey(endpoint, params = {}) {
    const sortedParams = Object.keys(params)
      .sort()
      .map(key => `${key}:${params[key]}`)
      .join('|')
    return `${endpoint}${sortedParams ? `?${sortedParams}` : ''}`
  }

  // Obtener datos del caché
  get(key) {
    const timestamp = this.timestamps.get(key)
    const data = this.cache.get(key)
    
    if (!data || !timestamp) return null
    
    // Verificar si el caché ha expirado
    if (Date.now() - timestamp > this.defaultTTL) {
      this.delete(key)
      return null
    }
    
    return data
  }

  // Guardar datos en caché
  set(key, data, ttl = this.defaultTTL) {
    this.cache.set(key, data)
    this.timestamps.set(key, Date.now())
    
    // Limpiar caché expirado después de un tiempo
    setTimeout(() => {
      this.delete(key)
    }, ttl)
  }

  // Eliminar entrada del caché
  delete(key) {
    this.cache.delete(key)
    this.timestamps.delete(key)
  }

  // Limpiar todo el caché
  clear() {
    this.cache.clear()
    this.timestamps.clear()
  }

  // Limpiar caché expirado
  cleanup() {
    const now = Date.now()
    for (const [key, timestamp] of this.timestamps.entries()) {
      if (now - timestamp > this.defaultTTL) {
        this.delete(key)
      }
    }
  }

  // Obtener estadísticas del caché
  getStats() {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys())
    }
  }
}

// Instancia global del caché
const apiCache = new APICache()

// Función para hacer peticiones con caché
export const cachedRequest = async (endpoint, params = {}, ttl = null, fetchOptions = {}) => {
  const key = apiCache.generateKey(endpoint, params)
  
  // Para peticiones POST, PUT, DELETE, no usar caché
  const method = fetchOptions.method || 'GET'
  const isModifyingRequest = ['POST', 'PUT', 'DELETE', 'PATCH'].includes(method.toUpperCase())
  
  // Solo intentar obtener del caché para peticiones GET
  if (!isModifyingRequest) {
    const cachedData = apiCache.get(key)
    if (cachedData) {
      if (process.env.NODE_ENV !== 'production') {
        console.log(`📦 Cache hit: ${endpoint}`)
      }
      return cachedData
    }
  }

  // Si no está en caché o es petición modificadora, hacer la petición
  if (process.env.NODE_ENV !== 'production') {
    console.log(`🌐 API call: ${endpoint} (${method})`)
    console.log(`🔧 NEXT_PUBLIC_API_URL:`, API_URL)
  }

  const baseURL = API_URL

  // Construir URL correctamente para evitar que se elimine /api
  const fullURL = endpoint.startsWith('/')
    ? `${baseURL}${endpoint}`
    : `${baseURL}/${endpoint}`

  const url = new URL(fullURL)

  if (process.env.NODE_ENV !== 'production') {
    console.log(`🔗 URL construida:`, url.toString())
  }

  // Agregar parámetros a la URL solo para peticiones GET
  if (!isModifyingRequest) {
    Object.keys(params).forEach(key => {
      url.searchParams.append(key, params[key])
    })
  }

  try {
    if (process.env.NODE_ENV !== 'production') {
      console.log(`📡 Haciendo petición ${method} a:`, url.toString())
    }

    // Configurar opciones de fetch
    const fetchConfig = {
      method: method,
      headers: {
        'Content-Type': 'application/json',
        ...fetchOptions.headers
      },
      ...fetchOptions
    }
    
    // Para peticiones modificadoras, usar la URL base sin parámetros
    const requestURL = isModifyingRequest ? fullURL : url.toString()
    
    const response = await fetch(requestURL, fetchConfig)
    if (process.env.NODE_ENV !== 'production') {
      console.log(`📥 Respuesta del servidor:`, response.status, response.statusText)
    }

    const data = await response.json()

    if (!response.ok) {
      console.error(`❌ Error en respuesta:`, data)
      throw new Error(data.message || `Error ${response.status}`)
    }

    // Solo guardar en caché si la respuesta es exitosa y es GET
    if (!isModifyingRequest && data.success !== false) {
      apiCache.set(key, data, ttl)
    }
    return data
  } catch (error) {
    console.error(`Error en petición cacheada a ${endpoint}:`, error)
    throw error
  }
}

// Función para invalidar caché específico
export const invalidateCache = (endpoint, params = {}) => {
  const key = apiCache.generateKey(endpoint, params)
  apiCache.delete(key)
  if (process.env.NODE_ENV !== 'production') {
    console.log(`🗑️ Cache invalidated: ${endpoint}`)
  }
}

// Función para limpiar todo el caché
export const clearCache = () => {
  apiCache.clear()
  if (process.env.NODE_ENV !== 'production') {
    console.log('🧹 Cache cleared')
  }
}

// Función para obtener estadísticas del caché
export const getCacheStats = () => {
  return apiCache.getStats()
}

// Limpiar caché expirado cada 10 minutos
if (typeof window !== 'undefined') {
  setInterval(() => {
    apiCache.cleanup()
  }, 10 * 60 * 1000)
}

export default apiCache 