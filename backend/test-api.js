const axios = require('axios')

const API_BASE = 'http://localhost:5000/api'

async function testAPI() {
  try {
    console.log('🔍 Probando APIs del backend...\n')

    // 1. Test de salud
    console.log('1. Health Check:')
    try {
      const healthResponse = await axios.get(`${API_BASE}/health`)
      console.log('✅ Health OK:', healthResponse.data.message)
    } catch (error) {
      console.log('❌ Health Error:', error.message)
      return
    }

    // 2. Test de login
    console.log('\n2. Login:')
    let token
    try {
      const loginResponse = await axios.post(`${API_BASE}/auth/login`, {
        email: 'ramfiaogusto@gmail.com',
        password: '123456'
      })
      
      if (loginResponse.data.success) {
        token = loginResponse.data.token
        console.log('✅ Login exitoso')
        console.log('🔑 Token obtenido:', token.substring(0, 20) + '...')
      } else {
        console.log('❌ Login falló:', loginResponse.data.message)
        return
      }
    } catch (error) {
      console.log('❌ Login Error:', error.response?.data?.message || error.message)
      return
    }

    // 3. Test de servicios (con token)
    console.log('\n3. Obtener servicios:')
    try {
      const servicesResponse = await axios.get(`${API_BASE}/services`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      })
      
      if (servicesResponse.data.success) {
        console.log(`✅ Servicios obtenidos: ${servicesResponse.data.services.length}`)
        servicesResponse.data.services.forEach((service, index) => {
          console.log(`   ${index + 1}. ${service.name} - $${service.price}`)
        })
      } else {
        console.log('❌ Error obteniendo servicios:', servicesResponse.data.message)
      }
    } catch (error) {
      console.log('❌ Services Error:', error.response?.data?.message || error.message)
    }

    // 4. Test de creación de servicio
    console.log('\n4. Crear servicio de prueba:')
    try {
      const newServiceData = {
        name: `API Test Service ${Date.now()}`,
        description: 'Servicio creado via API test',
        price: 150,
        duration: 45,
        category: 'otro',
        requiresPayment: false
      }

      const createResponse = await axios.post(`${API_BASE}/services`, newServiceData, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      })
      
      if (createResponse.data.success) {
        console.log('✅ Servicio creado exitosamente')
        console.log('📝 Nombre:', createResponse.data.service.name)
        console.log('🆔 ID:', createResponse.data.service._id)
        
        // Limpiar: eliminar el servicio de prueba
        try {
          await axios.delete(`${API_BASE}/services/${createResponse.data.service._id}`, {
            headers: {
              Authorization: `Bearer ${token}`
            }
          })
          console.log('🗑️ Servicio de prueba eliminado')
        } catch (deleteError) {
          console.log('⚠️ No se pudo eliminar el servicio de prueba')
        }
      } else {
        console.log('❌ Error creando servicio:', createResponse.data.message)
      }
    } catch (error) {
      console.log('❌ Create Service Error:', error.response?.data?.message || error.message)
    }

    // 5. Test de API pública
    console.log('\n5. API pública:')
    try {
      const publicResponse = await axios.get(`${API_BASE}/public/salon/ramfi_aog`)
      
      if (publicResponse.data.success) {
        console.log('✅ API pública funciona')
        console.log('🏪 Salón:', publicResponse.data.salon.salonName)
        console.log('📋 Servicios públicos:', publicResponse.data.services.length)
      } else {
        console.log('❌ Error en API pública:', publicResponse.data.message)
      }
    } catch (error) {
      console.log('❌ Public API Error:', error.response?.data?.message || error.message)
    }

    console.log('\n🎉 Test de APIs completado!')

  } catch (error) {
    console.error('❌ Error general:', error.message)
  }
}

// Ejecutar las pruebas
testAPI() 