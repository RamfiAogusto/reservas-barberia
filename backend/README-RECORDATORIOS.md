# 📅 Sistema de Recordatorios Automáticos

## ✨ **Características**

- ⏰ **Recordatorios automáticos** enviados **2 horas antes** de cada cita
- 🚀 **Sistema de colas profesional** usando BullMQ + Redis
- 📧 **Emails profesionales** con plantillas HTML
- 🔄 **Gestión inteligente** de cancelaciones
- 🛡️ **Tolerante a fallos** - no afecta la funcionalidad principal

---

## 🎯 **Funcionamiento**

### **1. Creación de Cita**
Cuando se crea una nueva cita (desde dashboard o booking público):
1. ✅ Se guarda la cita en la base de datos
2. ✅ Se envía email de confirmación inmediato
3. ✅ **Se programa recordatorio automático para 2 horas antes**

### **2. Envío de Recordatorio**
El sistema automáticamente:
1. 📅 Calcula cuándo enviar (2 horas antes de la cita)
2. ⏱️ Programa el job en la cola
3. 📧 Envía el email en el momento exacto
4. ✅ Marca `reminderSent: true` en la base de datos

### **3. Cancelación de Cita**
Si se cancela una cita:
1. 🗑️ **Se cancela automáticamente el recordatorio programado**
2. 📧 Se envía email de cancelación

---

## 🏗️ **Arquitectura Técnica**

### **Componentes Principales**

```
📁 services/
  └── queueService.js     # Gestión de colas y workers
📁 routes/
  ├── appointments.js     # Integración en rutas privadas
  └── public.js          # Integración en rutas públicas
```

### **Stack Tecnológico**
- **BullMQ**: Sistema de colas avanzado
- **Redis**: Base de datos en memoria para colas
- **ioredis**: Cliente Redis para Node.js
- **date-fns**: Manejo de fechas y horarios

---

## ⚙️ **Configuración**

### **1. Instalar Redis**

**En Windows (usando Chocolatey):**
```bash
choco install redis-64
redis-server
```

**En macOS (usando Homebrew):**
```bash
brew install redis
brew services start redis
```

**En Ubuntu/Debian:**
```bash
sudo apt update
sudo apt install redis-server
sudo systemctl start redis-server
```

**Con Docker:**
```bash
docker run -d --name redis -p 6379:6379 redis:alpine
```

### **2. Variables de Entorno**

Agregar al archivo `.env`:
```bash
# Redis Configuration (para sistema de colas)
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
```

### **3. Verificar Instalación**

```bash
# Probar conexión a Redis
redis-cli ping
# Debe responder: PONG
```

---

## 🚀 **Uso del Sistema**

### **Creación Automática**
Los recordatorios se programan automáticamente al crear citas:

```javascript
// ✅ Automático - NO requiere código adicional
// Se ejecuta al crear citas desde:
// - Dashboard (/api/appointments)
// - Booking público (/api/public/book)
```

### **Gestión Manual (Opcional)**

```javascript
const queueService = require('./services/queueService');

// Programar recordatorio manualmente
await queueService.scheduleReminder({
  appointmentId: 'appointment_id',
  appointmentDate: '2025-01-15',
  appointmentTime: '14:30',
  clientEmail: 'cliente@email.com',
  clientName: 'Juan Pérez'
});

// Cancelar recordatorio
await queueService.cancelReminder('appointment_id');

// Verificar estado del sistema
const status = queueService.getStatus();
console.log(status);
```

---

## 📧 **Plantilla de Email**

### **Contenido del Recordatorio**
- 🎯 **Recordatorio personalizado** con datos de la cita
- 📍 **Información del salón** (dirección, teléfono)
- ⚠️ **Políticas de no-show** claramente visibles
- 🎨 **Diseño profesional** en HTML

### **Datos Incluidos**
```javascript
{
  clientName: "Juan Pérez",
  salonName: "Barbería Elite",
  serviceName: "Corte + Barba",
  date: "viernes, 15 de enero de 2025",
  time: "14:30",
  salonAddress: "Av. Principal 123",
  salonPhone: "55 1234 5678"
}
```

---

## 🔍 **Logs y Monitoreo**

### **Logs del Sistema**
```bash
# Inicio del sistema
🚀 Inicializando sistema de colas...
✅ Conectado a Redis
✅ Cola de recordatorios creada
🎉 Sistema de colas inicializado exitosamente

# Programación de recordatorios
📅 Recordatorio programado para Juan Pérez:
   Cita: 15/1/2025 14:30:00
   Recordatorio: 15/1/2025 12:30:00
   Job ID: reminder-appointment_id

# Envío de recordatorios
📧 Procesando recordatorio para cita: appointment_id
✅ Recordatorio enviado exitosamente para Juan Pérez

# Cancelaciones
🗑️ Recordatorio cancelado para cita: appointment_id
```

### **Verificar Estado**
```javascript
const status = queueService.getStatus();
/*
{
  initialized: true,
  redisAvailable: true,
  queueActive: true,
  workerActive: true
}
*/
```

---

## ⚠️ **Manejo de Errores**

### **Sin Redis**
Si Redis no está disponible:
- ✅ **El sistema principal sigue funcionando**
- ⚠️ Los recordatorios no se programan
- 📝 Se muestran warnings informativos

### **Errores de Email**
Si falla el envío de recordatorios:
- ✅ **No afecta otras funcionalidades**
- 📝 Se registra el error en logs
- 🔄 BullMQ reintenta automáticamente

### **Citas Muy Próximas**
Si la cita es en menos de 2 horas:
- ⚠️ **No se programa recordatorio**
- 📝 Log: "Cita muy próxima para recordatorio"

---

## 🧪 **Pruebas**

### **Crear Cita de Prueba**
```bash
# 1. Crear cita para 3 horas después
# 2. Verificar logs: "Recordatorio programado"
# 3. Esperar o avanzar tiempo en Redis
# 4. Verificar email recibido
```

### **Cancelar Cita**
```bash
# 1. Cancelar cita desde dashboard
# 2. Verificar logs: "Recordatorio cancelado"
# 3. Confirmar que no llega recordatorio
```

---

## 🎛️ **Configuración Avanzada**

### **Cambiar Tiempo de Recordatorio**
Editar en `services/queueService.js`:
```javascript
// Cambiar de 2 horas a 1 hora
const reminderTime = new Date(appointmentDateTime.getTime() - (1 * 60 * 60 * 1000));

// Cambiar a 30 minutos
const reminderTime = new Date(appointmentDateTime.getTime() - (30 * 60 * 1000));
```

### **Configurar Múltiples Recordatorios**
```javascript
// Recordatorio 24 horas antes
const reminder24h = new Date(appointmentDateTime.getTime() - (24 * 60 * 60 * 1000));

// Recordatorio 2 horas antes  
const reminder2h = new Date(appointmentDateTime.getTime() - (2 * 60 * 60 * 1000));
```

---

## 🔧 **Troubleshooting**

### **Redis No Conecta**
```bash
# Verificar que Redis esté corriendo
redis-cli ping

# Si no responde, iniciar Redis
redis-server

# En Windows (como servicio)
net start redis
```

### **Jobs No Se Procesan**
```bash
# Verificar worker activo
console.log(queueService.getStatus());

# Reiniciar servidor Node.js
npm run dev
```

### **Emails No Llegan**
- ✅ Verificar configuración de Resend
- ✅ Revisar logs de emailService
- ✅ Confirmar que `reminderSent: false` en BD

---

## 📈 **Beneficios del Sistema**

### **Para el Negocio**
- ⬇️ **Reduce no-shows** significativamente
- 📞 **Menos llamadas** de confirmación manual
- 🎯 **Mejora la experiencia** del cliente
- 💰 **Aumenta ingresos** por mayor asistencia

### **Para los Clientes**
- 📧 **Recordatorios automáticos** sin olvidar citas
- 📍 **Información completa** del salón y cita
- ⚠️ **Políticas claras** de cancelación

### **Técnico**
- 🚀 **Altamente escalable** (BullMQ + Redis)
- 🛡️ **Tolerante a fallos** y errores
- 📊 **Monitoreo completo** con logs detallados
- 🔄 **Reintentos automáticos** en caso de fallas

---

## 📋 **Estado Actual**

### ✅ **Implementado**
- [x] Sistema de colas con BullMQ + Redis
- [x] Programación automática de recordatorios
- [x] Envío 2 horas antes de la cita
- [x] Cancelación automática de recordatorios
- [x] Integración en rutas privadas y públicas
- [x] Manejo de errores y logs detallados
- [x] Plantillas de email profesionales

### 🚀 **Listo para Producción**
El sistema está completamente funcional y listo para usar en producción con Redis configurado.

---

*💡 **Nota**: Sin Redis, el sistema principal funciona normalmente pero sin recordatorios automáticos.* 