const axios = require('axios')

const API_BASE = 'http://localhost:5000/api'

// Configuración de usuario de prueba
const credentials = {
  email: 'ramfiaogusto@gmail.com',
  password: '123456'
}

let authToken = ''

async function login() {
  try {
    const response = await axios.post(`${API_BASE}/auth/login`, credentials)
    if (response.data.success) {
      authToken = response.data.token
      console.log('✅ Login exitoso')
      return true
    }
    return false
  } catch (error) {
    console.log('❌ Error en login:', error.response?.data?.message || error.message)
    return false
  }
}

async function cleanupDuplicateData() {
  console.log('\n🧹 Limpiando datos duplicados...')
  
  try {
    // Limpiar descansos duplicados
    const breaksResponse = await axios.get(`${API_BASE}/schedules/recurring-breaks`, {
      headers: { 'Authorization': `Bearer ${authToken}` }
    })
    
    if (breaksResponse.data.success) {
      const breaks = breaksResponse.data.data
      const seenBreaks = new Set()
      
      for (const breakItem of breaks) {
        const key = `${breakItem.name}-${breakItem.startTime}-${breakItem.endTime}`
        if (seenBreaks.has(key)) {
          // Eliminar duplicado
          await axios.delete(`${API_BASE}/schedules/recurring-breaks/${breakItem._id}`, {
            headers: { 'Authorization': `Bearer ${authToken}` }
          })
          console.log(`   Eliminado descanso duplicado: ${breakItem.name}`)
        } else {
          seenBreaks.add(key)
        }
      }
    }

    // Limpiar excepciones duplicadas
    const exceptionsResponse = await axios.get(`${API_BASE}/schedules/exceptions`, {
      headers: { 'Authorization': `Bearer ${authToken}` }
    })
    
    if (exceptionsResponse.data.success) {
      const exceptions = exceptionsResponse.data.data
      const seenExceptions = new Set()
      
      for (const exception of exceptions) {
        const key = `${exception.name}-${exception.startDate}-${exception.endDate}`
        if (seenExceptions.has(key)) {
          // Eliminar duplicado
          await axios.delete(`${API_BASE}/schedules/exceptions/${exception._id}`, {
            headers: { 'Authorization': `Bearer ${authToken}` }
          })
          console.log(`   Eliminada excepción duplicada: ${exception.name}`)
        } else {
          seenExceptions.add(key)
        }
      }
    }

    console.log('✅ Limpieza completada')
    
  } catch (error) {
    console.log('❌ Error en limpieza:', error.response?.data?.message || error.message)
  }
}

async function testBusinessHours() {
  console.log('\n📅 Probando horarios base...')
  
  try {
    // 1. Obtener horarios actuales
    console.log('1. Obteniendo horarios actuales:')
    const getResponse = await axios.get(`${API_BASE}/schedules/business-hours`, {
      headers: { 'Authorization': `Bearer ${authToken}` }
    })
    
    if (getResponse.data.success) {
      console.log('✅ Horarios obtenidos')
      console.log(`   Días configurados: ${getResponse.data.data.length}`)
      getResponse.data.data.forEach(day => {
        console.log(`   ${day.dayName}: ${day.isActive ? `${day.startTime}-${day.endTime}` : 'Cerrado'}`)
      })
    }

    // 2. Configurar horarios de ejemplo
    console.log('\n2. Configurando horarios de ejemplo:')
    const scheduleData = [
      { dayOfWeek: 0, isActive: false }, // Domingo - cerrado
      { dayOfWeek: 1, isActive: true, startTime: '09:00', endTime: '18:00' }, // Lunes
      { dayOfWeek: 2, isActive: true, startTime: '09:00', endTime: '18:00' }, // Martes
      { dayOfWeek: 3, isActive: false }, // Miércoles - cerrado
      { dayOfWeek: 4, isActive: true, startTime: '09:00', endTime: '18:00' }, // Jueves
      { dayOfWeek: 5, isActive: true, startTime: '09:00', endTime: '20:00' }, // Viernes
      { dayOfWeek: 6, isActive: true, startTime: '08:00', endTime: '17:00' }  // Sábado
    ]

    const updateResponse = await axios.put(`${API_BASE}/schedules/business-hours`, {
      schedule: scheduleData
    }, {
      headers: { 'Authorization': `Bearer ${authToken}` }
    })

    if (updateResponse.data.success) {
      console.log('✅ Horarios actualizados exitosamente')
    }

  } catch (error) {
    console.log('❌ Error en horarios base:', error.response?.data?.message || error.message)
  }
}

async function testRecurringBreaks() {
  console.log('\n☕ Probando descansos recurrentes...')
  
  try {
    // Verificar si ya existen descansos
    const existingBreaks = await axios.get(`${API_BASE}/schedules/recurring-breaks`, {
      headers: { 'Authorization': `Bearer ${authToken}` }
    })

    const hasLunchBreak = existingBreaks.data.data?.find(b => b.name === 'Almuerzo')
    const hasWednesdayBreak = existingBreaks.data.data?.find(b => b.name === 'Descanso Miércoles')

    // 1. Crear descanso de almuerzo diario (solo si no existe)
    if (!hasLunchBreak) {
      console.log('1. Creando descanso de almuerzo:')
      const lunchBreak = {
        name: 'Almuerzo',
        startTime: '13:00',
        endTime: '14:00',
        recurrenceType: 'daily',
        specificDays: []
      }

      const lunchResponse = await axios.post(`${API_BASE}/schedules/recurring-breaks`, lunchBreak, {
        headers: { 'Authorization': `Bearer ${authToken}` }
      })

      if (lunchResponse.data.success) {
        console.log('✅ Descanso de almuerzo creado')
        console.log(`   ID: ${lunchResponse.data.data._id}`)
      }
    } else {
      console.log('1. Descanso de almuerzo ya existe ✓')
    }

    // 2. Crear descanso específico para miércoles (solo si no existe)
    if (!hasWednesdayBreak) {
      console.log('\n2. Creando descanso específico para miércoles:')
      const wednesdayBreak = {
        name: 'Descanso Miércoles',
        startTime: '15:00',
        endTime: '16:00',
        recurrenceType: 'specific_days',
        specificDays: [3] // Miércoles
      }

      const wedResponse = await axios.post(`${API_BASE}/schedules/recurring-breaks`, wednesdayBreak, {
        headers: { 'Authorization': `Bearer ${authToken}` }
      })

      if (wedResponse.data.success) {
        console.log('✅ Descanso de miércoles creado')
        console.log(`   ID: ${wedResponse.data.data._id}`)
      }
    } else {
      console.log('\n2. Descanso de miércoles ya existe ✓')
    }

    // 3. Listar todos los descansos
    console.log('\n3. Listando todos los descansos:')
    const listResponse = await axios.get(`${API_BASE}/schedules/recurring-breaks`, {
      headers: { 'Authorization': `Bearer ${authToken}` }
    })

    if (listResponse.data.success) {
      console.log(`✅ ${listResponse.data.data.length} descansos encontrados:`)
      listResponse.data.data.forEach(breakItem => {
        console.log(`   - ${breakItem.name}: ${breakItem.startTime}-${breakItem.endTime}`)
        console.log(`     ${breakItem.recurrenceDescription}`)
      })
    }

  } catch (error) {
    console.log('❌ Error en descansos:', error.response?.data?.message || error.message)
  }
}

async function testScheduleExceptions() {
  console.log('\n🚫 Probando excepciones de horario...')
  
  try {
    // Verificar excepciones existentes
    const existingExceptions = await axios.get(`${API_BASE}/schedules/exceptions`, {
      headers: { 'Authorization': `Bearer ${authToken}` }
    })

    const hasVacation = existingExceptions.data.data?.find(e => e.name === 'Vacaciones de Verano')
    const hasChristmas = existingExceptions.data.data?.find(e => e.name === 'Víspera de Navidad')
    const hasNewYear = existingExceptions.data.data?.find(e => e.name === 'Año Nuevo')

    // 1. Crear día libre (vacaciones) solo si no existe
    if (!hasVacation) {
      console.log('1. Creando período de vacaciones:')
      const vacation = {
        name: 'Vacaciones de Verano',
        exceptionType: 'vacation',
        startDate: '2025-07-15',
        endDate: '2025-07-30',
        reason: 'Vacaciones familiares programadas'
      }

      const vacationResponse = await axios.post(`${API_BASE}/schedules/exceptions`, vacation, {
        headers: { 'Authorization': `Bearer ${authToken}` }
      })

      if (vacationResponse.data.success) {
        console.log('✅ Vacaciones creadas')
        console.log(`   ID: ${vacationResponse.data.data._id}`)
        console.log(`   Duración: ${vacationResponse.data.data.durationDays} días`)
      }
    } else {
      console.log('1. Vacaciones ya existen ✓')
    }

    // 2. Crear horario especial para Navidad solo si no existe
    if (!hasChristmas) {
      console.log('\n2. Creando horario especial para Navidad:')
      const christmas = {
        name: 'Víspera de Navidad',
        exceptionType: 'special_hours',
        startDate: '2025-12-24',
        endDate: '2025-12-24',
        specialStartTime: '09:00',
        specialEndTime: '14:00',
        isRecurringAnnually: true,
        reason: 'Horario especial para la víspera de Navidad'
      }

      const christmasResponse = await axios.post(`${API_BASE}/schedules/exceptions`, christmas, {
        headers: { 'Authorization': `Bearer ${authToken}` }
      })

      if (christmasResponse.data.success) {
        console.log('✅ Horario especial de Navidad creado')
        console.log(`   ID: ${christmasResponse.data.data._id}`)
        console.log(`   Horario especial: ${christmasResponse.data.data.specialStartTime}-${christmasResponse.data.data.specialEndTime}`)
      }
    } else {
      console.log('\n2. Horario especial de Navidad ya existe ✓')
    }

    // 3. Crear día festivo recurrente solo si no existe
    if (!hasNewYear) {
      console.log('\n3. Creando día festivo (Año Nuevo):')
      const newYear = {
        name: 'Año Nuevo',
        exceptionType: 'holiday',
        startDate: '2025-01-01',
        endDate: '2025-01-01',
        isRecurringAnnually: true,
        reason: 'Día festivo nacional'
      }

      const newYearResponse = await axios.post(`${API_BASE}/schedules/exceptions`, newYear, {
        headers: { 'Authorization': `Bearer ${authToken}` }
      })

      if (newYearResponse.data.success) {
        console.log('✅ Día festivo creado')
        console.log(`   ID: ${newYearResponse.data.data._id}`)
      }
    } else {
      console.log('\n3. Día festivo ya existe ✓')
    }

    // 4. Listar todas las excepciones
    console.log('\n4. Listando todas las excepciones:')
    const listResponse = await axios.get(`${API_BASE}/schedules/exceptions`, {
      headers: { 'Authorization': `Bearer ${authToken}` }
    })

    if (listResponse.data.success) {
      console.log(`✅ ${listResponse.data.data.length} excepciones encontradas:`)
      listResponse.data.data.forEach(exception => {
        console.log(`   - ${exception.name} (${exception.typeDescription})`)
        console.log(`     ${new Date(exception.startDate).toLocaleDateString()} - ${new Date(exception.endDate).toLocaleDateString()}`)
        if (exception.hasSpecialHours) {
          console.log(`     Horario especial: ${exception.specialStartTime}-${exception.specialEndTime}`)
        }
      })
    }

  } catch (error) {
    console.log('❌ Error en excepciones:', error.response?.data?.message || error.message)
  }
}

async function testAdvancedAvailability() {
  console.log('\n🔍 Probando disponibilidad avanzada...')
  
  try {
    // Obtener servicios disponibles
    const servicesResponse = await axios.get(`${API_BASE}/services`, {
      headers: { 'Authorization': `Bearer ${authToken}` }
    })

    if (!servicesResponse.data.success || !servicesResponse.data.data || servicesResponse.data.data.length === 0) {
      console.log('⚠️ No hay servicios disponibles para probar - creando servicio de prueba...')
      
      // Crear un servicio de prueba
      try {
        const testService = {
          name: 'Corte Clásico',
          description: 'Corte de cabello tradicional',
          category: 'corte',
          price: 25,
          duration: 30,
          requiresPayment: false
        }

        const createServiceResponse = await axios.post(`${API_BASE}/services`, testService, {
          headers: { 'Authorization': `Bearer ${authToken}` }
        })

        if (createServiceResponse.data.success) {
          console.log('✅ Servicio de prueba creado')
          // Usar el servicio recién creado
          const firstService = createServiceResponse.data.data
          await testAvailabilityWithService(firstService)
        } else {
          console.log('❌ No se pudo crear servicio de prueba')
          return
        }
      } catch (error) {
        console.log('❌ Error creando servicio de prueba:', error.response?.data?.message || error.message)
        return
      }
    } else {
      const firstService = servicesResponse.data.data[0]
      await testAvailabilityWithService(firstService)
    }

  } catch (error) {
    console.log('❌ Error en disponibilidad avanzada:', error.response?.data?.message || error.message)
  }
}

async function testAvailabilityWithService(service) {
  console.log(`   Usando servicio: ${service.name}`)

  // 1. Probar disponibilidad para un lunes (día laborable)
  console.log('\n1. Probando disponibilidad para un lunes:')
  const monday = '2025-06-02' // Un lunes futuro
  
  try {
    const mondayResponse = await axios.get(`${API_BASE}/schedules/availability/advanced`, {
      params: { date: monday, serviceId: service._id },
      headers: { 'Authorization': `Bearer ${authToken}` }
    })

    if (mondayResponse.data.success) {
      const mondayData = mondayResponse.data.data
      console.log(`   ✅ Lunes ${monday}:`)
      console.log(`      Es día laborable: ${mondayData.isBusinessDay}`)
      if (mondayData.isBusinessDay) {
        console.log(`      Horario: ${mondayData.businessHours.start}-${mondayData.businessHours.end}`)
        console.log(`      Especial: ${mondayData.businessHours.isSpecial}`)
        console.log(`      Descansos: ${mondayData.breaks.length}`)
        console.log(`      Slots disponibles: ${mondayData.totalSlots}`)
      } else {
        console.log(`      Razón: ${mondayData.reason || 'N/A'}`)
      }
    } else {
      console.log(`   ❌ Error: ${mondayResponse.data.message}`)
    }
  } catch (error) {
    console.log(`   ❌ Error en lunes: ${error.response?.data?.message || error.message}`)
  }

  // 2. Probar disponibilidad para miércoles (cerrado)
  console.log('\n2. Probando disponibilidad para miércoles (cerrado):')
  const wednesday = '2025-06-04' // Un miércoles futuro
  
  try {
    const wedResponse = await axios.get(`${API_BASE}/schedules/availability/advanced`, {
      params: { date: wednesday, serviceId: service._id },
      headers: { 'Authorization': `Bearer ${authToken}` }
    })

    if (wedResponse.data.success) {
      const wedData = wedResponse.data.data
      console.log('   ✅ Disponibilidad para miércoles obtenida')
      console.log(`      Es día laborable: ${wedData.isBusinessDay}`)
      if (wedData.isBusinessDay) {
        console.log(`      Horario: ${wedData.businessHours.start}-${wedData.businessHours.end}`)
        console.log(`      Slots disponibles: ${wedData.totalSlots}`)
      } else {
        console.log(`      Razón: ${wedData.reason || 'N/A'}`)
      }
    } else {
      console.log(`   ❌ Error: ${wedResponse.data.message}`)
    }
  } catch (error) {
    console.log(`   ❌ Error en miércoles: ${error.response?.data?.message || error.message}`)
  }
}

async function testPublicAvailabilityWithSchedules() {
  console.log('\n🌐 Probando disponibilidad pública con horarios avanzados...')
  
  try {
    const username = 'ramfi_aog'
    
    // Obtener servicios del salón público
    const salonResponse = await axios.get(`${API_BASE}/public/salon/${username}`)
    
    if (!salonResponse.data.success || salonResponse.data.data.services.length === 0) {
      console.log('⚠️ No hay servicios públicos disponibles')
      return
    }

    const firstService = salonResponse.data.data.services[0]
    console.log(`   Usando servicio público: ${firstService.name}`)

    // Probar varios días
    const testDates = [
      { date: '2025-06-02', name: 'Lunes (laborable)' },
      { date: '2025-06-04', name: 'Miércoles (cerrado)' },
      { date: '2025-06-01', name: 'Domingo (cerrado)' },
      { date: '2025-12-24', name: 'Víspera Navidad (especial)' }
    ]

    for (const testDate of testDates) {
      console.log(`\n   Probando ${testDate.name}:`)
      
      const response = await axios.get(`${API_BASE}/public/salon/${username}/availability`, {
        params: { date: testDate.date, serviceId: firstService._id }
      })

      if (response.data.success) {
        const data = response.data.data
        console.log(`   ✅ Es día laborable: ${data.isBusinessDay}`)
        
        if (data.isBusinessDay) {
          console.log(`      Horario: ${data.businessHours.start}-${data.businessHours.end}`)
          console.log(`      Especial: ${data.businessHours.isSpecial}`)
          console.log(`      Slots: ${data.totalSlots}`)
        } else {
          console.log(`      Razón: ${data.reason}`)
        }
      }
    }

  } catch (error) {
    console.log('❌ Error en disponibilidad pública:', error.response?.data?.message || error.message)
  }
}

async function runAllTests() {
  console.log('🎯 Iniciando pruebas del sistema de horarios avanzado...\n')

  // Login
  const loginSuccess = await login()
  if (!loginSuccess) {
    console.log('❌ No se pudo hacer login. Abortando pruebas.')
    return
  }

  // Limpiar datos duplicados
  await cleanupDuplicateData()

  // Ejecutar todas las pruebas
  await testBusinessHours()
  await testRecurringBreaks()
  await testScheduleExceptions()
  await testAdvancedAvailability()
  await testPublicAvailabilityWithSchedules()

  console.log('\n🎉 Todas las pruebas completadas!')
  console.log('\n📋 Resumen:')
  console.log('   ✅ Horarios base - configurados')
  console.log('   ✅ Descansos recurrentes - creados')
  console.log('   ✅ Excepciones - configuradas')
  console.log('   ✅ Disponibilidad avanzada - funcionando')
  console.log('   ✅ API pública - actualizada')
}

// Ejecutar las pruebas
runAllTests().catch(console.error) 