# Análisis de Bugs - Migración MongoDB → PostgreSQL

## Resumen

Este documento describe los errores encontrados durante el análisis de la aplicación tras la migración de MongoDB a PostgreSQL, y las correcciones aplicadas.

---

## Bugs críticos corregidos

### 1. Excepciones: propiedades inexistentes (MongoDB virtuals)

**Archivos:** `backend/routes/public.js`, `backend/routes/schedules.js`

**Problema:** El código usaba `ex.isDayOff`, `ex.hasSpecialHours` y `ex.typeDescription`, que son propiedades virtuales de Mongoose que no existen en Prisma/PostgreSQL.

**Solución:** Se implementaron helpers basados en `exceptionType`:
- `isDayOffType()` – verifica si es DAY_OFF, VACATION o HOLIDAY
- `hasSpecialHours()` – verifica exceptionType === 'SPECIAL_HOURS'
- `getExceptionTypeLabel()` – devuelve la etiqueta legible del tipo

### 2. Descansos: método `appliesOnDay` inexistente

**Archivos:** `backend/routes/public.js`, `backend/routes/schedules.js`

**Problema:** Se usaba `breakItem.appliesOnDay()` (método virtual de Mongoose) que no existe en los datos de Prisma.

**Solución:** Se creó `breakAppliesOnDay(breakItem, dayOfWeek)` que:
- Con `DAILY`: siempre aplica
- Con `SPECIFIC_DAYS`: comprueba `specificDays.includes(dayOfWeek)`
- Con `WEEKLY`: aplica en schedules (para días laborables)

### 3. Comparación de `recurrenceType` y `exceptionType` en mayúsculas

**Archivos:** `backend/routes/public.js`

**Problema:** Se comparaba con `'day_off'`, `'daily'`, etc., pero Prisma guarda enums en mayúsculas (`DAY_OFF`, `DAILY`).

**Solución:** Uso de `String(type).toUpperCase()` en las comparaciones para ser independiente del formato.

### 4. Filtro de descansos en ruta `/availability`

**Archivo:** `backend/routes/public.js`

**Problema:** Se cargaban todos los descansos sin filtrar por recurrencia ni por `isActive`.

**Solución:** Filtrado por `isActive: true` y por día de la semana según `recurrenceType` y `specificDays`.

### 5. Excepciones sin filtro `isActive`

**Archivo:** `backend/routes/public.js`

**Problema:** Al verificar excepciones no se filtraba por `isActive: true`.

**Solución:** Se añadió `isActive: true` en las consultas de excepciones.

---

## Bugs de compatibilidad id/_id (PostgreSQL vs MongoDB)

### 6. Frontend usaba solo `_id`

**Archivos afectados:**
- `frontend/src/app/dashboard/services/page.js` – edición/eliminación de servicios
- `frontend/src/app/dashboard/page.js` – lista de citas de hoy
- `frontend/src/app/dashboard/schedules/page.js` – descansos y excepciones (ya corregido antes)
- `frontend/src/app/dashboard/appointments/page.js` – citas (ya usa `id || _id`)
- `frontend/src/app/[usuario]/page.js` – galería y servicios públicos
- `frontend/src/app/[usuario]/book/page.js` – selección de servicio y reserva
- `frontend/src/components/PublicGallery.js` – imágenes de galería
- `frontend/src/components/GalleryManager.js` – ya usa `id || _id`
- `frontend/src/utils/useSalonData.js` – disponibilidad por servicio

**Problema:** PostgreSQL/Prisma devuelve `id`; MongoDB devuelve `_id`. El frontend asumía `_id`.

**Solución:** Uso consistente de `id || _id` en keys, comparaciones y llamadas a la API. La API pública sigue devolviendo `_id` para compatibilidad.

---

## Comportamiento esperado tras las correcciones

| Funcionalidad                    | Antes                              | Después                                         |
|----------------------------------|-------------------------------------|-------------------------------------------------|
| Excepciones de horario           | No detectaba días libres            | Detecta DAY_OFF, VACATION, HOLIDAY              |
| Horarios especiales              | No aplicaba cambios de horario      | Aplica SPECIAL_HOURS correctamente              |
| Descansos recurrentes            | No filtraba por día                 | Filtra por DAILY y SPECIFIC_DAYS                |
| Eliminar descanso                | Error 404 (undefined)               | Usa `id` correctamente                          |
| Editar/eliminar servicio         | Fallos con id undefined             | Usa `id || _id`                                 |
| Reserva pública                  | Riesgo de errores con id            | Usa `_id` o `id` según origen de datos          |

---

## APIs que mantienen compatibilidad _id

Las rutas siguientes siguen devolviendo `_id` para compatibilidad con el frontend:

- `GET /api/public/salon/:username` – services y gallery con `_id`
- `GET /api/public/salon/:username/services` – services con `_id`
- `GET /api/public/salon/:username/gallery` – images con `_id`
- `GET /api/services` – devuelve `_id: service.id` además de `id`

---

## Verificación recomendada

1. **Horarios y descansos:** crear descansos diarios y por días específicos y comprobar disponibilidad.
2. **Excepciones:** crear días libres y horarios especiales y validar el cálculo de slots.
3. **Servicios:** crear, editar y eliminar servicios en el dashboard.
4. **Reservas públicas:** flujo completo de reserva desde `/[usuario]/book`.
5. **Galería:** subir, reordenar y eliminar imágenes.
