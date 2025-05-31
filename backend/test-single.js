const axios = require('axios')

async function testSingle() {
  try {
    // Login
    const loginResponse = await axios.post('http://localhost:5000/api/auth/login', {
      email: 'ramfiaogusto@gmail.com',
      password: '123456'
    })
    
    const token = loginResponse.data.token
    console.log('✅ Login exitoso')

    // Probar domingo (debería ser NO LABORABLE)
    console.log('\n🔍 Probando Domingo 2025-06-01...')
    const response = await axios.get('http://localhost:5000/api/schedules/availability/advanced', {
      params: { 
        date: '2025-06-01', 
        serviceId: '68392793a7cf49d0307c0d21' 
      },
      headers: { 'Authorization': `Bearer ${token}` }
    })

    console.log('Respuesta:', response.data)

  } catch (error) {
    console.error('Error:', error.response?.data || error.message)
  }
}

testSingle() 