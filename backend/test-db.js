const mongoose = require('mongoose')
const User = require('./models/User')
const Service = require('./models/Service')
require('dotenv').config()

async function testDatabase() {
  try {
    // Conectar a MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/reservas')
    console.log('✅ Conectado a MongoDB')

    // Verificar usuario
    const user = await User.findOne({ username: 'ramfi_aog' })
    if (!user) {
      console.log('❌ Usuario ramfi_aog no encontrado')
      return
    }

    console.log('👤 Usuario encontrado:', user.username)
    console.log('📧 Email:', user.email)
    console.log('🏪 Salón:', user.salonName)

    // Verificar servicios
    const services = await Service.find({ userId: user._id, isActive: true })
    console.log('\n📋 Servicios en la base de datos:', services.length)
    
    services.forEach((service, index) => {
      console.log(`${index + 1}. ${service.name} - $${service.price} - ${service.duration}min`)
      console.log(`   Categoría: ${service.category}`)
      console.log(`   Requiere pago: ${service.requiresPayment}`)
      if (service.requiresPayment) {
        console.log(`   Depósito: $${service.depositAmount}`)
      }
      console.log(`   Creado: ${service.createdAt}`)
      console.log(`   Actualizado: ${service.updatedAt}`)
      console.log('   ---')
    })

    // Crear un servicio de prueba para verificar que se guarde
    console.log('\n🧪 Creando servicio de prueba...')
    const testService = new Service({
      userId: user._id,
      name: `Servicio Test ${Date.now()}`,
      description: 'Servicio de prueba para verificar BD',
      price: 100,
      duration: 30,
      category: 'otro',
      requiresPayment: false
    })

    await testService.save()
    console.log('✅ Servicio de prueba creado con ID:', testService._id)

    // Verificar que se guardó
    const savedService = await Service.findById(testService._id)
    if (savedService) {
      console.log('✅ Servicio verificado en BD:', savedService.name)
    } else {
      console.log('❌ Error: Servicio no encontrado después de guardar')
    }

    // Eliminar el servicio de prueba
    await Service.findByIdAndDelete(testService._id)
    console.log('🗑️ Servicio de prueba eliminado')

    console.log('\n🎉 Base de datos funcionando correctamente!')

  } catch (error) {
    console.error('❌ Error:', error)
  } finally {
    await mongoose.disconnect()
    console.log('🔌 Desconectado de MongoDB')
  }
}

// Ejecutar el script
testDatabase() 