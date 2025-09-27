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
    
    // Ejecutar las migraciones directamente con SQL
    await createTablesIfNotExist()
    
    console.log('✅ Migraciones ejecutadas correctamente')
    return true
  } catch (error) {
    console.error('❌ Error ejecutando migraciones:', error.message)
    return false
  }
}

// Función para crear las tablas si no existen
async function createTablesIfNotExist() {
  try {
    // Verificar si la tabla users existe
    const result = await prisma.$queryRaw`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'users'
      );
    `
    
    const tableExists = result[0].exists
    
    if (tableExists) {
      console.log('✅ Las tablas ya existen')
      return
    }
    
    console.log('📊 Creando tablas de base de datos...')
    
    // Crear enums
    await prisma.$executeRaw`
      DO $$ BEGIN
        CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'OWNER', 'BARBER', 'CLIENT');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `
    
    await prisma.$executeRaw`
      DO $$ BEGIN
        CREATE TYPE "ServiceCategory" AS ENUM ('CORTE', 'BARBA', 'COMBO', 'TRATAMIENTO', 'OTRO');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `
    
    await prisma.$executeRaw`
      DO $$ BEGIN
        CREATE TYPE "AppointmentStatus" AS ENUM ('PENDIENTE', 'CONFIRMADA', 'COMPLETADA', 'CANCELADA', 'NO_ASISTIO');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `
    
    await prisma.$executeRaw`
      DO $$ BEGIN
        CREATE TYPE "PaymentStatus" AS ENUM ('PENDIENTE', 'PARCIAL', 'COMPLETO', 'REEMBOLSADO');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `
    
    await prisma.$executeRaw`
      DO $$ BEGIN
        CREATE TYPE "PaymentMethod" AS ENUM ('EFECTIVO', 'TARJETA', 'TRANSFERENCIA', 'STRIPE', 'PAYPAL');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `
    
    await prisma.$executeRaw`
      DO $$ BEGIN
        CREATE TYPE "ImageCategory" AS ENUM ('EXTERIOR', 'INTERIOR', 'SERVICIOS', 'EQUIPO', 'OTROS');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `
    
    await prisma.$executeRaw`
      DO $$ BEGIN
        CREATE TYPE "RecurrenceType" AS ENUM ('DAILY', 'WEEKLY', 'SPECIFIC_DAYS');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `
    
    await prisma.$executeRaw`
      DO $$ BEGIN
        CREATE TYPE "ExceptionType" AS ENUM ('DAY_OFF', 'SPECIAL_HOURS', 'VACATION', 'HOLIDAY');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `
    
    // Crear tabla users
    await prisma.$executeRaw`
      CREATE TABLE IF NOT EXISTS "users" (
        "id" TEXT NOT NULL,
        "username" TEXT NOT NULL,
        "email" TEXT NOT NULL,
        "password" TEXT NOT NULL,
        "phone" TEXT NOT NULL,
        "salonName" TEXT NOT NULL,
        "address" TEXT NOT NULL,
        "role" "UserRole" NOT NULL DEFAULT 'OWNER',
        "isActive" BOOLEAN NOT NULL DEFAULT true,
        "avatar" TEXT,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL,
        CONSTRAINT "users_pkey" PRIMARY KEY ("id")
      );
    `
    
    // Crear tabla services
    await prisma.$executeRaw`
      CREATE TABLE IF NOT EXISTS "services" (
        "id" TEXT NOT NULL,
        "userId" TEXT NOT NULL,
        "name" TEXT NOT NULL,
        "description" TEXT,
        "price" DOUBLE PRECISION NOT NULL,
        "duration" INTEGER NOT NULL,
        "showDuration" BOOLEAN NOT NULL DEFAULT true,
        "requiresPayment" BOOLEAN NOT NULL DEFAULT false,
        "depositAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
        "isActive" BOOLEAN NOT NULL DEFAULT true,
        "category" "ServiceCategory" NOT NULL DEFAULT 'CORTE',
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL,
        CONSTRAINT "services_pkey" PRIMARY KEY ("id")
      );
    `
    
    // Crear tabla appointments
    await prisma.$executeRaw`
      CREATE TABLE IF NOT EXISTS "appointments" (
        "id" TEXT NOT NULL,
        "userId" TEXT NOT NULL,
        "serviceId" TEXT NOT NULL,
        "clientName" TEXT NOT NULL,
        "clientEmail" TEXT NOT NULL,
        "clientPhone" TEXT NOT NULL,
        "date" TIMESTAMP(3) NOT NULL,
        "time" TEXT NOT NULL,
        "status" "AppointmentStatus" NOT NULL DEFAULT 'PENDIENTE',
        "notes" TEXT,
        "staffMember" TEXT,
        "totalAmount" DOUBLE PRECISION NOT NULL,
        "paidAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
        "paymentStatus" "PaymentStatus" NOT NULL DEFAULT 'PENDIENTE',
        "paymentMethod" "PaymentMethod" NOT NULL DEFAULT 'EFECTIVO',
        "reminderSent" BOOLEAN NOT NULL DEFAULT false,
        "cancelledAt" TIMESTAMP(3),
        "cancelReason" TEXT,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL,
        CONSTRAINT "appointments_pkey" PRIMARY KEY ("id")
      );
    `
    
    // Crear tabla business_hours
    await prisma.$executeRaw`
      CREATE TABLE IF NOT EXISTS "business_hours" (
        "id" TEXT NOT NULL,
        "userId" TEXT NOT NULL,
        "dayOfWeek" INTEGER NOT NULL,
        "startTime" TEXT NOT NULL,
        "endTime" TEXT NOT NULL,
        "isActive" BOOLEAN NOT NULL DEFAULT true,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL,
        CONSTRAINT "business_hours_pkey" PRIMARY KEY ("id")
      );
    `
    
    // Crear tabla business_images
    await prisma.$executeRaw`
      CREATE TABLE IF NOT EXISTS "business_images" (
        "id" TEXT NOT NULL,
        "userId" TEXT NOT NULL,
        "imageUrl" TEXT NOT NULL,
        "cloudinaryPublicId" TEXT NOT NULL,
        "title" TEXT,
        "description" TEXT,
        "category" "ImageCategory" NOT NULL DEFAULT 'OTROS',
        "order" INTEGER NOT NULL DEFAULT 0,
        "isActive" BOOLEAN NOT NULL DEFAULT true,
        "isFeatured" BOOLEAN NOT NULL DEFAULT false,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL,
        CONSTRAINT "business_images_pkey" PRIMARY KEY ("id")
      );
    `
    
    // Crear tabla recurring_breaks
    await prisma.$executeRaw`
      CREATE TABLE IF NOT EXISTS "recurring_breaks" (
        "id" TEXT NOT NULL,
        "userId" TEXT NOT NULL,
        "name" TEXT NOT NULL,
        "startTime" TEXT NOT NULL,
        "endTime" TEXT NOT NULL,
        "recurrenceType" "RecurrenceType" NOT NULL,
        "specificDays" INTEGER[],
        "isActive" BOOLEAN NOT NULL DEFAULT true,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL,
        CONSTRAINT "recurring_breaks_pkey" PRIMARY KEY ("id")
      );
    `
    
    // Crear tabla schedule_exceptions
    await prisma.$executeRaw`
      CREATE TABLE IF NOT EXISTS "schedule_exceptions" (
        "id" TEXT NOT NULL,
        "userId" TEXT NOT NULL,
        "name" TEXT NOT NULL,
        "exceptionType" "ExceptionType" NOT NULL,
        "startDate" TIMESTAMP(3) NOT NULL,
        "endDate" TIMESTAMP(3) NOT NULL,
        "specialStartTime" TEXT,
        "specialEndTime" TEXT,
        "isRecurringAnnually" BOOLEAN NOT NULL DEFAULT false,
        "reason" TEXT,
        "isActive" BOOLEAN NOT NULL DEFAULT true,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL,
        CONSTRAINT "schedule_exceptions_pkey" PRIMARY KEY ("id")
      );
    `
    
    // Crear índices únicos
    await prisma.$executeRaw`
      CREATE UNIQUE INDEX IF NOT EXISTS "users_username_key" ON "users"("username");
    `
    
    await prisma.$executeRaw`
      CREATE UNIQUE INDEX IF NOT EXISTS "users_email_key" ON "users"("email");
    `
    
    await prisma.$executeRaw`
      CREATE UNIQUE INDEX IF NOT EXISTS "business_hours_userId_dayOfWeek_key" ON "business_hours"("userId", "dayOfWeek");
    `
    
    // Agregar foreign keys
    await prisma.$executeRaw`
      DO $$ BEGIN
        ALTER TABLE "services" ADD CONSTRAINT "services_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `
    
    await prisma.$executeRaw`
      DO $$ BEGIN
        ALTER TABLE "appointments" ADD CONSTRAINT "appointments_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `
    
    await prisma.$executeRaw`
      DO $$ BEGIN
        ALTER TABLE "appointments" ADD CONSTRAINT "appointments_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "services"("id") ON DELETE CASCADE ON UPDATE CASCADE;
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `
    
    await prisma.$executeRaw`
      DO $$ BEGIN
        ALTER TABLE "business_hours" ADD CONSTRAINT "business_hours_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `
    
    await prisma.$executeRaw`
      DO $$ BEGIN
        ALTER TABLE "business_images" ADD CONSTRAINT "business_images_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `
    
    await prisma.$executeRaw`
      DO $$ BEGIN
        ALTER TABLE "recurring_breaks" ADD CONSTRAINT "recurring_breaks_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `
    
    await prisma.$executeRaw`
      DO $$ BEGIN
        ALTER TABLE "schedule_exceptions" ADD CONSTRAINT "schedule_exceptions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `
    
    console.log('✅ Todas las tablas creadas exitosamente')
    
  } catch (error) {
    console.error('❌ Error creando tablas:', error)
    throw error
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
    console.log('🔌 Intentando conectar a PostgreSQL...')
    console.log('🌍 NODE_ENV:', process.env.NODE_ENV)
    console.log('🗄️ DATABASE_URL configurada:', process.env.DATABASE_URL ? 'Sí' : 'No')
    
    await prisma.$connect()
    console.log('✅ Conectado a PostgreSQL')
    
    // En producción, verificar si las tablas existen
    if (process.env.NODE_ENV === 'production') {
      console.log('🏭 Entorno de producción detectado, verificando tablas...')
      const tablesExist = await checkTablesExist()
      console.log('📊 Tablas existen:', tablesExist)
      
      if (!tablesExist) {
        console.log('⚠️ Las tablas no existen, ejecutando migraciones...')
        const migrationsSuccess = await runMigrations()
        if (!migrationsSuccess) {
          throw new Error('No se pudieron ejecutar las migraciones')
        }
        
        // Verificar nuevamente después de las migraciones
        const tablesExistAfter = await checkTablesExist()
        console.log('📊 Tablas existen después de migración:', tablesExistAfter)
        
        if (!tablesExistAfter) {
          throw new Error('Las migraciones no se ejecutaron correctamente')
        }
      } else {
        console.log('✅ Las tablas ya existen, no se requieren migraciones')
      }
    } else {
      console.log('🔧 Entorno de desarrollo, saltando verificación de tablas')
    }
    
    return true
  } catch (error) {
    console.error('❌ Error conectando a PostgreSQL:', error.message)
    console.error('❌ Stack trace:', error.stack)
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
  checkTablesExist,
  createTablesIfNotExist
} 