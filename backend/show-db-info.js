const mongoose = require('mongoose')
const User = require('./models/User')
const Service = require('./models/Service')
require('dotenv').config()

async function showDatabaseInfo() {
  try {
    // Mostrar la URI de conexión que estamos usando
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/reservas'
    console.log('🔗 URI de conexión:', mongoUri)
    
    // Conectar a MongoDB
    await mongoose.connect(mongoUri)
    console.log('✅ Conectado exitosamente')

    // Obtener información de la conexión
    const connection = mongoose.connection
    console.log('📊 Información de la base de datos:')
    console.log('   Host:', connection.host)
    console.log('   Puerto:', connection.port)
    console.log('   Nombre de BD:', connection.name)
    console.log('   Estado:', connection.readyState === 1 ? 'Conectado' : 'Desconectado')

    // Listar todas las colecciones
    console.log('\n📋 Colecciones en la base de datos:')
    const collections = await connection.db.listCollections().toArray()
    for (const collection of collections) {
      const count = await connection.db.collection(collection.name).countDocuments()
      console.log(`   - ${collection.name}: ${count} documentos`)
    }

    // Mostrar los datos de usuarios
    console.log('\n👥 USUARIOS:')
    const users = await User.find()
    for (const user of users) {
      console.log(`   ID: ${user._id}`)
      console.log(`   Username: ${user.username}`)
      console.log(`   Email: ${user.email}`)
      console.log(`   Salón: ${user.salonName}`)
      console.log('   ---')
    }

    // Mostrar los datos de servicios  
    console.log('\n🛠️ SERVICIOS:')
    const services = await Service.find().populate('userId', 'username salonName')
    console.log(`Total de servicios: ${services.length}`)
    
    for (const service of services) {
      console.log(`   ID: ${service._id}`)
      console.log(`   Nombre: ${service.name}`)
      console.log(`   Precio: $${service.price}`)
      console.log(`   Usuario: ${service.userId?.username || 'N/A'}`)
      console.log(`   Activo: ${service.isActive}`)
      console.log(`   Colección: services`)
      console.log('   ---')
    }

    // Verificar datos directamente de la colección
    console.log('\n🔍 VERIFICACIÓN DIRECTA DE COLECCIÓN:')
    const servicesCollection = connection.db.collection('services')
    const rawServices = await servicesCollection.find({}).toArray()
    console.log(`Servicios encontrados directamente: ${rawServices.length}`)

    // Mostrar comando para MongoDB Compass
    console.log('\n🧭 PARA CONECTAR CON MONGODB COMPASS:')
    console.log('   URI de conexión:', mongoUri)
    console.log('   Base de datos:', connection.name)
    console.log('   Colección de servicios: services')
    console.log('   Colección de usuarios: users')

    // Mostrar comando para MongoDB CLI
    console.log('\n💻 PARA CONECTAR CON MONGO CLI:')
    if (mongoUri.includes('localhost')) {
      console.log('   mongo')
      console.log(`   use ${connection.name}`)
      console.log('   db.services.find().pretty()')
      console.log('   db.users.find().pretty()')
    } else {
      console.log(`   mongo "${mongoUri}"`)
      console.log('   db.services.find().pretty()')
    }

  } catch (error) {
    console.error('❌ Error:', error)
  } finally {
    await mongoose.disconnect()
    console.log('\n🔌 Desconectado de MongoDB')
  }
}

showDatabaseInfo() 