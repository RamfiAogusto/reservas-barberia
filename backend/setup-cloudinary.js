#!/usr/bin/env node

/**
 * Script Interactivo para Configurar Cloudinary
 * Ayuda a configurar Cloudinary paso a paso
 */

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

console.log(`${colors.bold}${colors.cyan}
╔══════════════════════════════════════════════════════════╗
║           🖼️  CONFIGURACIÓN DE CLOUDINARY - Guía         ║
╚══════════════════════════════════════════════════════════╝
${colors.reset}`)

console.log(`
${colors.blue}📸 Cloudinary es el servicio que permite a tus usuarios subir y gestionar
   las imágenes de su galería en el perfil público.${colors.reset}

${colors.yellow}⚠️  Sin Cloudinary configurado:${colors.reset}
   • ✅ El sistema funciona normalmente
   • ❌ La galería de imágenes no funciona
   • ❌ Los perfiles públicos no mostrarán imágenes

${colors.green}✅ Con Cloudinary configurado:${colors.reset}
   • 📸 Galería de imágenes completamente funcional
   • 🎯 Perfiles públicos con imágenes destacadas
   • 🔄 Gestión automática de imágenes (redimensionado, optimización)
`)

console.log(`${colors.bold}${colors.blue}
════════════════════════════════════════════════════════════
                  📋 PASOS PARA CONFIGURAR
════════════════════════════════════════════════════════════
${colors.reset}`)

console.log(`
${colors.bold}1. 🌐 Crear Cuenta Gratuita en Cloudinary${colors.reset}
   
   ${colors.cyan}→ Ve a: https://cloudinary.com${colors.reset}
   ${colors.cyan}→ Clic en "Start Building for Free"${colors.reset}
   ${colors.cyan}→ Regístrate con tu email${colors.reset}
   
   ${colors.green}✅ Plan gratuito incluye:${colors.reset}
      • 25 GB de almacenamiento
      • 25 GB de ancho de banda mensual
      • Suficiente para cientos de imágenes

${colors.bold}2. 📊 Obtener Credenciales del Dashboard${colors.reset}
   
   ${colors.cyan}→ Una vez registrado, ve al Dashboard${colors.reset}
   ${colors.cyan}→ En la parte superior verás tus credenciales:${colors.reset}
   
   ${colors.yellow}┌─────────────────────────────────────────────┐
   │ Cloud Name:    mi-barberia-app               │
   │ API Key:       123456789012345               │
   │ API Secret:    abcdef123456789               │  
   └─────────────────────────────────────────────┘${colors.reset}

${colors.bold}3. ⚙️  Agregar Credenciales al archivo .env${colors.reset}
   
   ${colors.cyan}→ Abre tu archivo .env en el backend${colors.reset}
   ${colors.cyan}→ Busca las líneas de Cloudinary${colors.reset}
   ${colors.cyan}→ Reemplaza los valores placeholder:${colors.reset}
`)

// Detectar si ya existe un archivo .env
const envPath = path.join(__dirname, '.env')
const envExamplePath = path.join(__dirname, 'env.example')

let currentEnvContent = ''
let hasEnvFile = false

if (fs.existsSync(envPath)) {
  hasEnvFile = true
  try {
    currentEnvContent = fs.readFileSync(envPath, 'utf8')
  } catch (error) {
    console.log(`${colors.red}❌ Error leyendo archivo .env: ${error.message}${colors.reset}`)
  }
}

console.log(`
${colors.yellow}   # Antes (placeholder):${colors.reset}
   CLOUDINARY_CLOUD_NAME=tu_cloud_name
   CLOUDINARY_API_KEY=tu_api_key
   CLOUDINARY_API_SECRET=tu_api_secret

${colors.green}   # Después (con tus datos reales):${colors.reset}
   CLOUDINARY_CLOUD_NAME=mi-barberia-app
   CLOUDINARY_API_KEY=123456789012345
   CLOUDINARY_API_SECRET=abcdef123456789
`)

if (hasEnvFile) {
  console.log(`\n${colors.blue}📁 Estado actual de tu archivo .env:${colors.reset}`)
  
  const hasCloudinaryConfig = currentEnvContent.includes('CLOUDINARY_CLOUD_NAME=') &&
                               !currentEnvContent.includes('CLOUDINARY_CLOUD_NAME=tu_cloud_name')
  
  if (hasCloudinaryConfig) {
    console.log(`   ${colors.green}✅ Cloudinary parece estar configurado${colors.reset}`)
  } else {
    console.log(`   ${colors.yellow}⚠️  Cloudinary no configurado o usando valores placeholder${colors.reset}`)
  }
} else {
  console.log(`\n${colors.red}❌ No se encontró archivo .env${colors.reset}`)
  console.log(`   ${colors.cyan}→ Copia env.example a .env primero:${colors.reset}`)
  console.log(`   ${colors.cyan}   cp env.example .env${colors.reset}`)
}

console.log(`
${colors.bold}4. 🧪 Probar la Configuración${colors.reset}
   
   ${colors.cyan}→ Ejecuta el script de verificación:${colors.reset}
   ${colors.cyan}   npm run check${colors.reset}
   
   ${colors.cyan}→ O prueba subiendo una imagen desde el dashboard${colors.reset}

${colors.bold}5. 🚀 Deployment en Producción${colors.reset}
   
   ${colors.cyan}→ En tu plataforma de hosting (Railway, Render, etc.):${colors.reset}
   ${colors.cyan}→ Agrega las mismas variables de entorno${colors.reset}
   ${colors.cyan}→ CLOUDINARY_CLOUD_NAME=tu_valor${colors.reset}
   ${colors.cyan}→ CLOUDINARY_API_KEY=tu_valor${colors.reset}
   ${colors.cyan}→ CLOUDINARY_API_SECRET=tu_valor${colors.reset}
`)

console.log(`${colors.bold}${colors.cyan}
════════════════════════════════════════════════════════════
                     ❓ PREGUNTAS FRECUENTES
════════════════════════════════════════════════════════════
${colors.reset}`)

console.log(`
${colors.bold}Q: ¿Es obligatorio configurar Cloudinary?${colors.reset}
A: No. El sistema funciona perfectamente sin Cloudinary.
   Solo la galería de imágenes estará deshabilitada.

${colors.bold}Q: ¿Cloudinary es gratuito?${colors.reset}
A: Sí, el plan gratuito es suficiente para la mayoría de barberías.
   25GB de almacenamiento = cientos/miles de fotos.

${colors.bold}Q: ¿Qué pasa con las imágenes si cambio de plan?${colors.reset}
A: Las imágenes quedan guardadas en Cloudinary.
   Puedes migrar o descargar si necesitas cambiar.

${colors.bold}Q: ¿Es seguro usar Cloudinary?${colors.reset}
A: Sí, es usado por empresas como Netflix, Nike, etc.
   Tus API secrets están protegidos en variables de entorno.

${colors.bold}Q: ¿Puedo usar otro servicio de imágenes?${colors.reset}
A: El código está diseñado para Cloudinary específicamente.
   Se puede adaptar, pero requiere modificaciones.
`)

console.log(`
${colors.bold}${colors.green}
🎯 PRÓXIMOS PASOS:
${colors.reset}
1. 🌐 Crear cuenta en https://cloudinary.com
2. 📋 Copiar credenciales al archivo .env
3. 🧪 Ejecutar: npm run check
4. 🚀 ¡Listo! Tu galería funcionará perfectamente

${colors.cyan}💡 ¿Necesitas ayuda? Revisa: backend/PRODUCTION-SETUP.md${colors.reset}
`)

// Ejemplo de configuración según el entorno
console.log(`${colors.bold}${colors.blue}
════════════════════════════════════════════════════════════
                   📝 EJEMPLO DE CONFIGURACIÓN
════════════════════════════════════════════════════════════
${colors.reset}`)

console.log(`
${colors.yellow}# Tu archivo .env debería verse así:${colors.reset}
${colors.green}# Variables básicas (ya funcionando)
NODE_ENV=development
PORT=5000
MONGODB_URI=mongodb://localhost:27017/DB_reservas
JWT_SECRET=tu_jwt_secret_super_seguro_aqui

# Emails (ya funcionando)
RESEND_API_KEY=re_BM7CX92n_FfzX6zbHosaL35uNFSsPhSZm
FROM_EMAIL=onboarding@resend.dev

# Cloudinary (reemplazar con tus valores)
CLOUDINARY_CLOUD_NAME=mi-barberia-app
CLOUDINARY_API_KEY=123456789012345
CLOUDINARY_API_SECRET=abc123def456ghi789${colors.reset}
`)

console.log(`\n${colors.cyan}🔧 Script completado. ¡Configura Cloudinary cuando estés listo!${colors.reset}\n`) 