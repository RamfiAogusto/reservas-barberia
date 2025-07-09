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

// Función para verificar conexión
async function checkConnection() {
  try {
    await prisma.$connect()
    console.log('✅ Conectado a PostgreSQL')
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
  disconnect
} 