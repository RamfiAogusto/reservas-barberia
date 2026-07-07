# 🚀 Configuración para Producción - ReservasBarberia

## 🗄️ Migraciones de base de datos

El esquema de la base de datos (tablas, enums, índices) se gestiona **exclusivamente**
con Prisma Migrate. `lib/prisma.js` ya NO contiene un bootstrap manual de creación de
tablas (el antiguo fallback de ~400 líneas de `CREATE TABLE IF NOT EXISTS` fue eliminado
por estar desincronizado con `schema.prisma` y ser peligroso si llegaba a ejecutarse en
una base de datos nueva).

Antes de desplegar (o como parte del pipeline de deploy) ejecutar:

```bash
npx prisma migrate deploy
```

`npm run build` ya invoca esto vía `force-migrate.js`, que ahora corre
`prisma migrate deploy` en lugar de crear tablas a mano. Si `DATABASE_URL` no tiene
las migraciones aplicadas, el servidor arrancará pero las queries de Prisma fallarán.

## 🌐 Topología de despliegue (pendiente de confirmación humana)

**Estado real detectado en el código (no asumir sin confirmar con el owner):**
- El backend corre en **Render** (ver `DATABASE_URL` de ejemplo y el dominio
  `reservas-barberia-backend.onrender.com` usado en `netlify.toml`).
- El frontend de producción vigente parece ser el dominio de **Vercel**
  (`reservas-barberia-ruddy.vercel.app`), pero además existen dos configuraciones
  de Netlify (`netlify.toml` en la raíz y en `frontend/`) apuntando a un tercer
  dominio (`cosmic-maamoul-8661f7.netlify.app`), y el `netlify.toml` de `frontend/`
  tiene un redirect estilo CRA (`/index.html`) que es incorrecto para Next.js App Router.
- `backend/server.js` mantiene ambos orígenes (Vercel + Netlify) en la allowlist de CORS
  junto con `FRONTEND_URL`, con un comentario explicando que es temporal.

**Acción requerida (humano):** confirmar cuál es la topología canónica
(recomendado: Vercel para frontend + Render para backend) y, una vez confirmado:
1. Eliminar los `netlify.toml` (raíz y `frontend/`) si Netlify ya no se usa.
2. Quitar los dominios legacy de la allowlist de CORS en `server.js`.
3. Dejar `FRONTEND_URL` como única fuente de verdad para CORS, enlaces de email y
   redirecciones de pago.

Esto **no se hizo automáticamente** porque implica borrar configuración de
despliegue y tomar una decisión irreversible de hosting — requiere confirmación
del owner.

## 📋 **Checklist de Preparación**

### ✅ **Ya Configurado y Funcionando:**
- ✅ Sistema de emails (Resend)
- ✅ Base de datos PostgreSQL
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
DATABASE_URL=tu_uri_de_postgresql_produccion
JWT_SECRET=jwt_secret_muy_seguro_para_produccion
FRONTEND_URL=https://tu-dominio.com

# Emails (YA FUNCIONA)
RESEND_API_KEY=re_XXXXXXXXXXXXXXXXXXXX
FROM_EMAIL=onboarding@resend.dev

# Cloudinary (CONFIGURAR)
CLOUDINARY_CLOUD_NAME=tu_cloud_name
CLOUDINARY_API_KEY=tu_api_key
CLOUDINARY_API_SECRET=tu_api_secret

# Stripe (OPCIONAL — ver nota abajo: la pasarela sigue siendo un mock)
STRIPE_SECRET_KEY=sk_live_tu_clave
STRIPE_WEBHOOK_SECRET=whsec_tu_webhook

# Redis (OPCIONAL)
REDIS_HOST=tu_redis_host
REDIS_PORT=6379
REDIS_PASSWORD=tu_redis_pass
```

> **Nota sobre Stripe:** configurar estas variables NO habilita pagos reales.
> `services/paymentGatewayService.js` es actualmente un mock (`isConfigured()`
> devuelve `false` de forma fija y ningún método llama a un proveedor real).
> `check-production-readiness.js` ya no reporta "Stripe listo" solo por la
> presencia de las keys — ver P6-1 en el plan de remediación para la integración real.

Ver también `backend/env.example` para la lista completa de variables
(incluye `PGUSER`/`PGPASSWORD`/`PGHOST`/`PGPORT`, usadas solo por
`scripts/setup-local-db.js` al crear una base de datos PostgreSQL local).

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

## 🌐 **Opciones de Hosting**

> **Nota:** el host real en uso actualmente es **Render** (ver `DATABASE_URL` de
> ejemplo y el dominio `*.onrender.com` referenciado en `netlify.toml`). Railway
> no está en uso — se deja como alternativa documentada solamente.

### **Backend (API):**
1. **Render.com** ⭐ (En uso actualmente)
   - Plan gratuito disponible
   - Fácil configuración
   - Host real del backend de este proyecto

2. **Railway.app** (alternativa, no usada actualmente)
   - Gratuito hasta $5/mes
   - Deploy automático desde GitHub

### **Base de Datos:**
1. **PostgreSQL en Render** ⭐ (En uso actualmente)
   - Base de datos relacional robusta
   - Usada con Prisma; el esquema se aplica con `prisma migrate deploy`

### **Frontend:**
1. **Vercel** ⭐ (Ver nota de topología arriba — a confirmar como canónico)
   - Gratuito para proyectos personales
   - Deploy automático

2. **Netlify** (configuración presente en el repo, pendiente de confirmar si sigue vigente — ver "Topología de despliegue" arriba)

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

### **Error de conexión a PostgreSQL**
- ❌ **Crítico** - el sistema no funcionará
- 🔧 Verificar DATABASE_URL
- 🔧 Verificar que PostgreSQL permite conexiones

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