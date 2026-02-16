/**
 * Convierte hora de formato 24h (HH:MM o HH:MM:SS) a formato 12h (h:MM AM/PM)
 * @param {string} time24 - Hora en formato 24h, ej: "14:30", "09:00"
 * @returns {string} Hora en formato 12h, ej: "2:30 PM", "9:00 AM"
 */
export const formatTime12h = (time24) => {
  if (!time24 || typeof time24 !== 'string') return ''
  const parts = time24.trim().split(':')
  const hour = parseInt(parts[0], 10)
  const min = parts[1] ? parseInt(parts[1], 10) : 0
  if (isNaN(hour)) return time24

  const period = hour >= 12 ? 'PM' : 'AM'
  const hour12 = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour
  const minStr = min.toString().padStart(2, '0')
  return `${hour12}:${minStr} ${period}`
}

/**
 * Genera opciones de hora en formato 12h para selects (cada 15 min)
 * @returns {Array<{value: string, label: string}>}
 */
export const getTimeOptions12h = () => {
  const options = []
  for (let h = 0; h < 24; h++) {
    for (let m = 0; m < 60; m += 15) {
      const value = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`
      const label = formatTime12h(value)
      options.push({ value, label })
    }
  }
  return options
}
