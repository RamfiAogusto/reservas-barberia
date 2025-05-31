const axios = require('axios')

const API_BASE_URL = 'http://localhost:5000/api'
const USERNAME = 'ramfi_aog'

async function testSpecificDays() {
  console.log('🔍 Probando días específicos problemáticos...\n')

  try {
    // Probar específicamente del 1 al 3 de junio
    const startDate = '2025-06-01'
    const endDate = '2025-06-03'

    console.log(`📅 Consultando API days-status: ${startDate} a ${endDate}`)

    const response = await axios.get(
      `${API_BASE_URL}/public/salon/${USERNAME}/days-status?startDate=${startDate}&endDate=${endDate}`
    )

    if (response.data.success) {
      console.log('\n✅ Respuesta exitosa:')
      
      response.data.data.days.forEach(day => {
        // Parsing como lo hace el backend
        const date = new Date(day.date + 'T12:00:00.000Z')
        const dayOfWeek = date.getDay()
        const dayName = date.toLocaleDateString('es-ES', { weekday: 'long' })
        
        console.log(`📊 ${day.date} = ${dayName} (día ${dayOfWeek}):`)
        console.log(`   Disponible: ${day.available}`)
        console.log(`   Tipo: ${day.type}`)
        console.log(`   Razón: ${day.reason || 'N/A'}`)
        
        if (day.businessHours) {
          console.log(`   Horario: ${day.businessHours.start} - ${day.businessHours.end}`)
        }
        console.log('')
      })

      // Verificar lógica específica
      const domingo = response.data.data.days.find(d => d.date === '2025-06-01')
      const lunes = response.data.data.days.find(d => d.date === '2025-06-02')

      console.log('🧐 Análisis específico:')
      console.log(`Domingo 2025-06-01: ${domingo ? (domingo.available ? 'DISPONIBLE' : 'NO DISPONIBLE') : 'NO ENCONTRADO'}`)
      console.log(`Lunes 2025-06-02: ${lunes ? (lunes.available ? 'DISPONIBLE' : 'NO DISPONIBLE') : 'NO ENCONTRADO'}`)

    } else {
      console.log('❌ Error en respuesta:', response.data.message)
    }

  } catch (error) {
    console.error('❌ Error:', error.response?.data?.message || error.message)
  }
}

testSpecificDays() 