const axios = require('axios')

const API_BASE = 'http://localhost:5000/api'
const credentials = {
  email: 'ramfiaogusto@gmail.com',
  password: '123456'
}

async function testSpecificAvailability() {
  try {
    console.log('🔍 Probando disponibilidad específica...\n')

    // Login
    console.log('1. Haciendo login...')
    const loginResponse = await axios.post(`${API_BASE}/auth/login`, credentials)
    const authToken = loginResponse.data.token
    console.log('✅ Login exitoso')

    // Obtener servicios
    console.log('\n2. Obteniendo servicios...')
    const servicesResponse = await axios.get(`${API_BASE}/services`, {
      headers: { 'Authorization': `Bearer ${authToken}` }
    })

    console.log('Respuesta servicios:', {
      success: servicesResponse.data.success,
      dataExists: !!servicesResponse.data.data,
      dataType: typeof servicesResponse.data.data,
      dataLength: servicesResponse.data.data ? servicesResponse.data.data.length : 'N/A'
    })

    if (!servicesResponse.data.success) {
      console.log('❌ Error en servicios:', servicesResponse.data.message)
      return
    }

    if (!servicesResponse.data.data) {
      console.log('❌ No hay campo data en la respuesta')
      return
    }

    if (servicesResponse.data.data.length === 0) {
      console.log('❌ Array de servicios está vacío')
      return
    }

    const service = servicesResponse.data.data[0]
    console.log(`✅ Servicio obtenido: ${service.name} (ID: ${service._id})`)

    // Probar fechas específicas con logs detallados
    const testDates = [
      { date: '2025-06-02', expectedDay: 1, expectedResult: 'ACTIVO (Lunes)' },
      { date: '2025-06-04', expectedDay: 3, expectedResult: 'INACTIVO (Miércoles)' },
      { date: '2025-06-01', expectedDay: 0, expectedResult: 'INACTIVO (Domingo)' }
    ]

    for (const test of testDates) {
      console.log(`\n📅 Probando fecha: ${test.date}`)
      console.log(`   Esperado: ${test.expectedResult}`)
      
      // Verificar día de la semana usando UTC para evitar problemas de zona horaria
      const dateObj = new Date(test.date + 'T12:00:00.000Z')
      const actualDay = dateObj.getUTCDay()
      console.log(`   Día real: ${actualDay} ${actualDay === test.expectedDay ? '✓' : '❌'}`)

      // Probar API privada
      console.log('   Probando API privada...')
      try {
        const privateResponse = await axios.get(`${API_BASE}/schedules/availability/advanced`, {
          params: { date: test.date, serviceId: service._id },
          headers: { 'Authorization': `Bearer ${authToken}` }
        })

        if (privateResponse.data.success) {
          const data = privateResponse.data.data
          console.log(`   API Privada: ${data.isBusinessDay ? 'LABORABLE' : 'NO LABORABLE'}`)
          if (data.reason) console.log(`     Razón: ${data.reason}`)
        } else {
          console.log(`   API Privada ERROR: ${privateResponse.data.message}`)
        }
      } catch (error) {
        console.log(`   API Privada ERROR: ${error.response?.data?.message || error.message}`)
      }

      // Probar API pública
      console.log('   Probando API pública...')
      try {
        const publicResponse = await axios.get(`${API_BASE}/public/salon/ramfi_aog/availability`, {
          params: { date: test.date, serviceId: service._id }
        })

        if (publicResponse.data.success) {
          const data = publicResponse.data.data
          console.log(`   API Pública: ${data.isBusinessDay ? 'LABORABLE' : 'NO LABORABLE'}`)
          if (data.reason) console.log(`     Razón: ${data.reason}`)
        } else {
          console.log(`   API Pública ERROR: ${publicResponse.data.message}`)
        }
      } catch (error) {
        console.log(`   API Pública ERROR: ${error.response?.data?.message || error.message}`)
      }
    }

  } catch (error) {
    console.error('Error general:', error.response?.data?.message || error.message)
    console.error('Stack:', error.stack)
  }
}

testSpecificAvailability() 