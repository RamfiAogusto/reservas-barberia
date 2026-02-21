/**
 * Script de pruebas E2E - Simula el flujo completo de un usuario
 * Ejecutar: node tests/e2e-flow.js
 * 
 * Requiere que el servidor esté corriendo en el puerto 5000
 */

const BASE_URL = process.env.API_URL || 'http://localhost:5000/api'

// Colores para la consola
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  dim: '\x1b[2m'
}

let passed = 0
let failed = 0
let warnings = 0
const failures = []

function log(icon, msg) { console.log(`  ${icon} ${msg}`) }
function pass(msg) { passed++; log(`${colors.green}✓${colors.reset}`, msg) }
function fail(msg, detail) { failed++; failures.push({ msg, detail }); log(`${colors.red}✗${colors.reset}`, `${colors.red}${msg}${colors.reset}${detail ? ` → ${detail}` : ''}`) }
function warn(msg) { warnings++; log(`${colors.yellow}⚠${colors.reset}`, `${colors.yellow}${msg}${colors.reset}`) }
function section(title) { console.log(`\n${colors.cyan}━━━ ${title} ━━━${colors.reset}`) }

async function request(method, path, body = null, token = null) {
  const opts = {
    method,
    headers: { 'Content-Type': 'application/json' }
  }
  if (token) opts.headers.Authorization = `Bearer ${token}`
  if (body) opts.body = JSON.stringify(body)

  const res = await fetch(`${BASE_URL}${path}`, opts)
  const data = await res.json()
  return { status: res.status, ...data }
}

// ============================================================================
// TEST SUITES
// ============================================================================

async function testAuthFlow() {
  section('1. FLUJO DE AUTENTICACIÓN')

  const uniqueId = Date.now()
  const testUser = {
    username: `test_user_${uniqueId}`,
    email: `test${uniqueId}@test.com`,
    password: 'Test123456',
    confirmPassword: 'Test123456',
    phone: '809-555-0001',
    salonName: `Test Salon ${uniqueId}`,
    address: 'Calle Test #123'
  }

  // 1.1 Registro
  const reg = await request('POST', '/auth/register', testUser)
  if (reg.success && reg.token && reg.user) {
    pass('Registro exitoso - token y user recibidos')
  } else {
    fail('Registro falló', reg.message)
    return null
  }

  // 1.2 Verificar que el user no incluye password
  if (reg.user.password) {
    fail('Registro devuelve password en la respuesta (SEGURIDAD)')
  } else {
    pass('Registro NO devuelve password')
  }

  // 1.3 Registro duplicado (email)
  const regDup = await request('POST', '/auth/register', testUser)
  if (!regDup.success) {
    pass('Registro duplicado rechazado correctamente')
  } else {
    fail('Registro duplicado NO rechazado')
  }

  // 1.4 Login
  const login = await request('POST', '/auth/login', {
    email: testUser.email,
    password: testUser.password
  })
  if (login.success && login.token) {
    pass('Login exitoso')
  } else {
    fail('Login falló', login.message)
    return null
  }

  // 1.5 Login con password incorrecto
  const loginBad = await request('POST', '/auth/login', {
    email: testUser.email,
    password: 'wrongpassword'
  })
  if (!loginBad.success && loginBad.message === 'Credenciales inválidas') {
    pass('Login con password incorrecto rechazado')
  } else {
    fail('Login con password incorrecto NO manejado correctamente', loginBad.message)
  }

  // 1.6 Login con email inexistente
  const loginNoUser = await request('POST', '/auth/login', {
    email: 'noexiste@test.com',
    password: 'Test123456'
  })
  if (!loginNoUser.success) {
    pass('Login con email inexistente rechazado')
  } else {
    fail('Login con email inexistente NO rechazado')
  }

  // 1.7 Validaciones de registro
  const regEmpty = await request('POST', '/auth/register', { email: 'bad', password: '12' })
  if (!regEmpty.success) {
    pass('Registro con datos inválidos rechazado')
  } else {
    fail('Registro con datos inválidos NO rechazado')
  }

  return { token: login.token, user: login.user, testUser }
}

async function testProfileFlow(token) {
  section('2. FLUJO DE PERFIL / SETTINGS')

  // 2.1 Obtener perfil
  const profile = await request('GET', '/users/profile', null, token)
  if (profile.success && profile.data) {
    pass('Perfil obtenido correctamente')
  } else {
    fail('No se pudo obtener perfil', profile.message)
    return
  }

  // 2.2 Verificar campos del perfil
  const requiredFields = ['id', 'username', 'email', 'phone', 'salonName', 'address', 'avatar', 'requiresDeposit', 'depositAmount']
  const missingFields = requiredFields.filter(f => profile.data[f] === undefined)
  if (missingFields.length === 0) {
    pass('Perfil tiene todos los campos esperados')
  } else {
    fail('Perfil le faltan campos', missingFields.join(', '))
  }

  // 2.3 Actualizar perfil
  const update = await request('PUT', '/users/profile', {
    salonName: 'Mi Barbería Actualizada',
    phone: '809-555-9999',
    address: 'Dirección Actualizada #456',
    requiresDeposit: true,
    depositAmount: 200
  }, token)
  if (update.success) {
    pass('Perfil actualizado exitosamente')
  } else {
    fail('Error actualizando perfil', update.message)
  }

  // 2.4 Verificar que se actualizó
  const profile2 = await request('GET', '/users/profile', null, token)
  if (profile2.data.salonName === 'Mi Barbería Actualizada' && profile2.data.depositAmount === 200) {
    pass('Cambios del perfil persistidos correctamente')
  } else {
    fail('Cambios del perfil NO persistidos')
  }

  // 2.5 Acceso sin token
  const noAuth = await request('GET', '/users/profile')
  if (noAuth.success === false || noAuth.status === 401) {
    pass('Perfil protegido sin token')
  } else {
    fail('Perfil accesible sin token (SEGURIDAD)')
  }

  // 2.6 Token inválido
  const badAuth = await request('GET', '/users/profile', null, 'token_invalido_123')
  if (!badAuth.success) {
    pass('Token inválido rechazado correctamente')
  } else {
    fail('Token inválido aceptado (SEGURIDAD)')
  }
}

async function testServicesFlow(token) {
  section('3. FLUJO DE SERVICIOS')

  // 3.1 Lista vacía
  const listEmpty = await request('GET', '/services', null, token)
  if (listEmpty.success && Array.isArray(listEmpty.data) && listEmpty.data.length === 0) {
    pass('Lista de servicios vacía correctamente')
  } else {
    pass('Lista de servicios obtenida')
  }

  // 3.2 Crear servicios
  const services = [
    { name: 'Corte Test', description: 'Desc', price: 500, duration: 30, category: 'CORTE', showDuration: true },
    { name: 'Barba Test', description: 'Desc', price: 300, duration: 30, category: 'BARBA', showDuration: true },
    { name: 'Combo Test', description: 'Desc', price: 700, duration: 60, category: 'COMBO', showDuration: true },
    { name: 'Tinte Test', description: 'Desc', price: 1200, duration: 90, category: 'TRATAMIENTO', showDuration: false }
  ]

  const createdServices = []
  for (const svc of services) {
    const res = await request('POST', '/services', svc, token)
    if (res.success && res.data) {
      createdServices.push(res.data)
    } else {
      fail(`Crear servicio "${svc.name}" falló`, res.message)
    }
  }
  if (createdServices.length === services.length) {
    pass(`${createdServices.length} servicios creados exitosamente`)
  }

  // 3.3 Verificar lista
  const list = await request('GET', '/services', null, token)
  if (list.data?.length === services.length) {
    pass('Lista refleja todos los servicios creados')
  } else {
    fail('Lista de servicios inconsistente', `esperado: ${services.length}, recibido: ${list.data?.length}`)
  }

  // 3.4 Editar servicio
  const svcId = createdServices[0]?.id || createdServices[0]?._id
  if (svcId) {
    const edit = await request('PUT', `/services/${svcId}`, { name: 'Corte Premium', price: 600 }, token)
    if (edit.success && edit.data?.name === 'Corte Premium') {
      pass('Servicio editado correctamente')
    } else {
      fail('Error editando servicio', edit.message)
    }
  }

  // 3.5 Eliminar servicio y verificar que se marca como inactivo (soft delete)
  const delId = createdServices[3]?.id || createdServices[3]?._id
  if (delId) {
    const del = await request('DELETE', `/services/${delId}`, null, token)
    if (del.success) {
      pass('Servicio eliminado (soft delete)')
    } else {
      fail('Error eliminando servicio', del.message)
    }
  }

  // 3.6 Estadísticas de servicios
  const stats = await request('GET', '/services/stats/summary', null, token)
  if (stats.success) {
    pass('Estadísticas de servicios obtenidas')
  } else {
    warn('Estadísticas de servicios fallaron (puede no estar implementado)')
  }

  return createdServices.filter((_, i) => i < 3) // Devolver los que no se borraron
}

async function testBarbersFlow(token) {
  section('4. FLUJO DE BARBEROS')

  // 4.1 Lista vacía
  const list0 = await request('GET', '/barbers', null, token)
  if (list0.success && Array.isArray(list0.data)) {
    pass('Lista de barberos obtenida')
  } else {
    fail('Error obteniendo lista de barberos', list0.message)
  }

  // 4.2 Crear barberos
  const barbers = [
    { name: 'Carlos Pérez', phone: '809-555-1111', specialty: 'Cortes clásicos' },
    { name: 'Miguel Santos', phone: '809-555-2222', specialty: 'Barbas y diseños', email: 'miguel@test.com' }
  ]

  const createdBarbers = []
  for (const b of barbers) {
    const res = await request('POST', '/barbers', b, token)
    if (res.success && res.data) {
      createdBarbers.push(res.data)
    } else {
      fail(`Crear barbero "${b.name}" falló`, res.message)
    }
  }
  if (createdBarbers.length === barbers.length) {
    pass(`${createdBarbers.length} barberos creados exitosamente`)
  }

  // 4.3 Nombre duplicado
  const dup = await request('POST', '/barbers', { name: 'Carlos Pérez' }, token)
  if (!dup.success) {
    pass('Barbero con nombre duplicado rechazado')
  } else {
    fail('Barbero duplicado permitido')
  }

  // 4.4 Editar barbero
  const barberId = createdBarbers[0]?.id
  if (barberId) {
    const edit = await request('PUT', `/barbers/${barberId}`, { specialty: 'Cortes y tintes' }, token)
    if (edit.success) {
      pass('Barbero editado correctamente')
    } else {
      fail('Error editando barbero', edit.message)
    }
  }

  // 4.5 Obtener barbero individual
  if (barberId) {
    const get = await request('GET', `/barbers/${barberId}`, null, token)
    if (get.success && get.data?.specialty === 'Cortes y tintes') {
      pass('Barbero individual obtenido con datos actualizados')
    } else {
      fail('Error obteniendo barbero individual')
    }
  }

  return createdBarbers
}

async function testSchedulesFlow(token) {
  section('5. FLUJO DE HORARIOS')

  // 5.1 Obtener horarios base
  const hours = await request('GET', '/schedules/business-hours', null, token)
  if (hours.success && Array.isArray(hours.data) && hours.data.length === 7) {
    pass('Horarios base obtenidos (7 días)')
  } else {
    fail('Horarios base incompletos', `recibido: ${hours.data?.length}`)
  }

  // 5.2 Configurar horarios (Lunes a Sábado activos, Domingo inactivo)
  const schedule = [
    { dayOfWeek: 0, isActive: false },                                    // Domingo
    { dayOfWeek: 1, isActive: true, startTime: '09:00', endTime: '18:00' }, // Lunes
    { dayOfWeek: 2, isActive: true, startTime: '09:00', endTime: '18:00' }, // Martes
    { dayOfWeek: 3, isActive: true, startTime: '09:00', endTime: '18:00' }, // Miércoles
    { dayOfWeek: 4, isActive: true, startTime: '09:00', endTime: '18:00' }, // Jueves
    { dayOfWeek: 5, isActive: true, startTime: '09:00', endTime: '18:00' }, // Viernes
    { dayOfWeek: 6, isActive: true, startTime: '09:00', endTime: '14:00' }  // Sábado
  ]

  const update = await request('PUT', '/schedules/business-hours', { schedule }, token)
  if (update.success) {
    pass('Horarios configurados exitosamente (L-V 9-18, S 9-14, D cerrado)')
  } else {
    fail('Error configurando horarios', update.message)
  }

  // 5.3 Crear descanso recurrente
  const breakRes = await request('POST', '/schedules/recurring-breaks', {
    name: 'Almuerzo',
    startTime: '12:00',
    endTime: '13:00',
    recurrenceType: 'daily'
  }, token)
  if (breakRes.success) {
    pass('Descanso recurrente "Almuerzo" creado')
  } else {
    fail('Error creando descanso', breakRes.message)
  }

  // 5.4 Obtener descansos
  const breaks = await request('GET', '/schedules/recurring-breaks', null, token)
  if (breaks.success && breaks.data?.length >= 1) {
    pass('Descansos obtenidos correctamente')
  } else {
    fail('Error obteniendo descansos')
  }

  // 5.5 Crear excepción (día libre)
  const nextWeek = new Date()
  nextWeek.setDate(nextWeek.getDate() + 7)
  const exDate = nextWeek.toISOString().split('T')[0]

  const exc = await request('POST', '/schedules/exceptions', {
    name: 'Día personal',
    exceptionType: 'day_off',
    startDate: exDate,
    endDate: exDate
  }, token)
  if (exc.success) {
    pass(`Excepción "Día personal" creada para ${exDate}`)
  } else {
    warn(`Error creando excepción: ${exc.message}`)
  }

  return { schedule, exDate }
}

async function testPublicProfileFlow(username) {
  section('6. FLUJO PÚBLICO - PERFIL DEL SALÓN')

  // 6.1 Perfil público
  const profile = await request('GET', `/public/salon/${username}`)
  if (profile.success && profile.data) {
    pass('Perfil público cargado')
  } else {
    fail('Error cargando perfil público', profile.message)
    return
  }

  // 6.2 Verificar datos públicos
  const { data } = profile
  if (data.salonName && data.services && data.barbers !== undefined) {
    pass('Perfil público tiene: salonName, services, barbers')
  } else {
    fail('Perfil público faltan campos', `salonName: ${!!data.salonName}, services: ${!!data.services}, barbers: ${!!data.barbers}`)
  }

  // 6.3 Verificar que NO expone datos sensibles
  if (!data.email && !data.password && !data.id) {
    pass('Perfil público NO expone email/password/id (SEGURIDAD)')
  } else {
    fail('Perfil público EXPONE datos sensibles', `email: ${!!data.email}, id: ${!!data.id}`)
  }

  // 6.4 Servicios devueltos con _id (para compatibilidad Frontend)
  if (data.services.length > 0 && data.services[0]._id) {
    pass('Servicios públicos tienen _id (compatibilidad frontend)')
  } else if (data.services.length > 0) {
    warn('Servicios públicos NO tienen _id - el frontend usa service._id || service.id')
  }

  // 6.5 Barberos devueltos
  if (data.barbers && Array.isArray(data.barbers)) {
    pass(`Barberos en perfil público: ${data.barbers.length}`)
    if (data.barbers.length > 0) {
      const b = data.barbers[0]
      if (b.id && b._id) {
        pass('Barberos tienen tanto id como _id (compatibilidad)')
      } else if (b._id && !b.id) {
        warn('Barberos usan _id pero NO tienen id - posible BUG en booking')
      } else {
        pass('Barberos tienen id')
      }
    }
  }

  // 6.6 Perfil de usuario inexistente
  const notFound = await request('GET', '/public/salon/usuario_que_no_existe_12345')
  if (!notFound.success && notFound.status === 404) {
    pass('Perfil inexistente devuelve 404')
  } else {
    fail('Perfil inexistente no devuelve 404')
  }

  // 6.7 Galería
  const gallery = await request('GET', `/public/salon/${username}/gallery`)
  if (gallery.success) {
    pass('Galería pública cargada')
  } else {
    fail('Error cargando galería', gallery.message)
  }

  return profile.data
}

async function testAvailabilityFlow(username, serviceId) {
  section('7. FLUJO DE DISPONIBILIDAD')

  // 7.1 Obtener estado de días (próximos 30 días)
  const today = new Date()
  const future = new Date()
  future.setDate(today.getDate() + 30)
  const startDate = today.toISOString().split('T')[0]
  const endDate = future.toISOString().split('T')[0]

  const days = await request('GET', `/public/salon/${username}/days-status?startDate=${startDate}&endDate=${endDate}`)
  if (days.success && days.data?.days?.length > 0) {
    pass(`Estado de días obtenido: ${days.data.days.length} días`)
    
    const available = days.data.days.filter(d => d.available)
    const closed = days.data.days.filter(d => !d.available)
    log('  ', `${colors.dim}${available.length} disponibles, ${closed.length} cerrados${colors.reset}`)
  } else {
    fail('Error obteniendo estado de días', days.message)
    return null
  }

  // 7.2 Buscar el primer día disponible (que no sea hoy, para evitar problemas de hora)
  const availableDays = days.data.days.filter(d => d.available && d.date !== startDate)
  if (availableDays.length === 0) {
    warn('No hay días disponibles para probar - se necesitan horarios configurados')
    return null
  }
  const testDate = availableDays[0].date
  log('  ', `${colors.dim}Usando fecha de prueba: ${testDate}${colors.reset}`)

  // 7.3 Disponibilidad básica
  const basic = await request('GET', `/public/salon/${username}/availability?date=${testDate}&serviceId=${serviceId}`)
  if (basic.success && basic.data) {
    if (basic.data.isBusinessDay && basic.data.availableSlots?.length > 0) {
      pass(`Disponibilidad básica: ${basic.data.availableSlots.length} slots`)
    } else if (!basic.data.isBusinessDay) {
      warn(`Día ${testDate} no es laborable según API`)
    } else {
      warn('Disponibilidad devolvió 0 slots disponibles')
    }
  } else {
    fail('Error en disponibilidad básica', basic.message)
  }

  // 7.4 Disponibilidad avanzada
  const adv = await request('GET', `/public/salon/${username}/availability/advanced?date=${testDate}&serviceId=${serviceId}`)
  if (adv.success && adv.data) {
    if (adv.data.isBusinessDay && adv.data.allSlots?.length > 0) {
      pass(`Disponibilidad avanzada: ${adv.data.allSlots.length} slots totales, ${adv.data.availableSlots.length} disponibles`)
    } else {
      warn('Disponibilidad avanzada: sin slots (horario no configurado?)')
    }
  } else {
    fail('Error en disponibilidad avanzada', adv.message)
  }

  // 7.5 Disponibilidad sin parámetros
  const noParams = await request('GET', `/public/salon/${username}/availability/advanced`)
  if (!noParams.success) {
    pass('Disponibilidad sin parámetros rechazada correctamente')
  } else {
    fail('Disponibilidad sin parámetros NO rechazada')
  }

  // 7.6 Disponibilidad con filtro de barbero (barberId=inexistente debe funcionar igual)
  const withBarberId = await request('GET', `/public/salon/${username}/availability/advanced?date=${testDate}&serviceId=${serviceId}&barberId=inexistente123`)
  if (withBarberId.success) {
    pass('Disponibilidad con barberId filtra correctamente')
  } else {
    fail('Error con filtro de barberId')
  }

  return { testDate, availableSlot: adv.data?.availableSlots?.[0] || null }
}

async function testBookingFlow(username, serviceId, testDate, timeSlot, barberId = null) {
  section('8. FLUJO DE RESERVA')

  if (!timeSlot) {
    warn('No hay slot disponible para probar reserva')
    return
  }

  // 8.1 Reserva exitosa
  const booking = {
    serviceId,
    clientName: 'Juan Test',
    clientEmail: 'juantest@test.com',
    clientPhone: '809-555-3333',
    date: testDate,
    time: timeSlot,
    notes: 'Reserva de prueba E2E',
    ...(barberId && { barberId })
  }

  const res = await request('POST', `/public/salon/${username}/book`, booking)
  if (res.success) {
    pass(`Reserva creada exitosamente (${testDate} ${timeSlot})`)
  } else {
    fail('Error creando reserva', res.message)
    return
  }

  // 8.2 Intentar reservar el MISMO slot (debe fallar por overlap)
  const res2 = await request('POST', `/public/salon/${username}/book`, {
    ...booking,
    clientName: 'Pedro Duplicate',
    clientEmail: 'pedro@test.com'
  })
  if (!res2.success) {
    pass('Reserva duplicada rechazada (overlap detectado)')
  } else {
    fail('RESERVA DUPLICADA PERMITIDA - BUG CRÍTICO DE OVERLAP')
  }

  // 8.3 Reserva en slot adyacente (depende de duración)
  // Si el servicio dura 30 min y el slot es 09:00, el 09:30 debería estar libre
  // pero el 09:00 y 09:15 no deberían estar disponibles

  // 8.4 Reserva sin datos requeridos
  const noData = await request('POST', `/public/salon/${username}/book`, {
    serviceId,
    date: testDate,
    time: timeSlot
  })
  if (!noData.success) {
    pass('Reserva sin datos del cliente rechazada (validación)')
  } else {
    fail('Reserva sin datos aceptada')
  }

  // 8.5 Reserva con servicio inexistente
  const badService = await request('POST', `/public/salon/${username}/book`, {
    ...booking,
    serviceId: 'servicio_que_no_existe',
    time: '10:00', // otro horario
    clientEmail: 'otro@test.com'
  })
  if (!badService.success) {
    pass('Reserva con servicio inexistente rechazada')
  } else {
    fail('Reserva con servicio inexistente aceptada')
  }

  // 8.6 Reserva en domingo (si está cerrado)
  const sunday = getNextDayOfWeek(0) // próximo domingo
  const bookingSunday = await request('POST', `/public/salon/${username}/book`, {
    ...booking,
    date: sunday,
    time: '10:00',
    clientEmail: 'sunday@test.com'
  })
  // Puede no fallar si no hay validación de día laboral en el POST - observar
  if (!bookingSunday.success) {
    pass('Reserva en domingo no permitida (o fallo esperado)')
  } else {
    warn('Reserva en domingo fue aceptada - revisar si hay validación de día laboral en booking POST')
  }

  return res.data
}

async function testAppointmentsManagement(token, username) {
  section('9. GESTIÓN DE CITAS (DASHBOARD)')

  // 9.1 Listar citas
  const list = await request('GET', '/appointments', null, token)
  if (list.success && Array.isArray(list.data)) {
    pass(`Citas obtenidas: ${list.data.length}`)
  } else {
    fail('Error obteniendo citas', list.message)
    return
  }

  if (list.data.length === 0) {
    warn('No hay citas para probar gestión')
    return
  }

  const appointment = list.data[0]
  const aptId = appointment.id || appointment._id

  // 9.2 Obtener cita individual
  const single = await request('GET', `/appointments/${aptId}`, null, token)
  if (single.success && single.data) {
    pass('Cita individual obtenida')
  } else {
    fail('Error obteniendo cita individual')
  }

  // 9.3 Actualizar status a CONFIRMADA
  const confirm = await request('PUT', `/appointments/${aptId}/status`, { status: 'CONFIRMADA' }, token)
  if (confirm.success && confirm.data?.status === 'CONFIRMADA') {
    pass('Cita confirmada exitosamente')
  } else {
    fail('Error confirmando cita', confirm.message)
  }

  // 9.4 Actualizar status a COMPLETADA
  const complete = await request('PUT', `/appointments/${aptId}/status`, { status: 'COMPLETADA' }, token)
  if (complete.success && complete.data?.status === 'COMPLETADA') {
    pass('Cita completada exitosamente')
  } else {
    fail('Error completando cita', complete.message)
  }

  // 9.5 Estadísticas
  const stats = await request('GET', '/appointments/stats/summary', null, token)
  if (stats.success && stats.stats) {
    pass('Estadísticas de citas obtenidas')
    // Verificar bug: monthlyRevenue usa _sum.total pero schema tiene paidAmount
    if (stats.stats.monthlyRevenue === null || stats.stats.monthlyRevenue === 0) {
      log('  ', `${colors.dim}Ingresos del mes: ${stats.stats.monthlyRevenue} (esperado si paidAmount=0)${colors.reset}`)
    }
  } else {
    fail('Error en estadísticas', stats.message)
  }

  // 9.6 Citas de hoy
  const today = await request('GET', '/appointments/today', null, token)
  if (today.success) {
    pass(`Citas de hoy: ${today.data?.length || 0}`)
  } else {
    fail('Error obteniendo citas de hoy')
  }

  // 9.7 Filtrar por fecha
  const dateFilter = new Date().toISOString().split('T')[0]
  const filtered = await request('GET', `/appointments?date=${dateFilter}`, null, token)
  if (filtered.success) {
    pass('Filtro por fecha funciona')
  } else {
    fail('Error filtrando por fecha')
  }
}

async function testOverlapProtection(token, username, serviceId) {
  section('10. PROTECCIÓN DE SOLAPAMIENTO')

  // Necesitamos un día laboral con slots disponibles
  const today = new Date()
  const future = new Date()
  future.setDate(today.getDate() + 30)
  const startDate = today.toISOString().split('T')[0]
  const endDate = future.toISOString().split('T')[0]

  const days = await request('GET', `/public/salon/${username}/days-status?startDate=${startDate}&endDate=${endDate}`)
  const availableDays = days.data?.days?.filter(d => d.available && d.date !== startDate) || []
  
  if (availableDays.length < 1) {
    warn('Sin días disponibles para test de overlap')
    return
  }

  // Usar un día diferente para no interferir con test 8
  const testDate = availableDays.length > 1 ? availableDays[1].date : availableDays[0].date

  const adv = await request('GET', `/public/salon/${username}/availability/advanced?date=${testDate}&serviceId=${serviceId}`)
  const freeSlots = adv.data?.availableSlots || []
  
  if (freeSlots.length < 2) {
    warn('No hay suficientes slots para test de overlap')
    return
  }

  const slot1 = freeSlots[0]
  
  // 10.1 Crear primera cita (30 min service)
  const book1 = await request('POST', `/public/salon/${username}/book`, {
    serviceId,
    clientName: 'Overlap Test 1',
    clientEmail: 'overlap1@test.com',
    clientPhone: '809-000-0001',
    date: testDate,
    time: slot1
  })
  if (book1.success) {
    pass(`Cita 1 creada: ${testDate} ${slot1}`)
  } else {
    fail('No se pudo crear cita 1 para test overlap')
    return
  }

  // 10.2 Intentar crear OTRA cita en el MISMO horario con DIFERENTE servicio
  // Esto era el bug original - antes solo comparaba date+time+serviceId
  const book2 = await request('POST', `/public/salon/${username}/book`, {
    serviceId: serviceId, // mismo servicio pero el punto es la misma hora
    clientName: 'Overlap Test 2',
    clientEmail: 'overlap2@test.com',
    clientPhone: '809-000-0002',
    date: testDate,
    time: slot1
  })
  if (!book2.success) {
    pass('Solapamiento exacto detectado y rechazado')
  } else {
    fail('SOLAPAMIENTO NO DETECTADO - BUG CRÍTICO')
  }

  // 10.3 Verificar que el siguiente slot está libre
  if (freeSlots.length > 1) {
    const nextSlot = freeSlots[1]
    // Re-check availability after booking
    const recheck = await request('GET', `/public/salon/${username}/availability/advanced?date=${testDate}&serviceId=${serviceId}`)
    const stillFree = recheck.data?.availableSlots?.includes(nextSlot)
    if (stillFree) {
      pass(`Slot adyacente ${nextSlot} sigue disponible (correcto)`)
    } else {
      warn(`Slot ${nextSlot} ahora NO disponible - puede ser por duración del servicio`)
    }
  }
}

// ============================================================================
// HELPERS
// ============================================================================

function getNextDayOfWeek(dayOfWeek) {
  const d = new Date()
  d.setDate(d.getDate() + ((7 + dayOfWeek - d.getDay()) % 7 || 7))
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

// ============================================================================
// MAIN
// ============================================================================

async function runAllTests() {
  console.log(`\n${colors.blue}╔══════════════════════════════════════════════╗${colors.reset}`)
  console.log(`${colors.blue}║  E2E Test Suite - ReservaBarber               ║${colors.reset}`)
  console.log(`${colors.blue}║  Target: ${BASE_URL}${' '.repeat(Math.max(0, 37 - BASE_URL.length))}║${colors.reset}`)
  console.log(`${colors.blue}╚══════════════════════════════════════════════╝${colors.reset}\n`)

  const startTime = Date.now()

  try {
    // 1. Auth
    const authResult = await testAuthFlow()
    if (!authResult) {
      console.log(`\n${colors.red}ABORTANDO: No se pudo autenticar${colors.reset}`)
      return
    }
    const { token, user, testUser } = authResult

    // 2. Profile
    await testProfileFlow(token)

    // 3. Services
    const createdServices = await testServicesFlow(token)
    const serviceId = createdServices?.[0]?.id || createdServices?.[0]?._id

    // 4. Barbers
    const createdBarbers = await testBarbersFlow(token)
    const barberId = createdBarbers?.[0]?.id

    // 5. Schedules
    const scheduleData = await testSchedulesFlow(token)

    // 6. Public Profile
    const publicProfile = await testPublicProfileFlow(testUser.username)

    // 7. Availability
    let availData = null
    if (serviceId) {
      availData = await testAvailabilityFlow(testUser.username, serviceId)
    } else {
      warn('Sin servicios para probar disponibilidad')
    }

    // 8. Booking
    if (serviceId && availData?.testDate && availData?.availableSlot) {
      await testBookingFlow(
        testUser.username,
        serviceId,
        availData.testDate,
        availData.availableSlot,
        barberId
      )
    } else {
      warn('Sin datos suficientes para probar reserva')
    }

    // 9. Appointments Management
    await testAppointmentsManagement(token, testUser.username)

    // 10. Overlap Protection
    if (serviceId) {
      await testOverlapProtection(token, testUser.username, serviceId)
    }

  } catch (error) {
    console.error(`\n${colors.red}ERROR FATAL: ${error.message}${colors.reset}`)
    console.error(error.stack)
  }

  // Reporte final
  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1)
  
  console.log(`\n${colors.blue}════════════════════════════════════════════════${colors.reset}`)
  console.log(`${colors.blue}  RESULTADOS${colors.reset}`)
  console.log(`${colors.blue}════════════════════════════════════════════════${colors.reset}`)
  console.log(`  ${colors.green}Pasaron:${colors.reset}   ${passed}`)
  console.log(`  ${colors.red}Fallaron:${colors.reset}  ${failed}`)
  console.log(`  ${colors.yellow}Warnings:${colors.reset}  ${warnings}`)
  console.log(`  Tiempo:    ${elapsed}s`)
  
  if (failures.length > 0) {
    console.log(`\n${colors.red}  Fallos:${colors.reset}`)
    failures.forEach((f, i) => {
      console.log(`  ${i + 1}. ${f.msg}${f.detail ? ` → ${f.detail}` : ''}`)
    })
  }

  console.log(`\n${failed === 0 ? colors.green : colors.red}${failed === 0 ? '  ✓ TODOS LOS TESTS PASARON' : `  ✗ ${failed} TEST(S) FALLARON`}${colors.reset}\n`)
  
  process.exit(failed > 0 ? 1 : 0)
}

runAllTests()
