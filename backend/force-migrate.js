/**
 * Aplica las migraciones de Prisma pendientes contra DATABASE_URL.
 * Reemplaza al antiguo bootstrap manual de tablas (raw SQL), que quedaba
 * desincronizado del schema.prisma real y fue eliminado de lib/prisma.js.
 * El despliegue depende de `prisma migrate deploy` (ver PRODUCTION-SETUP.md).
 */
const { execSync } = require('child_process');
const { PrismaClient } = require('@prisma/client');

const forceMigrate = async () => {
  console.log('🚀 Aplicando migraciones de Prisma (prisma migrate deploy)...');
  console.log('🌍 NODE_ENV:', process.env.NODE_ENV);
  console.log('🗄️ DATABASE_URL configurada:', process.env.DATABASE_URL ? 'Sí' : 'No');

  try {
    execSync('npx prisma migrate deploy', { stdio: 'inherit' });
    console.log('🎉 Migraciones aplicadas exitosamente');
  } catch (error) {
    console.error('❌ Error aplicando migraciones:', error.message);
    process.exit(1);
  }

  // Verificación rápida de conectividad post-migración
  const prisma = new PrismaClient();
  try {
    await prisma.$connect();
    const userCount = await prisma.user.count();
    console.log(`✅ Tabla 'users' verificada (${userCount} usuarios encontrados)`);
  } catch (error) {
    console.error('❌ Error verificando la base de datos tras migrar:', error.message);
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
