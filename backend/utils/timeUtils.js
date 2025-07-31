/**
 * Utilidades para manejo de fechas y horas con zona horaria específica
 * Asegura que todos los cálculos se hagan en la zona horaria de México
 */

// Zona horaria por defecto para México
const DEFAULT_TIMEZONE = 'America/Mexico_City'

/**
 * Obtiene la fecha y hora actual en la zona horaria especificada
 * @param {string} timezone - Zona horaria (por defecto México)
 * @returns {Date} Fecha actual en la zona horaria especificada
 */
function getCurrentDateTime(timezone = DEFAULT_TIMEZONE) {
  const now = new Date()
  const localTime = now.toLocaleString('en-US', { timeZone: timezone })
  return new Date(localTime)
}

/**
 * Obtiene la fecha actual (sin hora) en la zona horaria especificada
 * @param {string} timezone - Zona horaria (por defecto México)
 * @returns {Date} Fecha actual al inicio del día
 */
function getCurrentDate(timezone = DEFAULT_TIMEZONE) {
  const now = getCurrentDateTime(timezone)
  now.setHours(0, 0, 0, 0)
  return now
}

/**
 * Obtiene la hora actual en formato HH:MM
 * @param {string} timezone - Zona horaria (por defecto México)
 * @returns {string} Hora actual en formato HH:MM
 */
function getCurrentTime(timezone = DEFAULT_TIMEZONE) {
  const now = getCurrentDateTime(timezone)
  const hours = now.getHours().toString().padStart(2, '0')
  const minutes = now.getMinutes().toString().padStart(2, '0')
  return `${hours}:${minutes}`
}

/**
 * Convierte una fecha string (YYYY-MM-DD) a Date en la zona horaria especificada
 * @param {string} dateString - Fecha en formato YYYY-MM-DD
 * @param {string} timezone - Zona horaria (por defecto México)
 * @returns {Date} Fecha en la zona horaria especificada
 */
function parseDateString(dateString, timezone = DEFAULT_TIMEZONE) {
  const [year, month, day] = dateString.split('-').map(Number)
  const date = new Date(year, month - 1, day)
  
  // Convertir a la zona horaria especificada
  const localDate = date.toLocaleString('en-US', { timeZone: timezone })
  const parsedDate = new Date(localDate)
  parsedDate.setHours(0, 0, 0, 0)
  
  return parsedDate
}

/**
 * Verifica si una fecha es hoy en la zona horaria especificada
 * @param {Date|string} date - Fecha a verificar
 * @param {string} timezone - Zona horaria (por defecto México)
 * @returns {boolean} True si es hoy
 */
function isToday(date, timezone = DEFAULT_TIMEZONE) {
  const targetDate = typeof date === 'string' ? parseDateString(date, timezone) : date
  const today = getCurrentDate(timezone)
  
  return targetDate.getTime() === today.getTime()
}

/**
 * Verifica si un horario ya pasó en la zona horaria especificada
 * @param {string} time - Horario en formato HH:MM
 * @param {string} timezone - Zona horaria (por defecto México)
 * @returns {boolean} True si el horario ya pasó
 */
function isTimePassed(time, timezone = DEFAULT_TIMEZONE) {
  const [timeHour, timeMinute] = time.split(':').map(Number)
  const currentTime = getCurrentTime(timezone)
  const [currentHour, currentMinute] = currentTime.split(':').map(Number)
  
  if (timeHour > currentHour) return false
  if (timeHour === currentHour && timeMinute > currentMinute) return false
  return true
}

/**
 * Filtra horarios que ya pasaron con buffer de tiempo
 * @param {string[]} slots - Array de horarios en formato HH:MM
 * @param {number} bufferMinutes - Buffer en minutos (por defecto 30)
 * @param {string} timezone - Zona horaria (por defecto México)
 * @returns {string[]} Horarios disponibles
 */
function filterPastSlots(slots, bufferMinutes = 30, timezone = DEFAULT_TIMEZONE) {
  const currentTime = getCurrentTime(timezone)
  const [currentHour, currentMinute] = currentTime.split(':').map(Number)
  
  return slots.filter(slot => {
    const [slotHour, slotMinute] = slot.split(':').map(Number)
    
    if (slotHour > currentHour) return true
    if (slotHour === currentHour && slotMinute > currentMinute + bufferMinutes) return true
    return false
  })
}

/**
 * Formatea una fecha para mostrar en la zona horaria especificada
 * @param {Date|string} date - Fecha a formatear
 * @param {string} timezone - Zona horaria (por defecto México)
 * @returns {string} Fecha formateada
 */
function formatDateForDisplay(date, timezone = DEFAULT_TIMEZONE) {
  const dateObj = typeof date === 'string' ? new Date(date) : date
  return dateObj.toLocaleDateString('es-MX', { timeZone: timezone })
}



module.exports = {
  getCurrentDateTime,
  getCurrentDate,
  getCurrentTime,
  parseDateString,
  isToday,
  isTimePassed,
  filterPastSlots,
  formatDateForDisplay,
  DEFAULT_TIMEZONE
} 