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

export default makeRequest 