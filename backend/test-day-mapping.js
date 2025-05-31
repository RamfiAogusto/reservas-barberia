// Script para debuggear el mapeo de días de la semana
const targetDates = [
  '2025-06-01', // Domingo según imagen
  '2025-06-02', // Lunes según imagen
  '2025-06-08', // Domingo siguiente
  '2025-06-09'  // Lunes siguiente
]

console.log('🔍 Debuggeando mapeo de días...\n')

targetDates.forEach(dateString => {
  // Método que usa el backend (UTC parsing)
  const backendDate = new Date(dateString + 'T12:00:00.000Z')
  const backendDay = backendDate.getDay()
  
  // Método normal de JS
  const normalDate = new Date(dateString)
  const normalDay = normalDate.getDay()
  
  // Nombres de días
  const dayNames = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']
  
  console.log(`📅 ${dateString}:`)
  console.log(`   Backend parsing (UTC): día ${backendDay} (${dayNames[backendDay]})`)
  console.log(`   Normal parsing: día ${normalDay} (${dayNames[normalDay]})`)
  console.log(`   Fecha real: ${backendDate.toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}`)
  console.log('')
})

console.log('📊 Resumen del problema:')
console.log('Si en el calendario ves "1 jun dom" como cerrado,')
console.log('pero en la base de datos Domingo (0) está activo,')
console.log('entonces hay un problema en el frontend o en el cálculo de días.') 