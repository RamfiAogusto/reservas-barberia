const mongoose = require('mongoose')
const User = require('./models/User')
const bcrypt = require('bcryptjs')
require('dotenv').config()

async function checkUser() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/reservas')
    console.log('✅ Conectado a MongoDB')

    const user = await User.findOne({ username: 'ramfi_aog' })
    if (!user) {
      console.log('❌ Usuario no encontrado')
      return
    }

    console.log('👤 Usuario encontrado:')
    console.log('   Username:', user.username)
    console.log('   Email:', user.email)
    console.log('   Salón:', user.salonName)
    console.log('   Teléfono:', user.phone)
    console.log('   Dirección:', user.address)
    console.log('   Creado:', user.createdAt)

    // Verificar password
    const testPassword = '123456'
    const isValidPassword = await bcrypt.compare(testPassword, user.password)
    console.log(`\n🔐 Password "${testPassword}":`, isValidPassword ? '✅ CORRECTO' : '❌ INCORRECTO')

    if (!isValidPassword) {
      console.log('\n🔧 Actualizando password a "123456"...')
      const hashedPassword = await bcrypt.hash('123456', 10)
      user.password = hashedPassword
      await user.save()
      console.log('✅ Password actualizado')
    }

  } catch (error) {
    console.error('❌ Error:', error)
  } finally {
    await mongoose.disconnect()
    console.log('🔌 Desconectado de MongoDB')
  }
}

checkUser() 