const { PrismaClient } = require('@prisma/client');
const { createTablesIfNotExist } = require('./lib/prisma');

const prisma = new PrismaClient();

const forceMigrate = async () => {
  try {
    console.log('🚀 Iniciando migración forzada de base de datos...');
    console.log('🌍 NODE_ENV:', process.env.NODE_ENV);
    console.log('🗄️ DATABASE_URL configurada:', process.env.DATABASE_URL ? 'Sí' : 'No');
    
    // Conectar a la base de datos
    await prisma.$connect();
    console.log('✅ Conectado a PostgreSQL');
    
    // Ejecutar migraciones
    await createTablesIfNotExist();
    
    console.log('🎉 Migración completada exitosamente');
    
    // Verificar que las tablas existen
    const userCount = await prisma.user.count();
    console.log(`✅ Tabla 'users' verificada (${userCount} usuarios encontrados)`);
    
  } catch (error) {
    console.error('❌ Error durante la migración:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
    console.log('🔌 Desconectado de PostgreSQL');
  }
};

// Ejecutar solo si se llama directamente
if (require.main === module) {
  forceMigrate();
}

module.exports = forceMigrate;
