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

/**
 * Verifica la conectividad con la base de datos con una consulta mínima.
 * El esquema (tablas, enums, índices) se gestiona exclusivamente con
 * `prisma migrate deploy` — este archivo NO crea ni repara tablas.
 * @returns {Promise<boolean>} true si la conexión responde correctamente.
 */
async function checkConnection() {
  try {
    await prisma.$queryRaw`SELECT 1`
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
