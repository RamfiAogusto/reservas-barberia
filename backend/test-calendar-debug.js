const axios = require('axios')

const API_BASE_URL = 'http://localhost:5000/api'
const USERNAME = 'ramfi_aog'

async function debugCalendar() {
  console.log('🔍 Debuggeando calendario de reservas...\n')

  try {
    // 1. Obtener perfil para conseguir un servicio
    console.log('📋 1. Obteniendo perfil...')
    const profileResponse = await axios.get(`${API_BASE_URL}/public/salon/${USERNAME}`)
    const firstService = profileResponse.data.data.services[0]
    
    if (!firstService) {
      console.log('❌ No hay servicios disponibles')
      return
    }
    
    console.log(`✅ Servicio encontrado: ${firstService.name}`)

    // 2. Obtener estado de días para los próximos 14 días
    console.log('\n📅 2. Obteniendo estado de días...')
    const today = new Date()
    const futureDate = new Date()
    futureDate.setDate(today.getDate() + 14)

    const startDate = today.toISOString().split('T')[0]
    const endDate = futureDate.toISOString().split('T')[0]

    console.log(`   Rango: ${startDate} a ${endDate}`)

    const daysResponse = await axios.get(
      `${API_BASE_URL}/public/salon/${USERNAME}/days-status?startDate=${startDate}&endDate=${endDate}`
    )

    if (daysResponse.data.success) {
      const days = daysResponse.data.data.days
      console.log(`✅ ${days.length} días obtenidos:\n`)

      days.forEach(day => {
        const date = new Date(day.date + 'T12:00:00.000Z')
        const dayName = date.toLocaleDateString('es-ES', { weekday: 'long' })
        const dayOfWeek = date.getDay()
        
        const status = day.available ? '✅ Disponible' : `❌ ${day.type}`
        const reason = day.reason ? ` - ${day.reason}` : ''
        
        console.log(`   ${day.date} (${dayName} - día ${dayOfWeek}): ${status}${reason}`)
        
        if (day.businessHours) {
          console.log(`      Horario: ${day.businessHours.start} - ${day.businessHours.end}`)
        }
      })

      // 3. Probar disponibilidad específica para algunos días
      console.log('\n⏰ 3. Probando disponibilidad específica...')
      
      // Buscar un lunes en los resultados
      const monday = days.find(day => {
        const date = new Date(day.date + 'T12:00:00.000Z')
        return date.getDay() === 1 // Lunes
      })

      if (monday) {
        console.log(`\n🔍 Probando lunes ${monday.date}:`)
        console.log(`   Estado en days-status: ${monday.available ? 'Disponible' : 'No disponible'} (${monday.type})`)
        
        if (monday.available) {
          // Probar obtener slots para este lunes
          try {
            const availabilityResponse = await axios.get(
              `${API_BASE_URL}/public/salon/${USERNAME}/availability/advanced?date=${monday.date}&serviceId=${firstService._id}`
            )
            
            if (availabilityResponse.data.success) {
              const data = availabilityResponse.data.data
              console.log(`   Disponibilidad avanzada: ${data.isBusinessDay ? 'Día laborable' : 'No laborable'}`)
              console.log(`   Slots disponibles: ${data.availableSlots.length}`)
              if (data.availableSlots.length > 0) {
                console.log(`   Primeros slots: ${data.availableSlots.slice(0, 5).join(', ')}`)
              }
            }
          } catch (error) {
            console.log(`   ❌ Error obteniendo disponibilidad: ${error.response?.data?.message || error.message}`)
          }
        }
      } else {
        console.log('   No se encontró ningún lunes en el rango')
      }

      // Buscar un domingo
      const sunday = days.find(day => {
        const date = new Date(day.date + 'T12:00:00.000Z')
        return date.getDay() === 0 // Domingo
      })

      if (sunday) {
        console.log(`\n🔍 Probando domingo ${sunday.date}:`)
        console.log(`   Estado en days-status: ${sunday.available ? 'Disponible' : 'No disponible'} (${sunday.type})`)
        
        if (sunday.available) {
          try {
            const availabilityResponse = await axios.get(
              `${API_BASE_URL}/public/salon/${USERNAME}/availability/advanced?date=${sunday.date}&serviceId=${firstService._id}`
            )
            
            if (availabilityResponse.data.success) {
              const data = availabilityResponse.data.data
              console.log(`   Disponibilidad avanzada: ${data.isBusinessDay ? 'Día laborable' : 'No laborable'}`)
              console.log(`   Slots disponibles: ${data.availableSlots.length}`)
              if (data.availableSlots.length > 0) {
                console.log(`   Primeros slots: ${data.availableSlots.slice(0, 5).join(', ')}`)
              }
            }
          } catch (error) {
            console.log(`   ❌ Error obteniendo disponibilidad: ${error.response?.data?.message || error.message}`)
          }
        }
      }

    } else {
      console.log('❌ Error obteniendo días:', daysResponse.data.message)
    }

  } catch (error) {
    console.error('❌ Error general:', error.response?.data?.message || error.message)
  }
}

debugCalendar() 