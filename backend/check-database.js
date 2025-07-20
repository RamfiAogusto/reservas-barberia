#!/usr/bin/env node

/**
 * Script temporal para consultar la base de datos PostgreSQL
 * Muestra información de usuarios, servicios, citas, etc.
 */

require('dotenv').config()
const { prisma } = require('./lib/prisma')

async function checkDatabase() {
  try {
    console.log('🔍 Conectando a PostgreSQL...')
    await prisma.$connect()
    console.log('✅ Conectado exitosamente\n')

    // 1. Verificar usuarios
    console.log('👥 USUARIOS:')
    const users = await prisma.user.findMany({
      select: {
        id: true,
        username: true,
        email: true,
        salonName: true,
        phone: true,
        isActive: true,
        createdAt: true
      }
    })
    
    if (users.length === 0) {
      console.log('   ❌ No hay usuarios registrados')
    } else {
      users.forEach(user => {
        console.log(`   ✅ ${user.username} - ${user.salonName} (${user.email})`)
        console.log(`      ID: ${user.id} | Activo: ${user.isActive} | Creado: ${user.createdAt}`)
      })
    }

    // 2. Verificar servicios
    console.log('\n🛠️ SERVICIOS:')
    const services = await prisma.service.findMany({
      select: {
        id: true,
        name: true,
        price: true,
        duration: true,
        category: true,
        isActive: true,
        userId: true
      }
    })
    
    if (services.length === 0) {
      console.log('   ❌ No hay servicios registrados')
    } else {
      services.forEach(service => {
        console.log(`   ✅ ${service.name} - $${service.price} (${service.duration}min)`)
        console.log(`      Categoría: ${service.category} | Activo: ${service.isActive} | UserID: ${service.userId}`)
      })
    }

    // 3. Verificar citas
    console.log('\n📅 CITAS:')
    const appointments = await prisma.appointment.findMany({
      select: {
        id: true,
        clientName: true,
        clientEmail: true,
        date: true,
        time: true,
        status: true,
        totalAmount: true,
        userId: true,
        createdAt: true
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 10 // Solo las últimas 10
    })
    
    if (appointments.length === 0) {
      console.log('   ❌ No hay citas registradas')
    } else {
      appointments.forEach(appointment => {
        console.log(`   ✅ ${appointment.clientName} - ${appointment.date} ${appointment.time}`)
        console.log(`      Estado: ${appointment.status} | $${appointment.totalAmount} | UserID: ${appointment.userId}`)
      })
    }

    // 4. Verificar horarios de negocio
    console.log('\n🕐 HORARIOS DE NEGOCIO:')
    const businessHours = await prisma.businessHour.findMany({
      select: {
        id: true,
        dayOfWeek: true,
        startTime: true,
        endTime: true,
        isActive: true,
        userId: true
      }
    })
    
    if (businessHours.length === 0) {
      console.log('   ❌ No hay horarios configurados')
    } else {
      const dayNames = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']
      businessHours.forEach(hour => {
        console.log(`   ✅ ${dayNames[hour.dayOfWeek]} (${hour.dayOfWeek}): ${hour.startTime}-${hour.endTime}`)
        console.log(`      Activo: ${hour.isActive} | UserID: ${hour.userId}`)
      })
    }

    // 5. Estadísticas generales
    console.log('\n📊 ESTADÍSTICAS:')
    const userCount = await prisma.user.count()
    const serviceCount = await prisma.service.count()
    const appointmentCount = await prisma.appointment.count()
    const activeUserCount = await prisma.user.count({ where: { isActive: true } })
    const activeServiceCount = await prisma.service.count({ where: { isActive: true } })
    
    console.log(`   👥 Usuarios totales: ${userCount} (${activeUserCount} activos)`)
    console.log(`   🛠️ Servicios totales: ${serviceCount} (${activeServiceCount} activos)`)
    console.log(`   📅 Citas totales: ${appointmentCount}`)

    await prisma.$disconnect()
    console.log('\n🔌 Desconectado de PostgreSQL')

  } catch (error) {
    console.error('❌ Error consultando base de datos:', error)
    process.exit(1)
  }
}

// Ejecutar si se llama directamente
if (require.main === module) {
  checkDatabase()
}

module.exports = { checkDatabase } 