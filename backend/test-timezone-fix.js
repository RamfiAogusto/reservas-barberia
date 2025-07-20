#!/usr/bin/env node

/**
 * Script para probar las nuevas utilidades de zona horaria
 * Verifica que el cálculo de horas funcione correctamente
 */

require('dotenv').config()
const { 
  getCurrentDateTime, 
  getCurrentDate, 
  getCurrentTime, 
  isToday, 
  isTimePassed, 
  filterPastSlots,
  getTimezoneDebugInfo 
} = require('./utils/timeUtils')

function testTimezoneFix() {
  console.log('🧪 PRUEBA DE UTILIDADES DE ZONA HORARIA\n')

  // 1. Información de debug
  console.log('📋 INFORMACIÓN DE ZONA HORARIA:')
  const debugInfo = getTimezoneDebugInfo()
  console.log(debugInfo)
  console.log()

  // 2. Prueba de funciones básicas
  console.log('🕐 FUNCIONES BÁSICAS:')
  console.log(`   getCurrentDateTime(): ${getCurrentDateTime()}`)
  console.log(`   getCurrentDate(): ${getCurrentDate()}`)
  console.log(`   getCurrentTime(): ${getCurrentTime()}`)
  console.log()

  // 3. Prueba de detección de "hoy"
  console.log('📅 PRUEBA DE DETECCIÓN DE "HOY":')
  const today = new Date()
  const todayString = today.toISOString().split('T')[0]
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)
  const yesterdayString = yesterday.toISOString().split('T')[0]
  
  console.log(`   isToday(${todayString}): ${isToday(todayString)}`)
  console.log(`   isToday(${yesterdayString}): ${isToday(yesterdayString)}`)
  console.log(`   isToday(today object): ${isToday(today)}`)
  console.log()

  // 4. Prueba de detección de horarios pasados
  console.log('⏰ PRUEBA DE HORARIOS PASADOS:')
  const currentTime = getCurrentTime()
  const [currentHour, currentMinute] = currentTime.split(':').map(Number)
  
  // Generar horarios de prueba
  const testTimes = [
    `${currentHour.toString().padStart(2, '0')}:${(currentMinute - 30).toString().padStart(2, '0')}`, // 30 min antes
    `${currentHour.toString().padStart(2, '0')}:${currentMinute.toString().padStart(2, '0')}`, // ahora
    `${currentHour.toString().padStart(2, '0')}:${(currentMinute + 30).toString().padStart(2, '0')}`, // 30 min después
    `${(currentHour + 1).toString().padStart(2, '0')}:${currentMinute.toString().padStart(2, '0')}`, // 1 hora después
  ]
  
  testTimes.forEach(time => {
    console.log(`   isTimePassed('${time}'): ${isTimePassed(time)}`)
  })
  console.log()

  // 5. Prueba de filtrado de slots
  console.log('🚫 PRUEBA DE FILTRADO DE SLOTS:')
  const businessSlots = [
    '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
    '12:00', '12:30', '13:00', '13:30', '14:00', '14:30',
    '15:00', '15:30', '16:00', '16:30', '17:00', '17:30'
  ]
  
  console.log(`   Slots originales: ${businessSlots.length}`)
  const availableSlots = filterPastSlots(businessSlots, 30)
  console.log(`   Slots disponibles: ${availableSlots.length}`)
  console.log(`   Slots filtrados: ${availableSlots.join(', ')}`)
  console.log()

  // 6. Simulación del problema original
  console.log('🔍 SIMULACIÓN DEL PROBLEMA ORIGINAL:')
  
  // Método antiguo (problemático)
  const oldNow = new Date()
  const oldToday = new Date()
  oldToday.setHours(0, 0, 0, 0)
  const oldCurrentHour = oldNow.getHours()
  const oldCurrentMinute = oldNow.getMinutes()
  
  console.log(`   Método antiguo:`)
  console.log(`     Hora del servidor: ${oldCurrentHour}:${oldCurrentMinute.toString().padStart(2, '0')}`)
  console.log(`     Zona horaria: ${Intl.DateTimeFormat().resolvedOptions().timeZone}`)
  
  // Método nuevo (corregido)
  const newCurrentTime = getCurrentTime('America/Mexico_City')
  const [newCurrentHour, newCurrentMinute] = newCurrentTime.split(':').map(Number)
  
  console.log(`   Método nuevo:`)
  console.log(`     Hora en México: ${newCurrentHour}:${newCurrentMinute.toString().padStart(2, '0')}`)
  console.log(`     Zona horaria: America/Mexico_City`)
  console.log()

  // 7. Comparación de resultados
  console.log('📊 COMPARACIÓN DE RESULTADOS:')
  
  const oldFiltered = businessSlots.filter(slot => {
    const [slotHour, slotMinute] = slot.split(':').map(Number)
    if (slotHour > oldCurrentHour) return true
    if (slotHour === oldCurrentHour && slotMinute > oldCurrentMinute + 30) return true
    return false
  })
  
  const newFiltered = filterPastSlots(businessSlots, 30, 'America/Mexico_City')
  
  console.log(`   Slots con método antiguo: ${oldFiltered.length}`)
  console.log(`   Slots con método nuevo: ${newFiltered.length}`)
  console.log(`   Diferencia: ${Math.abs(oldFiltered.length - newFiltered.length)} slots`)
  
  if (oldFiltered.length !== newFiltered.length) {
    console.log(`   ⚠️ ¡DIFERENCIA DETECTADA! El método nuevo corrige el problema.`)
  } else {
    console.log(`   ✅ Ambos métodos dan el mismo resultado.`)
  }
  console.log()

  // 8. Recomendaciones
  console.log('💡 RECOMENDACIONES:')
  console.log(`   1. ✅ Configurar TZ=America/Mexico_City en el servidor`)
  console.log(`   2. ✅ Usar las nuevas utilidades de timeUtils.js`)
  console.log(`   3. ✅ Probar en producción con diferentes zonas horarias`)
  console.log(`   4. ✅ Considerar enviar zona horaria del cliente en las peticiones`)
  console.log()

  return {
    oldMethod: oldFiltered.length,
    newMethod: newFiltered.length,
    difference: Math.abs(oldFiltered.length - newFiltered.length),
    timezoneConfigured: process.env.TZ === 'America/Mexico_City'
  }
}

// Ejecutar si se llama directamente
if (require.main === module) {
  const result = testTimezoneFix()
  console.log('🎯 RESULTADO FINAL:', result)
}

module.exports = { testTimezoneFix } 