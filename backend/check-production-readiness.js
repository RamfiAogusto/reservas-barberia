#!/usr/bin/env node

/**
 * Script de Verificación de Preparación para Producción
 * Verifica que todas las configuraciones estén correctas
 */

require('dotenv').config()
const { prisma } = require('./lib/prisma')

// Colores para console output
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m',
  bold: '\x1b[1m'
}

const log = {
  success: (msg) => console.log(`${colors.green}✅ ${msg}${colors.reset}`),
  error: (msg) => console.log(`${colors.red}❌ ${msg}${colors.reset}`),
  warning: (msg) => console.log(`${colors.yellow}⚠️  ${msg}${colors.reset}`),
  info: (msg) => console.log(`${colors.blue}ℹ️  ${msg}${colors.reset}`),
  title: (msg) => console.log(`\n${colors.bold}${colors.blue}🔍 ${msg}${colors.reset}\n`)
}

async function checkProductionReadiness() {
  console.log(`${colors.bold}${colors.blue}
╔══════════════════════════════════════════════════════════╗
║        🚀 VERIFICACIÓN DE PRODUCCIÓN - ReservasBarberia  ║
╚══════════════════════════════════════════════════════════╝
${colors.reset}`)

  let criticalIssues = 0
  let warnings = 0
  let optionalFeatures = 0

  // =====================================
  // 1. VERIFICAR VARIABLES BÁSICAS
  // =====================================
  log.title('CONFIGURACIÓN BÁSICA')

  if (process.env.NODE_ENV === 'production') {
    log.success('NODE_ENV configurado para producción')
  } else {
    log.warning(`NODE_ENV: ${process.env.NODE_ENV || 'no definido'} - Se recomienda "production"`)
    warnings++
  }

  if (process.env.JWT_SECRET) {
    if (process.env.JWT_SECRET.length >= 32) {
      log.success('JWT_SECRET configurado con longitud segura')
    } else {
      log.warning('JWT_SECRET muy corto - Usar al menos 32 caracteres para producción')
      warnings++
    }
  } else {
    log.error('JWT_SECRET no configurado - CRÍTICO')
    criticalIssues++
  }

  if (process.env.PORT) {
    log.success(`Puerto configurado: ${process.env.PORT}`)
  } else {
    log.warning('PORT no configurado - usando puerto por defecto')
    warnings++
  }

  if (process.env.FRONTEND_URL) {
    log.success(`Frontend URL: ${process.env.FRONTEND_URL}`)
  } else {
    log.warning('FRONTEND_URL no configurado - CORS podría fallar')
    warnings++
  }

  // =====================================
  // 2. VERIFICAR BASE DE DATOS
  // =====================================
  log.title('BASE DE DATOS POSTGRESQL')

  if (!process.env.DATABASE_URL) {
    log.error('DATABASE_URL no configurado - CRÍTICO')
    criticalIssues++
  } else {
    const isLocalDbUrl = /localhost|127\.0\.0\.1/.test(process.env.DATABASE_URL)
    if (isLocalDbUrl && process.env.NODE_ENV === 'production') {
      log.warning('DATABASE_URL apunta a localhost pero NODE_ENV=production - revisa la configuración')
      warnings++
    }
    try {
      log.info('Verificando conexión a PostgreSQL...')
      await prisma.$connect()
      log.success('✅ Conexión a PostgreSQL exitosa')
      
      // Verificar que hay usuarios en la base de datos
      const userCount = await prisma.user.count()
      
      if (userCount > 0) {
        log.success(`Base de datos poblada con ${userCount} usuarios`)
      } else {
        log.warning('Base de datos vacía - No hay usuarios registrados')
        warnings++
      }

      await prisma.$disconnect()
    } catch (error) {
              log.error(`Error conectando a PostgreSQL: ${error.message}`)
      criticalIssues++
    }
  }

  // =====================================
  // 3. VERIFICAR SISTEMA DE EMAILS
  // =====================================
  log.title('SISTEMA DE EMAILS')

  if (process.env.RESEND_API_KEY) {
    log.success('Resend API Key configurado')
    if (process.env.FROM_EMAIL) {
      log.success(`Email remitente: ${process.env.FROM_EMAIL}`)
    } else {
      log.warning('FROM_EMAIL no configurado')
      warnings++
    }
  } else {
    log.error('RESEND_API_KEY no configurado - Emails no funcionarán')
    criticalIssues++
  }

  // =====================================
  // 4. VERIFICAR CLOUDINARY (OPCIONAL)
  // =====================================
  log.title('CLOUDINARY (GALERÍA DE IMÁGENES)')

  const hasCloudinaryConfig = process.env.CLOUDINARY_CLOUD_NAME && 
                               process.env.CLOUDINARY_API_KEY && 
                               process.env.CLOUDINARY_API_SECRET

  if (hasCloudinaryConfig) {
    log.success('Cloudinary completamente configurado - Galería habilitada')
  } else {
    log.warning('Cloudinary no configurado - Galería de imágenes deshabilitada')
    log.info('Para habilitar: https://cloudinary.com (plan gratuito disponible)')
    optionalFeatures++
  }

  // =====================================
  // 5. VERIFICAR STRIPE (OPCIONAL)
  // =====================================
  log.title('STRIPE (PAGOS ONLINE)')

  const hasStripeConfig = process.env.STRIPE_SECRET_KEY && process.env.STRIPE_WEBHOOK_SECRET

  // IMPORTANTE: la presencia de las keys NO significa que los pagos estén operativos.
  // services/paymentGatewayService.js es actualmente un mock: isConfigured() devuelve
  // `false` de forma fija y ningún método llama a un proveedor real. No reportar
  // "Stripe listo" solo por tener las variables de entorno configuradas.
  if (hasStripeConfig) {
    const isLiveKey = process.env.STRIPE_SECRET_KEY.startsWith('sk_live_')
    log.warning(`Claves de Stripe presentes (${isLiveKey ? 'producción' : 'prueba'}), pero la pasarela de pago sigue siendo un MOCK — no procesa pagos reales todavía`)
    log.info('Ver services/paymentGatewayService.js: falta implementar la integración real (P6-1)')
    warnings++
  } else {
    log.warning('Stripe no configurado - Solo pagos en efectivo disponibles')
    log.info('Sistema funciona perfectamente sin Stripe (y aunque se configure, el gateway sigue siendo mock)')
    optionalFeatures++
  }

  // =====================================
  // 6. VERIFICAR REDIS (OPCIONAL)
  // =====================================
  log.title('REDIS (RECORDATORIOS AUTOMÁTICOS)')

  if (process.env.REDIS_HOST) {
    log.success('Redis configurado - Recordatorios automáticos habilitados')
  } else {
    log.warning('Redis no configurado - Sin recordatorios automáticos')
    log.info('Emails de confirmación SÍ funcionan sin Redis')
    optionalFeatures++
  }

  // =====================================
  // 7. VERIFICAR DEPENDENCIAS
  // =====================================
  log.title('DEPENDENCIAS')

  try {
    const packageJson = require('./package.json')
    log.success(`Aplicación: ${packageJson.name} v${packageJson.version}`)
    log.success('package.json encontrado y válido')
  } catch (error) {
    log.error('Error leyendo package.json')
    criticalIssues++
  }

  // =====================================
  // RESUMEN FINAL
  // =====================================
  console.log(`\n${colors.bold}${colors.blue}
╔══════════════════════════════════════════════════════════╗
║                     📊 RESUMEN FINAL                     ║
╚══════════════════════════════════════════════════════════╝
${colors.reset}`)

  if (criticalIssues === 0) {
    log.success('✅ SISTEMA LISTO PARA PRODUCCIÓN')
    console.log(`
${colors.green}🎉 Tu aplicación está lista para desplegarse en producción.
   Funcionalidades principales habilitadas:
   • Sistema de reservas completo
   • Emails automáticos
   • Perfiles públicos
   • Dashboard administrativo${colors.reset}`)
  } else {
    log.error(`❌ ${criticalIssues} PROBLEMAS CRÍTICOS DETECTADOS`)
    console.log(`${colors.red}⚠️  Soluciona los problemas críticos antes de desplegar.${colors.reset}`)
  }

  if (warnings > 0) {
    console.log(`${colors.yellow}⚠️  ${warnings} advertencias menores detectadas.${colors.reset}`)
  }

  if (optionalFeatures > 0) {
    console.log(`${colors.blue}ℹ️  ${optionalFeatures} funcionalidades opcionales deshabilitadas.${colors.reset}`)
  }

  // Recomendaciones
  console.log(`\n${colors.bold}📋 PRÓXIMOS PASOS RECOMENDADOS:${colors.reset}`)
  
  if (criticalIssues === 0) {
    console.log(`${colors.green}1. ✅ Desplegar en plataforma de hosting${colors.reset}`)
    console.log(`${colors.green}2. ✅ Configurar dominio personalizado${colors.reset}`)
    if (optionalFeatures > 0) {
      console.log(`${colors.yellow}3. 📸 Configurar Cloudinary para galería${colors.reset}`)
      console.log(`${colors.yellow}4. 🔄 Configurar Redis para recordatorios${colors.reset}`)
    }
  } else {
    console.log(`${colors.red}1. 🔧 Resolver problemas críticos${colors.reset}`)
    console.log(`${colors.red}2. 🔄 Volver a ejecutar este script${colors.reset}`)
  }

  console.log(`\n${colors.blue}📖 Para más información: backend/PRODUCTION-SETUP.md${colors.reset}\n`)

  // Exit code para CI/CD
  process.exit(criticalIssues > 0 ? 1 : 0)
}

// Ejecutar si se llama directamente
if (require.main === module) {
  checkProductionReadiness().catch(error => {
    console.error('Error ejecutando verificación:', error)
    process.exit(1)
  })
}

module.exports = { checkProductionReadiness } 