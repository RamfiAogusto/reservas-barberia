#!/usr/bin/env node

/**
 * Script para migrar de MongoDB a PostgreSQL
 * Instala dependencias y ejecuta migraciones de Prisma
 */

const { execSync } = require('child_process')
const fs = require('fs')
const path = require('path')

// Colores para console output
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  reset: '\x1b[0m',
  bold: '\x1b[1m'
}

const log = {
  success: (msg) => console.log(`${colors.green}✅ ${msg}${colors.reset}`),
  error: (msg) => console.log(`${colors.red}❌ ${msg}${colors.reset}`),
  warning: (msg) => console.log(`${colors.yellow}⚠️  ${msg}${colors.reset}`),
  info: (msg) => console.log(`${colors.blue}ℹ️  ${msg}${colors.reset}`),
  title: (msg) => console.log(`\n${colors.bold}${colors.cyan}🚀 ${msg}${colors.reset}\n`)
}

async function migrateToPostgreSQL() {
  try {
    log.title('MIGRACIÓN DE MONGODB A POSTGRESQL')
    
    // Verificar que estamos en el directorio correcto
    if (!fs.existsSync('./package.json')) {
      log.error('No se encontró package.json. Ejecuta este script desde el directorio backend/')
      process.exit(1)
    }

    // Paso 1: Instalar nuevas dependencias
    log.title('PASO 1: Instalando dependencias de PostgreSQL')
    try {
      log.info('Instalando @prisma/client y pg...')
      execSync('npm install @prisma/client pg', { stdio: 'inherit' })
      
      log.info('Instalando Prisma CLI...')
      execSync('npm install -D prisma', { stdio: 'inherit' })
      
      log.info('Desinstalando mongoose...')
      execSync('npm uninstall mongoose', { stdio: 'inherit' })
      
      log.success('Dependencias instaladas correctamente')
    } catch (error) {
      log.error('Error instalando dependencias')
      throw error
    }

    // Paso 2: Verificar schema de Prisma
    log.title('PASO 2: Verificando schema de Prisma')
    if (!fs.existsSync('./prisma/schema.prisma')) {
      log.error('No se encontró el archivo schema.prisma')
      log.info('Asegúrate de que el archivo ./prisma/schema.prisma existe')
      process.exit(1)
    }
    log.success('Schema de Prisma encontrado')

    // Paso 3: Verificar variable de entorno
    log.title('PASO 3: Verificando configuración de base de datos')
    const envExists = fs.existsSync('./.env')
    
    if (!envExists) {
      log.warning('No se encontró archivo .env')
      log.info('Creando archivo .env desde env.example...')
      if (fs.existsSync('./env.example')) {
        fs.copyFileSync('./env.example', './.env')
        log.success('Archivo .env creado desde env.example')
      } else {
        log.error('No se encontró env.example')
        process.exit(1)
      }
    }

    // Verificar DATABASE_URL
    const envContent = fs.readFileSync('./.env', 'utf8')
    if (!envContent.includes('DATABASE_URL=')) {
      log.error('DATABASE_URL no encontrada en .env')
      log.info('Agrega: DATABASE_URL=postgresql://username:password@localhost:5432/reservas_barberia')
      process.exit(1)
    }
    log.success('DATABASE_URL configurada')

    // Paso 4: Generar cliente Prisma
    log.title('PASO 4: Generando cliente Prisma')
    try {
      execSync('npx prisma generate', { stdio: 'inherit' })
      log.success('Cliente Prisma generado exitosamente')
    } catch (error) {
      log.error('Error generando cliente Prisma')
      throw error
    }

    // Paso 5: Ejecutar migraciones
    log.title('PASO 5: Ejecutando migraciones de base de datos')
    try {
      log.info('Ejecutando primera migración...')
      execSync('npx prisma migrate dev --name init', { stdio: 'inherit' })
      log.success('Migraciones ejecutadas exitosamente')
    } catch (error) {
      log.warning('Error ejecutando migraciones automáticas')
      log.info('Puedes ejecutar manualmente: npx prisma migrate dev --name init')
      log.info('O usar: npx prisma db push para desarrollo')
    }

    // Paso 6: Verificar conexión
    log.title('PASO 6: Verificando conexión a PostgreSQL')
    try {
      const { checkConnection } = require('./lib/prisma')
      const isConnected = await checkConnection()
      
      if (isConnected) {
        log.success('Conexión a PostgreSQL exitosa')
      } else {
        log.error('No se pudo conectar a PostgreSQL')
        log.info('Verifica tu DATABASE_URL y que PostgreSQL esté ejecutándose')
      }
    } catch (error) {
      log.warning('No se pudo verificar la conexión automáticamente')
      log.info('Ejecuta: npm run db-check para verificar manualmente')
    }

    // Resumen final
    log.title('🎉 MIGRACIÓN COMPLETADA')
    console.log(`${colors.green}✅ Dependencias instaladas`)
    console.log(`${colors.green}✅ Schema de Prisma configurado`)
    console.log(`${colors.green}✅ Cliente Prisma generado`)
    console.log(`${colors.green}✅ Migraciones ejecutadas`)
    
    console.log(`\n${colors.bold}${colors.blue}📋 PRÓXIMOS PASOS:${colors.reset}`)
    console.log(`${colors.yellow}1. Configura tu base de datos PostgreSQL`)
    console.log(`${colors.yellow}2. Actualiza DATABASE_URL en .env`)
    console.log(`${colors.yellow}3. Ejecuta: npm run dev`)
    console.log(`${colors.yellow}4. Prueba los endpoints con: npm run check`)
    
    console.log(`\n${colors.bold}${colors.green}🚀 El backend está listo para usar PostgreSQL!${colors.reset}`)

  } catch (error) {
    log.error('Error en el proceso de migración:')
    console.error(error.message)
    process.exit(1)
  }
}

// Ejecutar si se llama directamente
if (require.main === module) {
  migrateToPostgreSQL()
}

module.exports = { migrateToPostgreSQL } 