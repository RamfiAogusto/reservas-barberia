# 🚀 Configuración para Producción - ReservasBarberia

## 📋 **Checklist de Preparación**

### ✅ **Ya Configurado y Funcionando:**
- ✅ Sistema de emails (Resend)
- ✅ Base de datos MongoDB
- ✅ Autenticación JWT
- ✅ Sistema de reservas completo
- ✅ Horarios y calendario avanzado
- ✅ API pública para booking

### ⚠️ **Pendiente de Configuración:**
- 🖼️ **Cloudinary** (para galería de imágenes)
- 💳 **Stripe** (para pagos online)
- 🔄 **Redis** (para recordatorios - opcional)

---

## 🔧 **Variables de Entorno para Producción**

### **1. Crear archivo `.env` en producción con:**

```bash
# Configuración Básica
NODE_ENV=production
PORT=5000
MONGODB_URI=tu_uri_de_mongodb_produccion
JWT_SECRET=jwt_secret_muy_seguro_para_produccion
FRONTEND_URL=https://tu-dominio.com

# Emails (YA FUNCIONA)
RESEND_API_KEY=re_BM7CX92n_FfzX6zbHosaL35uNFSsPhSZm
FROM_EMAIL=onboarding@resend.dev

# Cloudinary (CONFIGURAR)
CLOUDINARY_CLOUD_NAME=tu_cloud_name
CLOUDINARY_API_KEY=tu_api_key
CLOUDINARY_API_SECRET=tu_api_secret

# Stripe (OPCIONAL)
STRIPE_SECRET_KEY=sk_live_tu_clave
STRIPE_WEBHOOK_SECRET=whsec_tu_webhook

# Redis (OPCIONAL)
REDIS_HOST=tu_redis_host
REDIS_PORT=6379
REDIS_PASSWORD=tu_redis_pass
```

---

## 🖼️ **Configuración de Cloudinary (Crítica)**

### **¿Por qué es importante?**
- Sin Cloudinary configurado, la **galería no funcionará**
- Los usuarios no podrán subir imágenes a sus perfiles
- El perfil público no mostrará imágenes

### **Configuración Paso a Paso:**

#### **1. Crear Cuenta Gratuita**
```bash
# Ir a: https://cloudinary.com
# Plan gratuito incluye:
# - 25 GB de almacenamiento
# - 25 GB de ancho de banda
# - Suficiente para pequeños y medianos negocios
```

#### **2. Obtener Credenciales**
```bash
# En Dashboard de Cloudinary:
# Cloud Name: ej. "barberia-app"
# API Key: ej. "123456789012345"
# API Secret: ej. "abcdefghijklmnopqrstuvwxyz"
```

#### **3. Configurar Variables**
```bash
CLOUDINARY_CLOUD_NAME=barberia-app
CLOUDINARY_API_KEY=123456789012345
CLOUDINARY_API_SECRET=abcdefghijklmnopqrstuvwxyz
```

### **¿Qué pasa sin Cloudinary?**
- ✅ El backend **NO SE CRASHEA**
- ✅ Todas las otras funciones funcionan normalmente
- ❌ La galería retorna error: "Cloudinary no configurado"
- ❌ Los perfiles públicos no muestran imágenes

---

## 💳 **Configuración de Stripe (Opcional)**

### **Estado Actual:**
- El sistema funciona **perfectamente sin Stripe**
- Los pagos se manejan como "efectivo" o "pendiente"
- Stripe solo se necesita para **pagos online automáticos**

### **Para Habilitar Pagos Online:**
```bash
# 1. Crear cuenta en https://stripe.com
# 2. Obtener claves de producción
# 3. Configurar webhook endpoints
STRIPE_SECRET_KEY=sk_live_tu_clave_secreta
STRIPE_WEBHOOK_SECRET=whsec_tu_webhook_secret
```

---

## 🔄 **Configuración de Redis (Opcional)**

### **¿Para qué sirve Redis?**
- **Recordatorios automáticos** por email
- Sistema de colas para tareas en background

### **Sin Redis:**
- ✅ El sistema funciona **100% normal**
- ❌ No hay recordatorios automáticos
- Los emails de confirmación **SÍ se envían**

### **Con Redis:**
```bash
# Opciones de hosting con Redis:
# - Railway.app (gratuito)
# - Render.com (gratuito)
# - Redis Cloud (gratuito hasta 30MB)

REDIS_HOST=redis-12345.c1.us-east-1-1.ec2.cloud.redislabs.com
REDIS_PORT=12345
REDIS_PASSWORD=tu_password_redis
```

---

## 🌐 **Opciones de Hosting Recomendadas**

### **Backend (API):**
1. **Railway.app** ⭐ (Recomendado)
   - Gratuito hasta $5/mes
   - Deploy automático desde GitHub
   - Include Redis gratuito

2. **Render.com**
   - Plan gratuito disponible
   - Fácil configuración

3. **Vercel** (para APIs)
   - Gratuito para proyectos pequeños

### **Base de Datos:**
1. **MongoDB Atlas** ⭐ (Recomendado)
   - 512MB gratuitos permanente
   - Ya está siendo usado

### **Frontend:**
1. **Vercel** ⭐ (Recomendado para Next.js)
   - Gratuito para proyectos personales
   - Deploy automático

2. **Netlify**
   - También excelente para React/Next.js

---

## 📦 **Scripts de Deployment**

### **Instalar Dependencias:**
```bash
cd backend
npm ci --production
```

### **Verificar Configuración:**
```bash
node -e "require('dotenv').config(); console.log('✅ Configuración cargada:', process.env.NODE_ENV)"
```

### **Iniciar en Producción:**
```bash
# Opción 1: Directamente
npm start

# Opción 2: Con PM2 (recomendado)
npm install -g pm2
pm2 start server.js --name "reservas-barberia"
pm2 startup
pm2 save
```

---

## 🔍 **Testing de Producción**

### **1. Verificar Endpoints:**
```bash
# Health check
curl https://tu-api.com/api/health

# Perfil público (reemplazar 'ramfi_aog' con un usuario real)
curl https://tu-api.com/api/public/salon/ramfi_aog

# Servicios públicos
curl https://tu-api.com/api/public/salon/ramfi_aog/services
```

### **2. Verificar Galería:**
```bash
# Con Cloudinary configurado debería funcionar
# Sin Cloudinary dará error pero no crashea
curl -H "Authorization: Bearer TU_TOKEN" https://tu-api.com/api/gallery
```

### **3. Verificar Emails:**
```bash
# Los emails deberían llegar automáticamente al hacer reservas
# Probar creando una reserva desde el frontend
```

---

## 🚨 **Troubleshooting**

### **Error: "Cloudinary no configurado"**
- ✅ **Normal** si no has configurado Cloudinary
- ✅ El resto del sistema funciona
- 🔧 Configurar Cloudinary para habilitar galería

### **Error: "Redis no disponible"**
- ✅ **Normal** sin Redis configurado
- ✅ El sistema funciona sin recordatorios automáticos
- 🔧 Configurar Redis para recordatorios

### **Error de conexión a MongoDB**
- ❌ **Crítico** - el sistema no funcionará
- 🔧 Verificar MONGODB_URI
- 🔧 Verificar que MongoDB Atlas permite conexiones

### **Error 500 en producción**
- 🔧 Verificar que NODE_ENV=production
- 🔧 Los errores se ocultan en producción por seguridad
- 🔧 Revisar logs del servidor

---

## ✅ **Sistema Listo para Producción**

### **Estado Actual (Sin configuraciones adicionales):**
- ✅ **Funciona al 100%** para reservas
- ✅ **Emails automáticos** funcionando
- ✅ **Perfiles públicos** funcionando
- ✅ **Sistema de horarios** completo
- ✅ **Dashboard administrativo** completo
- ❌ **Galería de imágenes** requiere Cloudinary
- ❌ **Recordatorios automáticos** requieren Redis

### **¿Listo para usar?**
**SÍ** - El sistema principal está **100% funcional** para:
- Gestión de reservas
- Perfiles públicos
- Booking online
- Emails de confirmación
- Dashboard administrativo

La galería y recordatorios son **funcionalidades adicionales** que se pueden configurar después. 