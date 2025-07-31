# 🔄 Referencias a MongoDB - Pendientes de Actualización

## 📋 Resumen

Este documento lista todas las referencias a **MongoDB** que aún existen en el proyecto pero que ya no se usan, ya que se migró a **PostgreSQL** con Prisma. Estas referencias deben ser actualizadas o removidas en futuras actualizaciones del proyecto.

---

## 📁 Archivos con Referencias a MongoDB

### **1. README.md**
**Ubicación**: `/README.md`
**Referencias encontradas**:
- Línea 9: `├── backend/           # Node.js + Express + MongoDB`
- Línea 17: `- **Backend**: Node.js, Express, MongoDB`
- Línea 85: `MONGODB_URI=mongodb://localhost:27017/reservas`
- Línea 102: `- MongoDB/Mongoose`

**Estado**: ❌ **Necesita actualización**

### **2. PORTAFOLIO-PROYECTO.md**
**Ubicación**: `/PORTAFOLIO-PROYECTO.md`
**Referencias encontradas**:
- Línea 39: `- **MongoDB Atlas** para base de datos en la nube`

**Estado**: ❌ **Necesita actualización**

### **3. docs/DESARROLLO.md**
**Ubicación**: `/docs/DESARROLLO.md`
**Referencias encontradas**:
- Línea 6: `- MongoDB (local o Atlas)`
- Línea 66: `│   ├── models/             # Modelos de MongoDB`
- Línea 104: `- **MongoDB + Mongoose** - Base de datos`
- Línea 124: `MONGODB_URI=mongodb://localhost:27017/reservas`
- Línea 165: `3. Conectar base de datos MongoDB Atlas`

**Estado**: ❌ **Necesita actualización**

### **4. backend/package.json**
**Ubicación**: `/backend/package.json`
**Referencias encontradas**:
- Línea 26: `"mongodb"` (dependencia)

**Estado**: ❌ **Necesita remover dependencia**

### **5. backend/PRODUCTION-SETUP.md**
**Ubicación**: `/backend/PRODUCTION-SETUP.md`
**Referencias encontradas**:
- Línea 6: `- ✅ Base de datos MongoDB`
- Línea 27: `MONGODB_URI=tu_uri_de_mongodb_produccion`
- Línea 152: `1. **MongoDB Atlas** ⭐ (Recomendado)`
- Líneas 234-237: Sección de errores de MongoDB

**Estado**: ❌ **Necesita actualización**

### **6. backend/CONFIGURAR-EMAILS.md**
**Ubicación**: `/backend/CONFIGURAR-EMAILS.md`
**Referencias encontradas**:
- Línea 11: `MONGODB_URI=mongodb://localhost:27017/DB_reservas`

**Estado**: ❌ **Necesita actualización**

### **7. backend/setup-cloudinary.js**
**Ubicación**: `/backend/setup-cloudinary.js`
**Referencias encontradas**:
- Línea 192: `MONGODB_URI=mongodb://localhost:27017/DB_reservas`

**Estado**: ❌ **Necesita actualización**

---

## 🔧 Scripts de Desarrollo con Referencias a MongoDB

### **Scripts que aún usan MongoDB (para debugging/testing)**

#### **1. backend/test-db.js**
**Propósito**: Script de prueba de conexión a base de datos
**Referencias**:
- `const mongoose = require('mongoose')`
- `await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/reservas')`
- `const User = require('./models/User')`
- `const Service = require('./models/Service')`

**Estado**: ⚠️ **Script de desarrollo - considerar remover**

#### **2. backend/show-db-info.js**
**Propósito**: Mostrar información de la base de datos
**Referencias**:
- `const mongoose = require('mongoose')`
- `const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/reservas'`
- `const User = require('./models/User')`
- `const Service = require('./models/Service')`

**Estado**: ⚠️ **Script de desarrollo - considerar remover**

#### **3. backend/check-user.js**
**Propósito**: Verificar usuario en la base de datos
**Referencias**:
- `const mongoose = require('mongoose')`
- `await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/reservas')`
- `const User = require('./models/User')`

**Estado**: ⚠️ **Script de desarrollo - considerar remover**

#### **4. backend/debug-schedule.js**
**Propósito**: Debug de horarios
**Referencias**:
- `const mongoose = require('mongoose')`
- `await mongoose.connect('mongodb://localhost:27017/DB_reservas')`
- `const BusinessHours = require('./models/BusinessHours')`
- `const User = require('./models/User')`

**Estado**: ⚠️ **Script de desarrollo - considerar remover**

#### **5. backend/check-production-readiness.js**
**Propósito**: Verificar configuración para producción
**Referencias**:
- `const mongoose = require('mongoose')`
- Verificación de `MONGODB_URI`
- `await mongoose.connect(process.env.MONGODB_URI)`
- `const User = require('./models/User')`

**Estado**: ❌ **Necesita actualización para PostgreSQL**

---

## 📂 Directorio de Modelos

### **backend/models/**
**Estado**: 📁 **Directorio vacío**
**Nota**: Los modelos de MongoDB fueron reemplazados por el schema de Prisma en `/backend/prisma/schema.prisma`

---

## 🔄 Plan de Actualización

### **Prioridad Alta (Documentación Principal)**
1. **README.md** - Actualizar stack tecnológico
2. **PORTAFOLIO-PROYECTO.md** - Cambiar MongoDB Atlas por PostgreSQL
3. **docs/DESARROLLO.md** - Actualizar documentación de desarrollo
4. **backend/PRODUCTION-SETUP.md** - Actualizar configuración de producción

### **Prioridad Media (Scripts de Desarrollo)**
1. **backend/check-production-readiness.js** - Actualizar para PostgreSQL
2. **backend/package.json** - Remover dependencia de mongodb
3. **backend/CONFIGURAR-EMAILS.md** - Actualizar variables de entorno
4. **backend/setup-cloudinary.js** - Actualizar variables de entorno

### **Prioridad Baja (Scripts de Debug)**
1. **backend/test-db.js** - Considerar remover o actualizar
2. **backend/show-db-info.js** - Considerar remover o actualizar
3. **backend/check-user.js** - Considerar remover o actualizar
4. **backend/debug-schedule.js** - Considerar remover o actualizar

---

## 📝 Cambios Específicos Necesarios

### **Variables de Entorno**
**Cambiar**:
```bash
MONGODB_URI=mongodb://localhost:27017/reservas
```

**Por**:
```bash
DATABASE_URL=postgresql://username:password@localhost:5432/reservas
```

### **Dependencias**
**Remover de package.json**:
```json
"mongodb": "^x.x.x"
```

### **Documentación**
**Actualizar referencias de**:
- "MongoDB + Mongoose" → "PostgreSQL + Prisma"
- "MongoDB Atlas" → "PostgreSQL (Railway/Render)"
- "Modelos de MongoDB" → "Schema de Prisma"

---

## ⚠️ Notas Importantes

1. **Los scripts de debug** (`test-db.js`, `show-db-info.js`, etc.) pueden ser útiles para desarrollo, pero necesitan ser actualizados para usar Prisma en lugar de Mongoose.

2. **La migración ya está completa** - el sistema funciona con PostgreSQL, estas son solo referencias documentales.

3. **Antes de remover scripts**, verificar si son útiles para debugging o testing.

4. **Actualizar documentación** es prioritario para evitar confusión en futuros desarrolladores.

---

## 🎯 Estado Actual del Proyecto

- ✅ **Base de datos**: PostgreSQL con Prisma (funcionando)
- ✅ **API**: Funcionando con PostgreSQL
- ✅ **Frontend**: Conectado correctamente
- ❌ **Documentación**: Necesita actualización
- ⚠️ **Scripts de debug**: Necesitan actualización o remoción

---

*Este documento debe ser consultado antes de hacer cambios en el proyecto para asegurar que todas las referencias a MongoDB sean actualizadas apropiadamente.* 