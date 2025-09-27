const { PrismaClient } = require('@prisma/client')

// Configuración global del cliente Prisma
const globalForPrisma = globalThis

const prisma = globalForPrisma.prisma || new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'info', 'warn', 'error'] : ['error'],
  datasources: {
    db: {
      url: process.env.DATABASE_URL
    }
  }
})

// En desarrollo, evitar múltiples instancias
if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
}

// Función para ejecutar migraciones en producción
async function runMigrations() {
  if (process.env.NODE_ENV !== 'production') {
    console.log('⚠️ Migraciones solo se ejecutan en producción')
    return true
  }

  try {
    console.log('🚀 Ejecutando migraciones de base de datos...')
    const { execSync } = require('child_process')
    
    // Ejecutar prisma migrate deploy
    execSync('npx prisma migrate deploy', { 
      stdio: 'inherit',
      env: { ...process.env }
    })
    
    console.log('✅ Migraciones ejecutadas correctamente')
    return true
  } catch (error) {
    console.error('❌ Error ejecutando migraciones:', error.message)
    return false
  }
}

// Función para verificar si las tablas existen
async function checkTablesExist() {
  try {
    // Intentar contar usuarios para verificar que la tabla existe
    await prisma.user.count()
    return true
  } catch (error) {
    if (error.code === 'P2021') { // Table doesn't exist
      return false
    }
    throw error
  }
}

// Función para verificar conexión
async function checkConnection() {
  try {
    await prisma.$connect()
    console.log('✅ Conectado a PostgreSQL')
    
    // En producción, verificar si las tablas existen
    if (process.env.NODE_ENV === 'production') {
      const tablesExist = await checkTablesExist()
      if (!tablesExist) {
        console.log('⚠️ Las tablas no existen, ejecutando migraciones...')
        const migrationsSuccess = await runMigrations()
        if (!migrationsSuccess) {
          throw new Error('No se pudieron ejecutar las migraciones')
        }
      }
    }
    
    return true
  } catch (error) {
    console.error('❌ Error conectando a PostgreSQL:', error.message)
    return false
  }
}

// Cerrar conexión correctamente
async function disconnect() {
  await prisma.$disconnect()
  console.log('🔌 Desconectado de PostgreSQL')
}

// Manejo de cierre de la aplicación
process.on('SIGINT', async () => {
  console.log('\n🛑 Cerrando aplicación...')
  await disconnect()
  process.exit(0)
})

process.on('SIGTERM', async () => {
  console.log('\n🛑 Señal de terminación recibida...')
  await disconnect()
  process.exit(0)
})

module.exports = {
  prisma,
  checkConnection,
  disconnect,
  runMigrations,
  checkTablesExist
} 