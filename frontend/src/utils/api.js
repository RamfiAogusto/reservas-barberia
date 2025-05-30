const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'

// Función helper para hacer peticiones HTTP
const makeRequest = async (endpoint, options = {}) => {
  const url = `${API_BASE_URL}${endpoint}`
  
  const config = {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers
    },
    ...options
  }

  // Si hay un token en localStorage, agregarlo a los headers
  const token = localStorage.getItem('authToken')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }

  try {
    const response = await fetch(url, config)
    const data = await response.json()

    if (!response.ok) {
      throw new Error(data.message || `Error ${response.status}`)
    }

    return data
  } catch (error) {
    console.error(`Error en petición a ${endpoint}:`, error)
    throw error
  }
}

// API object con métodos HTTP
const api = {
  // Métodos HTTP generales
  get: (endpoint) => makeRequest(endpoint, { method: 'GET' }),
  post: (endpoint, data) => makeRequest(endpoint, { 
    method: 'POST', 
    body: JSON.stringify(data) 
  }),
  put: (endpoint, data) => makeRequest(endpoint, { 
    method: 'PUT', 
    body: JSON.stringify(data) 
  }),
  delete: (endpoint) => makeRequest(endpoint, { method: 'DELETE' }),

  // Servicios
  services: {
    getAll: () => api.get('/services'),
    getById: (id) => api.get(`/services/${id}`),
    create: (data) => api.post('/services', data),
    update: (id, data) => api.put(`/services/${id}`, data),
    delete: (id) => api.delete(`/services/${id}`),
    getStats: () => api.get('/services/stats/summary')
  },

  // Citas
  appointments: {
    getAll: () => api.get('/appointments'),
    getById: (id) => api.get(`/appointments/${id}`),
    create: (data) => api.post('/appointments', data),
    update: (id, data) => api.put(`/appointments/${id}`, data),
    delete: (id) => api.delete(`/appointments/${id}`),
    getStats: () => api.get('/appointments/stats/summary'),
    getToday: () => api.get('/appointments/today'),
    updateStatus: (id, status) => api.put(`/appointments/${id}/status`, { status })
  },

  // Usuarios
  users: {
    getProfile: () => api.get('/users/profile'),
    updateProfile: (data) => api.put('/users/profile', data)
  }
}

// Funciones específicas para autenticación
export const authAPI = {
  // Registro de usuario
  register: async (userData) => {
    return makeRequest('/auth/register', {
      method: 'POST',
      body: JSON.stringify(userData)
    })
  },

  // Login de usuario
  login: async (credentials) => {
    return makeRequest('/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials)
    })
  },

  // Logout de usuario
  logout: async () => {
    return makeRequest('/auth/logout', {
      method: 'POST'
    })
  }
}

// Función para guardar token en localStorage
export const saveAuthToken = (token) => {
  localStorage.setItem('authToken', token)
}

// Función para obtener token de localStorage
export const getAuthToken = () => {
  return localStorage.getItem('authToken')
}

// Función para remover token de localStorage
export const removeAuthToken = () => {
  localStorage.removeItem('authToken')
}

// Función para guardar información del usuario
export const saveUserData = (user) => {
  localStorage.setItem('user', JSON.stringify(user))
}

// Función para obtener información del usuario
export const getUserData = () => {
  const userData = localStorage.getItem('user')
  return userData ? JSON.parse(userData) : null
}

// Función para limpiar todos los datos de autenticación
export const clearAuthData = () => {
  localStorage.removeItem('authToken')
  localStorage.removeItem('user')
}

// Exportar tanto el objeto api como makeRequest
export default api
export { makeRequest } 