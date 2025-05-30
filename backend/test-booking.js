const axios = require('axios')

const API_BASE = 'http://localhost:5000/api'

async function testBookingAPI() {
  try {
    console.log('🎯 Probando APIs de Reservas Públicas...\n')

    const username = 'ramfi_aog'

    // 1. Test de perfil público
    console.log('1. Perfil público del salón:')
    try {
      const profileResponse = await axios.get(`${API_BASE}/public/salon/${username}`)
      
      if (profileResponse.data.success) {
        const salon = profileResponse.data.data
        console.log('✅ Perfil obtenido exitosamente')
        console.log(`🏪 Salón: ${salon.salonName}`)
        console.log(`📍 Dirección: ${salon.address}`)
        console.log(`📞 Teléfono: ${salon.phone}`)
        console.log(`📋 Servicios disponibles: ${salon.services.length}`)
        
        // Mostrar algunos servicios
        salon.services.slice(0, 3).forEach((service, index) => {
          console.log(`   ${index + 1}. ${service.name} - $${service.price} (${service.duration}min)`)
        })
      } else {
        console.log('❌ Error:', profileResponse.data.message)
        return
      }
    } catch (error) {
      console.log('❌ Error en perfil público:', error.response?.data?.message || error.message)
      return
    }

    // 2. Test de disponibilidad
    console.log('\n2. Verificar disponibilidad:')
    try {
      // Obtener el primer servicio
      const profileResponse = await axios.get(`${API_BASE}/public/salon/${username}`)
      const firstService = profileResponse.data.data.services[0]
      
      if (!firstService) {
        console.log('❌ No hay servicios disponibles para probar')
        return
      }

      // Buscar disponibilidad para mañana
      const tomorrow = new Date()
      tomorrow.setDate(tomorrow.getDate() + 1)
      const dateString = tomorrow.toISOString().split('T')[0]

      const availabilityResponse = await axios.get(
        `${API_BASE}/public/salon/${username}/availability?date=${dateString}&serviceId=${firstService._id}`
      )
      
      if (availabilityResponse.data.success) {
        const { data } = availabilityResponse.data
        console.log('✅ Disponibilidad obtenida')
        console.log(`📅 Fecha: ${data.date}`)
        console.log(`🛠️ Servicio: ${data.service.name}`)
        console.log(`⏰ Slots disponibles: ${data.availableSlots.length}`)
        console.log(`   Primeros slots:`, data.availableSlots.slice(0, 5).join(', '))
      } else {
        console.log('❌ Error obteniendo disponibilidad:', availabilityResponse.data.message)
      }
    } catch (error) {
      console.log('❌ Error en disponibilidad:', error.response?.data?.message || error.message)
    }

    // 3. Test de creación de reserva
    console.log('\n3. Crear reserva de prueba:')
    try {
      // Obtener datos necesarios
      const profileResponse = await axios.get(`${API_BASE}/public/salon/${username}`)
      const firstService = profileResponse.data.data.services[0]
      
      const tomorrow = new Date()
      tomorrow.setDate(tomorrow.getDate() + 1)
      const dateString = tomorrow.toISOString().split('T')[0]

      const availabilityResponse = await axios.get(
        `${API_BASE}/public/salon/${username}/availability?date=${dateString}&serviceId=${firstService._id}`
      )
      
      const availableSlots = availabilityResponse.data.data.availableSlots
      if (availableSlots.length === 0) {
        console.log('⚠️ No hay slots disponibles para probar reserva')
        return
      }

      // Crear reserva de prueba
      const bookingData = {
        serviceId: firstService._id,
        clientName: 'Juan Pérez (Prueba)',
        clientEmail: 'juan.test@example.com',
        clientPhone: '55 1234 5678',
        date: dateString,
        time: availableSlots[0], // Primer slot disponible
        notes: 'Reserva de prueba desde API'
      }

      const bookingResponse = await axios.post(
        `${API_BASE}/public/salon/${username}/book`,
        bookingData
      )

      if (bookingResponse.data.success) {
        const reservation = bookingResponse.data.data
        console.log('✅ Reserva creada exitosamente')
        console.log(`🆔 ID de reserva: ${reservation.appointmentId}`)
        console.log(`👤 Cliente: ${reservation.clientName}`)
        console.log(`🛠️ Servicio: ${reservation.service}`)
        console.log(`📅 Fecha: ${reservation.date}`)
        console.log(`⏰ Hora: ${reservation.time}`)
        console.log(`💰 Monto total: $${reservation.totalAmount}`)
        console.log(`📊 Estado: ${reservation.status}`)
        
        if (reservation.requiresPayment) {
          console.log(`💳 Requiere pago de depósito: $${reservation.depositAmount}`)
        }

        // Verificar que la reserva aparezca en la disponibilidad
        console.log('\n4. Verificar que el slot ya no esté disponible:')
        const newAvailabilityResponse = await axios.get(
          `${API_BASE}/public/salon/${username}/availability?date=${dateString}&serviceId=${firstService._id}`
        )
        
        const newAvailableSlots = newAvailabilityResponse.data.data.availableSlots
        const slotTaken = !newAvailableSlots.includes(availableSlots[0])
        
        if (slotTaken) {
          console.log('✅ El slot reservado ya no aparece como disponible')
        } else {
          console.log('⚠️ El slot aún aparece como disponible (posible error)')
        }

      } else {
        console.log('❌ Error creando reserva:', bookingResponse.data.message)
      }

    } catch (error) {
      console.log('❌ Error en creación de reserva:', error.response?.data?.message || error.message)
      if (error.response?.data?.errors) {
        console.log('   Errores de validación:', error.response.data.errors)
      }
    }

    console.log('\n🎉 Test de reservas completado!')

  } catch (error) {
    console.error('❌ Error general:', error.message)
  }
}

// Ejecutar las pruebas
testBookingAPI() 