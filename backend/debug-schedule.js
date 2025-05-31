const mongoose = require('mongoose')
const BusinessHours = require('./models/BusinessHours')

async function debugSchedule() {
  try {
    // Conectar a MongoDB
    await mongoose.connect('mongodb://localhost:27017/DB_reservas')
    console.log('Conectado a MongoDB')

    // Buscar usuario ramfi_aog
    const User = require('./models/User')
    const user = await User.findOne({ username: 'ramfi_aog' })
    
    if (!user) {
      console.log('Usuario no encontrado')
      return
    }

    console.log('\n🔍 Debugeando horarios para usuario:', user.username)
    console.log('User ID:', user._id)

    // Obtener todos los horarios
    const allHours = await BusinessHours.find({ userId: user._id })
    console.log('\n📅 Horarios en base de datos:')
    console.log(`   Total registros: ${allHours.length}`)
    
    allHours.forEach(hour => {
      const dayNames = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']
      console.log(`   ${dayNames[hour.dayOfWeek]} (${hour.dayOfWeek}): ${hour.isActive ? `${hour.startTime}-${hour.endTime}` : 'INACTIVO'}`)
    })

    // Verificar qué días faltan
    console.log('\n🔍 Verificando días faltantes:')
    for (let day = 0; day <= 6; day++) {
      const exists = allHours.find(h => h.dayOfWeek === day)
      const dayNames = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']
      if (!exists) {
        console.log(`   ❌ Falta: ${dayNames[day]} (${day})`)
      } else {
        console.log(`   ✅ Existe: ${dayNames[day]} (${day})`)
      }
    }

    // Probar búsquedas específicas
    console.log('\n🔍 Probando búsquedas específicas:')
    
    // Lunes (día 1)
    const monday = await BusinessHours.getByUserAndDay(user._id, 1)
    console.log(`   Lunes (1): ${monday ? (monday.isActive ? `${monday.startTime}-${monday.endTime}` : 'INACTIVO') : 'NO ENCONTRADO'}`)
    
    // Miércoles (día 3)
    const wednesday = await BusinessHours.getByUserAndDay(user._id, 3)
    console.log(`   Miércoles (3): ${wednesday ? (wednesday.isActive ? `${wednesday.startTime}-${wednesday.endTime}` : 'INACTIVO') : 'NO ENCONTRADO'}`)

    // Probar fechas específicas (las incorrectas)
    console.log('\n📅 Fechas de prueba incorrectas:')
    
    const wrongDates = [
      { date: '2025-06-02', name: 'Lunes' },    
      { date: '2025-06-04', name: 'Miércoles' }, 
      { date: '2025-06-01', name: 'Domingo' }    
    ]

    wrongDates.forEach(test => {
      const dateObj = new Date(test.date)
      const dayOfWeek = dateObj.getDay()
      const dayNames = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']
      console.log(`   ${test.date} (supuesto ${test.name}) = realmente ${dayNames[dayOfWeek]} (${dayOfWeek}) ❌`)
    })

    // Encontrar fechas correctas para junio 2025
    console.log('\n📅 Fechas correctas para junio 2025:')
    
    // Buscar fechas que realmente sean los días que queremos
    for (let day = 1; day <= 30; day++) {
      const date = new Date(2025, 5, day) // Junio = mes 5 (base 0)
      const dayOfWeek = date.getDay()
      const dayNames = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']
      
      if (dayOfWeek === 0) { // Domingo
        console.log(`   ${date.toISOString().split('T')[0]} = ${dayNames[dayOfWeek]} (${dayOfWeek}) ✓`)
        break
      }
    }

    for (let day = 1; day <= 30; day++) {
      const date = new Date(2025, 5, day) // Junio = mes 5 (base 0)
      const dayOfWeek = date.getDay()
      const dayNames = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']
      
      if (dayOfWeek === 1) { // Lunes
        console.log(`   ${date.toISOString().split('T')[0]} = ${dayNames[dayOfWeek]} (${dayOfWeek}) ✓`)
        break
      }
    }

    for (let day = 1; day <= 30; day++) {
      const date = new Date(2025, 5, day) // Junio = mes 5 (base 0)
      const dayOfWeek = date.getDay()
      const dayNames = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']
      
      if (dayOfWeek === 3) { // Miércoles
        console.log(`   ${date.toISOString().split('T')[0]} = ${dayNames[dayOfWeek]} (${dayOfWeek}) ✓`)
        break
      }
    }

  } catch (error) {
    console.error('Error:', error)
  } finally {
    await mongoose.disconnect()
    console.log('\nDesconectado de MongoDB')
  }
}

debugSchedule() 