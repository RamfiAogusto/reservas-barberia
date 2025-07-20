#!/usr/bin/env node

/**
 * Script para debuggear problemas de zona horaria y cálculo de horas
 * Ayuda a identificar por qué los horarios se calculan incorrectamente
 */

require('dotenv').config()

function debugTimezoneIssues() {
  console.log('🔍 DEBUGGEO DE ZONA HORARIA Y CÁLCULO DE HORAS\n')

  // 1. Información del sistema
  console.log('📋 INFORMACIÓN DEL SISTEMA:')
  console.log(`   Sistema operativo: ${process.platform}`)
  console.log(`   Zona horaria del sistema: ${process.env.TZ || 'No configurada'}`)
  console.log(`   NODE_ENV: ${process.env.NODE_ENV || 'No configurado'}`)
  console.log()

  // 2. Fechas y horas actuales
  console.log('🕐 FECHAS Y HORAS ACTUALES:')
  const now = new Date()
  console.log(`   new Date(): ${now}`)
  console.log(`   toISOString(): ${now.toISOString()}`)
  console.log(`   toLocaleString(): ${now.toLocaleString()}`)
  console.log(`   toLocaleString('es-MX'): ${now.toLocaleString('es-MX')}`)
  console.log(`   toLocaleString('es-MX', {timeZone: 'America/Mexico_City'}): ${now.toLocaleString('es-MX', {timeZone: 'America/Mexico_City'})}`)
  console.log(`   getHours(): ${now.getHours()}`)
  console.log(`   getMinutes(): ${now.getMinutes()}`)
  console.log(`   getTimezoneOffset(): ${now.getTimezoneOffset()} minutos`)
  console.log()

  // 3. Comparación de métodos de creación de fechas
  console.log('📅 COMPARACIÓN DE MÉTODOS DE CREACIÓN DE FECHAS:')
  
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  console.log(`   new Date() + setHours(0,0,0,0): ${today}`)
  console.log(`   toISOString(): ${today.toISOString()}`)
  
  const todayString = today.toISOString().split('T')[0]
  console.log(`   Fecha string (YYYY-MM-DD): ${todayString}`)
  
  // Parsing manual vs automático
  const [year, month, day] = todayString.split('-').map(Number)
  const manualDate = new Date(year, month - 1, day)
  manualDate.setHours(0, 0, 0, 0)
  console.log(`   Parsing manual: new Date(${year}, ${month-1}, ${day}) = ${manualDate}`)
  
  const autoDate = new Date(todayString)
  console.log(`   Parsing automático: new Date('${todayString}') = ${autoDate}`)
  
  const autoDateWithTime = new Date(todayString + 'T12:00:00.000Z')
  console.log(`   Parsing con UTC: new Date('${todayString}T12:00:00.000Z') = ${autoDateWithTime}`)
  console.log()

  // 4. Simulación del cálculo de horarios
  console.log('⚙️ SIMULACIÓN DEL CÁLCULO DE HORARIOS:')
  
  // Simular horarios de negocio
  const businessStart = '09:00'
  const businessEnd = '18:00'
  const slotDuration = 30
  
  console.log(`   Horarios: ${businessStart} - ${businessEnd}`)
  console.log(`   Duración de slot: ${slotDuration} minutos`)
  
  // Convertir a minutos
  const [startHour, startMin] = businessStart.split(':').map(Number)
  const [endHour, endMin] = businessEnd.split(':').map(Number)
  const startMinutes = startHour * 60 + startMin
  const endMinutes = endHour * 60 + endMin
  
  console.log(`   Horarios en minutos: ${startMinutes} - ${endMinutes}`)
  
  // Generar slots
  const allSlots = []
  for (let minutes = startMinutes; minutes < endMinutes; minutes += slotDuration) {
    const hour = Math.floor(minutes / 60)
    const min = minutes % 60
    const timeString = `${hour.toString().padStart(2, '0')}:${min.toString().padStart(2, '0')}`
    allSlots.push(timeString)
  }
  
  console.log(`   Slots generados: ${allSlots.join(', ')}`)
  console.log(`   Total slots: ${allSlots.length}`)
  console.log()

  // 5. Filtrado de horarios pasados (simulación del código actual)
  console.log('🚫 FILTRADO DE HORARIOS PASADOS (CÓDIGO ACTUAL):')
  
  const currentHour = now.getHours()
  const currentMinute = now.getMinutes()
  console.log(`   Hora actual: ${currentHour}:${currentMinute.toString().padStart(2, '0')}`)
  
  const filteredSlots = allSlots.filter(slot => {
    const [slotHour, slotMinute] = slot.split(':').map(Number)
    if (slotHour > currentHour) return true
    if (slotHour === currentHour && slotMinute > currentMinute + 30) return true // 30 min buffer
    return false
  })
  
  console.log(`   Slots después del filtro: ${filteredSlots.join(', ')}`)
  console.log(`   Slots filtrados: ${allSlots.length - filteredSlots.length}`)
  console.log()

  // 6. Problemas identificados
  console.log('⚠️ PROBLEMAS IDENTIFICADOS:')
  
  // Problema 1: Zona horaria del servidor
  const serverTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone
  console.log(`   1. Zona horaria del servidor: ${serverTimezone}`)
  console.log(`      Si el servidor está en UTC pero el cliente en México, hay diferencia de 6 horas`)
  
  // Problema 2: Comparación de fechas
  console.log(`   2. Comparación de fechas:`)
  console.log(`      targetDate.getTime() === today.getTime()`)
  console.log(`      targetDate: ${manualDate.getTime()}`)
  console.log(`      today: ${today.getTime()}`)
  console.log(`      Son iguales: ${manualDate.getTime() === today.getTime()}`)
  
  // Problema 3: Cálculo de hora actual
  console.log(`   3. Cálculo de hora actual:`)
  console.log(`      Servidor usa: now.getHours() = ${currentHour}`)
  console.log(`      Cliente podría ver: ${new Date().getHours()} (si está en la misma zona)`)
  console.log()

  // 7. Soluciones recomendadas
  console.log('💡 SOLUCIONES RECOMENDADAS:')
  console.log(`   1. Configurar zona horaria del servidor:`)
  console.log(`      export TZ=America/Mexico_City`)
  console.log(`      O en el código: process.env.TZ = 'America/Mexico_City'`)
  console.log()
  console.log(`   2. Usar zona horaria específica en los cálculos:`)
  console.log(`      const now = new Date().toLocaleString('en-US', {timeZone: 'America/Mexico_City'})`)
  console.log()
  console.log(`   3. Enviar zona horaria del cliente al servidor:`)
  console.log(`      const clientTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone`)
  console.log()
  console.log(`   4. Usar UTC para almacenamiento y conversión local para display:`)
  console.log(`      Almacenar: new Date().toISOString()`)
  console.log(`      Mostrar: new Date(utcString).toLocaleString('es-MX')`)
  console.log()

  // 8. Test de diferentes zonas horarias
  console.log('🌍 TEST DE DIFERENTES ZONAS HORARIAS:')
  const timezones = ['UTC', 'America/Mexico_City', 'America/New_York', 'Europe/Madrid']
  
  timezones.forEach(tz => {
    const dateInTz = new Date().toLocaleString('en-US', {timeZone: tz})
    console.log(`   ${tz}: ${dateInTz}`)
  })
  console.log()

  // 9. Recomendación final
  console.log('🎯 RECOMENDACIÓN FINAL:')
  console.log(`   Para un sistema de reservas en México:`)
  console.log(`   1. Configurar TZ=America/Mexico_City en el servidor`)
  console.log(`   2. Usar new Date() para cálculos locales`)
  console.log(`   3. Almacenar fechas en UTC en la base de datos`)
  console.log(`   4. Convertir a zona local para display`)
  console.log(`   5. Considerar enviar zona horaria del cliente en las peticiones`)
}

// Ejecutar si se llama directamente
if (require.main === module) {
  debugTimezoneIssues()
}

module.exports = { debugTimezoneIssues } 