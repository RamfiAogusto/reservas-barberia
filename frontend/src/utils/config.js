// Configuración centralizada de URLs del backend
// Evita repetir el mismo fallback de env var en múltiples archivos

export const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'

// URL del servidor de sockets: misma base que la API, sin el sufijo /api
export const SOCKET_URL = API_URL.replace(/\/api\/?$/, '')
