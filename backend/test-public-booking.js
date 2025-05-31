// Test para APIs públicas de booking (usando fetch nativo de Node.js 18+)

const API_BASE_URL = 'http://localhost:5000/api'
const USERNAME = 'ramfi_aog'

async function testPublicBookingAPIs() {
  console.log('🎯 Probando APIs públicas de booking...\n')

  try {
    // 1. Probar API de perfil público
    console.log('📋 1. Probando perfil público...')
    const profileResponse = await fetch(`${API_BASE_URL}/public/salon/${USERNAME}`)
    const profileData = await profileResponse.json()
    
    if (profileData.success) {
      console.log(`✅ Perfil obtenido: ${profileData.data.salonName}`)
      console.log(`   Servicios disponibles: ${profileData.data.services.length}`)
    } else {
      console.log('❌ Error obteniendo perfil:', profileData.message)
      return
    }

    const firstService = profileData.data.services[0]
    if (!firstService) {
      console.log('❌ No hay servicios disponibles')
      return
    }

    // 2. Probar API de estado de días
    console.log('\n📅 2. Probando estado de días...')
    const today = new Date().toISOString().split('T')[0]
    const futureDate = new Date()
    futureDate.setDate(futureDate.getDate() + 7)
    const endDate = futureDate.toISOString().split('T')[0]

    const daysResponse = await fetch(`${API_BASE_URL}/public/salon/${USERNAME}/days-status?startDate=${today}&endDate=${endDate}`)
    const daysData = await daysResponse.json()
    
    if (daysData.success) {
      console.log(`✅ Estado de días obtenido para ${daysData.data.days.length} días:`)
      daysData.data.days.forEach(day => {
        const status = day.available ? '✅ Disponible' : `❌ ${day.type} - ${day.reason}`
        console.log(`   ${day.date}: ${status}`)
      })
    } else {
      console.log('❌ Error obteniendo estado de días:', daysData.message)
    }

    // 3. Probar API de disponibilidad avanzada
    console.log('\n⏰ 3. Probando disponibilidad avanzada...')
    
    // Buscar un día disponible
    const availableDay = daysData.data.days.find(day => day.available)
    if (!availableDay) {
      console.log('❌ No hay días disponibles en el rango')
      return
    }

    const availabilityResponse = await fetch(`${API_BASE_URL}/public/salon/${USERNAME}/availability/advanced?date=${availableDay.date}&serviceId=${firstService._id}`)
    const availabilityData = await availabilityResponse.json()
    
    if (availabilityData.success) {
      if (availabilityData.data.isBusinessDay) {
        console.log(`✅ Disponibilidad para ${availableDay.date}:`)
        console.log(`   Horario: ${availabilityData.data.businessHours.start} - ${availabilityData.data.businessHours.end}`)
        console.log(`   Especial: ${availabilityData.data.businessHours.isSpecial}`)
        console.log(`   Descansos: ${availabilityData.data.breaks.length}`)
        console.log(`   Slots disponibles: ${availabilityData.data.availableSlots.length}`)
        console.log(`   Primeros slots: ${availabilityData.data.availableSlots.slice(0, 5).join(', ')}...`)
      } else {
        console.log(`❌ ${availableDay.date} no es día laborable: ${availabilityData.data.reason}`)
      }
    } else {
      console.log('❌ Error obteniendo disponibilidad:', availabilityData.message)
    }

    // 4. Probar un día cerrado
    console.log('\n🚫 4. Probando día cerrado...')
    const closedDay = daysData.data.days.find(day => !day.available)
    if (closedDay) {
      const closedDayResponse = await fetch(`${API_BASE_URL}/public/salon/${USERNAME}/availability/advanced?date=${closedDay.date}&serviceId=${firstService._id}`)
      const closedDayData = await closedDayResponse.json()
      
      if (closedDayData.success) {
        console.log(`✅ Día cerrado ${closedDay.date}:`)
        console.log(`   Es día laborable: ${closedDayData.data.isBusinessDay}`)
        console.log(`   Razón: ${closedDayData.data.reason}`)
        console.log(`   Slots: ${closedDayData.data.availableSlots.length}`)
      } else {
        console.log('❌ Error verificando día cerrado:', closedDayData.message)
      }
    } else {
      console.log('ℹ️ No hay días cerrados en el rango de prueba')
    }

    console.log('\n🎉 Todas las pruebas de APIs públicas completadas!')

  } catch (error) {
    console.error('❌ Error en las pruebas:', error.message)
  }
}

testPublicBookingAPIs() 