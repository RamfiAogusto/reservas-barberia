#!/usr/bin/env node

/**
 * Script para debuggear la configuración de Netlify
 */

const fs = require('fs')
const path = require('path')

console.log('🔍 Debugging Netlify Configuration...\n')

// Verificar estructura de directorios
console.log('📁 Estructura de directorios:')
console.log('   Current directory:', process.cwd())
console.log('   .next exists:', fs.existsSync('.next'))
console.log('   public exists:', fs.existsSync('public'))
console.log('   netlify.toml exists:', fs.existsSync('netlify.toml'))

// Verificar contenido de .next
if (fs.existsSync('.next')) {
  console.log('\n📦 Contenido de .next:')
  const nextContents = fs.readdirSync('.next')
  console.log('   Files:', nextContents.join(', '))
  
  if (fs.existsSync('.next/static')) {
    console.log('   static/ exists:', fs.existsSync('.next/static'))
  }
  
  if (fs.existsSync('.next/server')) {
    console.log('   server/ exists:', fs.existsSync('.next/server'))
  }
}

// Verificar netlify.toml
if (fs.existsSync('netlify.toml')) {
  console.log('\n⚙️ netlify.toml content:')
  const tomlContent = fs.readFileSync('netlify.toml', 'utf8')
  console.log(tomlContent)
}

// Verificar package.json scripts
if (fs.existsSync('package.json')) {
  console.log('\n📋 package.json scripts:')
  const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'))
  console.log('   build:', packageJson.scripts.build)
  console.log('   start:', packageJson.scripts.start)
}

console.log('\n✅ Debug completado') 