'use client'

import { getTimeOptions12h } from '@/utils/formatTime'

/**
 * Input de hora en formato 12h. Almacena valor en 24h para la API.
 * @param {Object} props
 * @param {string} props.value - Hora en formato 24h (HH:MM)
 * @param {function} props.onChange - (value: string) => void, recibe valor 24h
 * @param {string} props.className - Clases adicionales
 * @param {boolean} props.required
 * @param {string} props.id
 * @param {string} props['aria-label']
 */
const TimeInput12h = ({ value, onChange, className = '', required = false, id, 'aria-label': ariaLabel }) => {
  const options = getTimeOptions12h()

  const handleChange = (e) => {
    onChange(e.target.value)
  }

  return (
    <select
      id={id}
      value={value || ''}
      onChange={handleChange}
      required={required}
      aria-label={ariaLabel}
      className={`border rounded-lg px-3 py-2 ${className}`}
    >
      <option value="">Seleccionar hora</option>
      {options.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
  )
}

export default TimeInput12h
