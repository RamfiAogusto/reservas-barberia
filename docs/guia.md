Perfecto, aquí está la estructura ajustada según tus modificaciones:

## **MVP - SISTEMA DE CITAS WEB (AJUSTADO)**

### **1. ARQUITECTURA DE URLs** (Sin cambios)
```
- midominio.com/ → Landing page
- midominio.com/login → Acceso general
- midominio.com/register → Registro general
- midominio.com/[usuario] → Perfil público del salón
- midominio.com/[usuario]/book → Reservar cita (público)
- midominio.com/dashboard → Panel privado (si estás logueado)
```

### **2. FUNCIONALIDADES CORE AJUSTADAS**

#### **A. Perfil Público del Salón (`/[usuario]`) - SIMPLIFICADO**
- **Header**: Logo, nombre, descripción corta
- **Servicios**: Lista con precios y duración
- **Equipo**: Estilistas disponibles (nombres y especialidades)
- **Información**: Dirección, teléfono, horarios
- **Botón CTA**: "Reservar Cita" → lleva a `/[usuario]/book`

#### **B. Sistema de Reservas (`/[usuario]/book`) - CON PAGO OBLIGATORIO**
- **Paso 1**: Seleccionar servicio(s)
- **Paso 2**: Elegir estilista (opcional: "Sin preferencia")
- **Paso 3**: Calendario con slots disponibles
- **Paso 4**: Datos del cliente (nombre, teléfono, email)
- **Paso 5**: **PAGO OBLIGATORIO** para confirmar la reserva
  - Integración con Stripe/PayPal
  - Mensaje claro: "El pago garantiza tu cita. Si no asistes, el establecimiento retiene el monto"
  - Política de no-show visible

#### **C. Dashboard Privado (`/dashboard`)**
- **Vista Calendario**: Citas del día/semana/mes
- **Gestión de Citas**: Ver detalles, marcar como completada, cancelar
- **Clientes**: Lista básica con historial
- **Servicios**: CRUD de servicios y precios con **opción de cobro por reserva**
- **Configuración Avanzada de Horarios**: (detallada abajo)
- **Perfil Público**: Preview y edición de su página `/[usuario]`

### **3. SISTEMA AVANZADO DE CONFIGURACIÓN DE HORARIOS**

#### **A. Horarios Base Semanales**
```
Configuración por cada día de la semana:
- Lunes: 9:00 AM - 6:00 PM
- Martes: 9:00 AM - 6:00 PM  
- Miércoles: CERRADO
- Jueves: 9:00 AM - 6:00 PM
- Viernes: 9:00 AM - 8:00 PM
- Sábado: 8:00 AM - 5:00 PM
- Domingo: CERRADO
```

#### **B. Descansos Recurrentes**
```
Tipos de descansos:
1. **Diarios**: Se repiten todos los días laborales
   - Ejemplo: Almuerzo 1:00 PM - 2:00 PM (Lunes a Sábado)
   
2. **Por día específico**: Se repiten cada semana en ese día
   - Ejemplo: Miércoles 3:00 PM - 4:00 PM (solo miércoles)
   
3. **Personalizados**: Rangos específicos en días específicos
   - Ejemplo: Viernes 12:00 PM - 1:30 PM
```

#### **C. Días Libres y Excepciones**
```
1. **Días libres recurrentes**:
   - Todos los lunes
   - Primer domingo de cada mes
   - Último viernes de cada mes

2. **Fechas específicas**:
   - 25 de diciembre de 2025
   - 1 de enero de 2026
   - Vacaciones: Del 15/07/2025 al 30/07/2025

3. **Horarios especiales por fecha**:
   - 24 de diciembre: 9:00 AM - 2:00 PM (en lugar del horario normal)
```

### **4. BASE DE DATOS AJUSTADA**

#### **Tablas Principales:**
```sql
Users (propietarios)
- id, username, email, password, salon_name, phone, address

Services 
- id, user_id, name, price, duration, description, requires_payment

Staff
- id, user_id, name, specialties

Appointments
- id, user_id, client_name, client_email, client_phone, 
  service_id, staff_id, date, time, status, payment_id, amount_paid

Business_Hours (horarios base)
- id, user_id, day_of_week, start_time, end_time, is_active

Recurring_Breaks (descansos recurrentes)
- id, user_id, name, start_time, end_time, recurrence_type, 
  specific_days, is_active

Schedule_Exceptions (excepciones y días libres)
- id, user_id, date, exception_type, start_time, end_time, 
  reason, is_recurring

Payments
- id, appointment_id, amount, currency, payment_method, 
  payment_intent_id, status, created_at
```

### **5. CONFIGURACIÓN DE HORARIOS EN DASHBOARD**

#### **Interfaz de Configuración:**

**Sección 1: Horarios Base**
```
┌─ HORARIOS SEMANALES ─────────────────┐
│ ☑ Lunes    [09:00] a [18:00]        │
│ ☑ Martes   [09:00] a [18:00]        │
│ ☐ Miércoles CERRADO                  │
│ ☑ Jueves   [09:00] a [18:00]        │
│ ☑ Viernes  [09:00] a [20:00]        │
│ ☑ Sábado   [08:00] a [17:00]        │
│ ☐ Domingo  CERRADO                   │
└──────────────────────────────────────┘
```

**Sección 2: Descansos**
```
┌─ DESCANSOS RECURRENTES ──────────────┐
│ + Agregar Descanso                   │
│                                      │
│ 📅 Almuerzo                         │
│   Todos los días: 13:00 - 14:00     │
│   [Editar] [Eliminar]               │
│                                      │
│ 📅 Descanso Miércoles               │
│   Solo miércoles: 15:00 - 16:00     │
│   [Editar] [Eliminar]               │
└──────────────────────────────────────┘
```

**Sección 3: Excepciones**
```
┌─ DÍAS LIBRES Y EXCEPCIONES ──────────┐
│ + Agregar Excepción                  │
│                                      │
│ 🚫 Vacaciones de Verano             │
│   15/07/2025 - 30/07/2025           │
│   [Editar] [Eliminar]               │
│                                      │
│ 🚫 Todos los lunes                  │
│   Recurrente semanal                 │
│   [Editar] [Eliminar]               │
│                                      │
│ ⏰ Navidad (horario especial)        │
│   24/12/2025: 09:00 - 14:00         │
│   [Editar] [Eliminar]               │
└──────────────────────────────────────┘
```

### **6. LÓGICA DE DISPONIBILIDAD**

#### **Motor de Cálculo de Slots:**
```javascript
function calculateAvailableSlots(date, serviceId, staffId) {
  1. Obtener horario base para ese día de la semana
  2. Verificar si hay excepciones para esa fecha específica
  3. Aplicar descansos recurrentes
  4. Restar citas ya reservadas
  5. Considerar duración del servicio
  6. Aplicar tiempo de preparación entre citas
  7. Retornar slots disponibles
}
```

### **7. GESTIÓN DE SERVICIOS CON PAGO**

#### **Configuración de Servicios:**
```
┌─ SERVICIO: CORTE CLÁSICO ────────────┐
│ Precio: $25.00                       │
│ Duración: 30 minutos                 │
│                                      │
│ ☑ Requiere pago para reservar        │
│ └─ Monto de reserva: $10.00          │
│    💡 El cliente paga $10 al reservar│
│       y $15 restantes al llegar      │
│                                      │
│ Política de no-show:                 │
│ "Si no asistes, pierdes los $10"     │
└──────────────────────────────────────┘
```

### **8. FLUJO DE PAGO INTEGRADO**

#### **Proceso de Reserva con Pago:**
1. Cliente selecciona servicio
2. Ve el monto de reserva requerido
3. Acepta términos y condiciones
4. Ingresa datos de pago (Stripe)
5. Pago procesado → Cita confirmada automáticamente
6. Emails de confirmación enviados

### **9. SIN MONETIZACIÓN (GRATUITO)**
- Uso completamente gratuito
- Sin límites de citas o servicios
- Todas las funcionalidades disponibles
- Enfoque en crecimiento de usuarios

### **10. STACK TECNOLÓGICO AJUSTADO**

#### **Adicionales necesarios:**
- **Stripe API** (procesamiento de pagos)
- **Webhook handlers** (confirmación de pagos)
- **Date-fns** o **Moment.js** (manejo avanzado de fechas y recurrencias)

¿Te parece bien esta estructura ajustada? ¿Algún otro aspecto que quieras modificar o detallar más?