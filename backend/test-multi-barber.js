/**
 * Test E2E: Multi-barber availability + auto-assign
 * Verifica que:
 * 1. Con barberId=any, los slots se calculan correctamente por barbero
 * 2. Auto-assign elige al barbero menos ocupado
 * 3. Cuando todos los barberos están ocupados, retorna error
 * 4. Barbero específico funciona con su propia disponibilidad
 */

const API = 'http://localhost:5000/api'

async function request(url, options = {}) {
  const res = await fetch(url, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) }
  })
  return res.json()
}

async function authRequest(url, token, options = {}) {
  return request(url, {
    ...options,
    headers: { Authorization: `Bearer ${token}`, ...(options.headers || {}) }
  })
}

async function run() {
  console.log('\n🧪 === TEST MULTI-BARBER AVAILABILITY ===\n')

  // 1. Login con usuario existente (usamos el que ya tiene datos)
  console.log('1. Buscando usuario de prueba...')
  
  // Primero registramos un usuario de prueba
  const testUsername = 'test_multibarber_' + Date.now()
  const registerRes = await request(`${API}/auth/register`, {
    method: 'POST',
    body: JSON.stringify({
      username: testUsername,
      email: `${testUsername}@test.com`,
      password: 'Test1234!',
      confirmPassword: 'Test1234!',
      phone: '8091234567',
      salonName: 'Test Multi Barber',
      address: 'Calle Test 123'
    })
  })

  if (!registerRes.success) {
    console.error('❌ Error registrando:', registerRes.message)
    return
  }
  console.log('   ✅ Usuario registrado:', testUsername)
  const token = registerRes.token

  // 2. Completar onboarding (crea barberos + horarios + servicios)
  console.log('\n2. Completando onboarding...')
  const onboardingRes = await authRequest(`${API}/users/onboarding`, token, {
    method: 'POST',
    body: JSON.stringify({
      ownerCutsHair: false,
      barbers: [
        { name: 'Barbero A' },
        { name: 'Barbero B' }
      ],
      businessHours: [
        { dayOfWeek: 0, isActive: false },
        { dayOfWeek: 1, isActive: true, startTime: '09:00', endTime: '18:00' },
        { dayOfWeek: 2, isActive: true, startTime: '09:00', endTime: '18:00' },
        { dayOfWeek: 3, isActive: true, startTime: '09:00', endTime: '18:00' },
        { dayOfWeek: 4, isActive: true, startTime: '09:00', endTime: '18:00' },
        { dayOfWeek: 5, isActive: true, startTime: '09:00', endTime: '18:00' },
        { dayOfWeek: 6, isActive: true, startTime: '09:00', endTime: '14:00' }
      ],
      services: [
        { name: 'Corte Test', duration: 30, price: 500, category: 'CORTE' }
      ]
    })
  })

  if (!onboardingRes.success) {
    console.error('❌ Error en onboarding:', JSON.stringify(onboardingRes))
    return
  }
  console.log('   ✅ Onboarding completado')

  // 3. Obtener datos creados (servicio y barberos)
  console.log('\n3. Obteniendo datos creados...')
  const servicesRes = await authRequest(`${API}/services`, token)
  const serviceId = servicesRes.data[0].id
  console.log(`   ✅ Servicio: ${serviceId} (${servicesRes.data[0].name})`)

  // Obtener barberos del perfil público
  const profileRes = await request(`${API}/public/salon/${testUsername}`)
  const barbers = profileRes.data.barbers
  const barberA = barbers.find(b => b.name === 'Barbero A')
  const barberB = barbers.find(b => b.name === 'Barbero B')

  if (!barberA || !barberB) {
    console.error('❌ No se encontraron barberos:', barbers)
    return
  }
  console.log(`   ✅ Barbero A: ${barberA.id}`)
  console.log(`   ✅ Barbero B: ${barberB.id}`)

  // 4. Encontrar próximo día laboral (lunes a viernes)
  const today = new Date()
  let testDate = new Date(today)
  while (testDate.getDay() === 0 || testDate.getDay() === 6) {
    testDate.setDate(testDate.getDate() + 1)
  }
  // Si es hoy, usar mañana para evitar slots "pasados"
  if (testDate.toDateString() === today.toDateString()) {
    testDate.setDate(testDate.getDate() + 1)
    while (testDate.getDay() === 0 || testDate.getDay() === 6) {
      testDate.setDate(testDate.getDate() + 1)
    }
  }
  const dateStr = testDate.toISOString().split('T')[0]
  console.log(`\n📅 Fecha de prueba: ${dateStr}`)

  // 6. Verificar disponibilidad con barberId=any (todos libres)
  console.log('\n5. Verificando disponibilidad con barberId=any (todos libres)...')
  const avail1 = await request(`${API}/public/salon/${testUsername}/availability?date=${dateStr}&serviceId=${serviceId}&barberId=any`)
  
  if (!avail1.success) {
    console.error('❌ Error obteniendo disponibilidad:', avail1)
    return
  }
  const initialSlots = avail1.data.availableSlots
  console.log(`   ✅ Slots disponibles: ${initialSlots.length}`)
  console.log(`   Primeros slots: ${initialSlots.slice(0, 5).join(', ')}`)

  // 7. Verificar disponibilidad con barbero específico A (todos libres)
  console.log('\n6. Verificando disponibilidad con Barbero A...')
  const availA = await request(`${API}/public/salon/${testUsername}/availability?date=${dateStr}&serviceId=${serviceId}&barberId=${barberA.id}`)
  const slotsBarberA = availA.data.availableSlots
  console.log(`   ✅ Slots Barbero A: ${slotsBarberA.length}`)

  // Verificar que ambos tienen los mismos slots (ninguno tiene citas)
  if (initialSlots.length === slotsBarberA.length) {
    console.log('   ✅ Mismo número de slots (correcto, ambos libres)')
  } else {
    console.error(`   ❌ Diferencia inesperada: any=${initialSlots.length}, A=${slotsBarberA.length}`)
  }

  // 8. Reservar slot 10:00 para Barbero A
  console.log('\n7. Reservando 10:00 para Barbero A...')
  const bookA = await request(`${API}/public/salon/${testUsername}/book`, {
    method: 'POST',
    body: JSON.stringify({
      serviceId,
      barberId: barberA.id,
      clientName: 'Cliente Test 1',
      clientEmail: 'test1@test.com',
      clientPhone: '8091234567',
      date: dateStr,
      time: '10:00'
    })
  })
  if (!bookA.success) {
    console.error('❌ Error reservando:', bookA.message)
    return
  }
  console.log(`   ✅ Reserva creada: ${bookA.data.appointmentId}`)

  // 9. ⭐ PRUEBA CLAVE: Verificar que 10:00 con barberId=any AÚN ESTÁ DISPONIBLE
  console.log('\n8. ⭐ PRUEBA CLAVE: ¿10:00 sigue disponible con barberId=any?')
  const avail2 = await request(`${API}/public/salon/${testUsername}/availability?date=${dateStr}&serviceId=${serviceId}&barberId=any`)
  const slotsAfterBook = avail2.data.availableSlots
  const is1000Available = slotsAfterBook.includes('10:00')
  
  if (is1000Available) {
    console.log('   ✅ ¡CORRECTO! 10:00 sigue disponible (Barbero B está libre)')
  } else {
    console.error('   ❌ FALLO! 10:00 no debería haber desaparecido — Barbero B sigue libre')
  }

  // 10. Verificar que 10:00 NO está disponible para Barbero A solo
  console.log('\n9. Verificando que 10:00 NO está disponible para Barbero A...')
  const availA2 = await request(`${API}/public/salon/${testUsername}/availability?date=${dateStr}&serviceId=${serviceId}&barberId=${barberA.id}`)
  const is1000AvailA = availA2.data.availableSlots.includes('10:00')
  
  if (!is1000AvailA) {
    console.log('   ✅ ¡CORRECTO! 10:00 NO disponible para Barbero A (ya tiene cita)')
  } else {
    console.error('   ❌ FALLO! 10:00 no debería estar disponible para Barbero A')
  }

  // 11. Verificar que 10:00 SÍ está disponible para Barbero B
  console.log('\n10. Verificando que 10:00 SÍ está disponible para Barbero B...')
  const availB = await request(`${API}/public/salon/${testUsername}/availability?date=${dateStr}&serviceId=${serviceId}&barberId=${barberB.id}`)
  const is1000AvailB = availB.data.availableSlots.includes('10:00')
  
  if (is1000AvailB) {
    console.log('   ✅ ¡CORRECTO! 10:00 disponible para Barbero B')
  } else {
    console.error('   ❌ FALLO! 10:00 debería estar disponible para Barbero B')
  }

  // 12. Auto-assign: reservar 10:00 con barberId=any (debería asignar a B)
  console.log('\n11. Auto-assign: Reservando 10:00 con barberId=any...')
  const bookAny = await request(`${API}/public/salon/${testUsername}/book`, {
    method: 'POST',
    body: JSON.stringify({
      serviceId,
      barberId: 'any',
      clientName: 'Cliente Test 2',
      clientEmail: 'test2@test.com',
      clientPhone: '8097654321',
      date: dateStr,
      time: '10:00'
    })
  })

  if (!bookAny.success) {
    console.error('❌ Error reservando con any:', bookAny.message)
    return
  }
  console.log(`   ✅ Reserva creada: ${bookAny.data.appointmentId}`)
  console.log(`   Barbero asignado: ${bookAny.data.barber?.name || 'N/A'} (${bookAny.data.barber?.id || 'N/A'})`)
  
  if (bookAny.data.barber?.id === barberB.id) {
    console.log('   ✅ ¡CORRECTO! Se asignó a Barbero B (el único libre)')
  } else {
    console.error(`   ⚠️  Se esperaba Barbero B, pero se asignó: ${bookAny.data.barber?.name}`)
  }

  // 13. Ahora AMBOS barberos están ocupados a las 10:00 — intentar reservar otra vez
  console.log('\n12. Intentando reservar 10:00 con barberId=any (ambos ocupados)...')
  const bookFail = await request(`${API}/public/salon/${testUsername}/book`, {
    method: 'POST',
    body: JSON.stringify({
      serviceId,
      barberId: 'any',
      clientName: 'Cliente Test 3',
      clientEmail: 'test3@test.com',
      clientPhone: '8091111111',
      date: dateStr,
      time: '10:00'
    })
  })

  if (!bookFail.success && bookFail.message.includes('barberos disponibles')) {
    console.log(`   ✅ ¡CORRECTO! Error esperado: "${bookFail.message}"`)
  } else if (bookFail.success) {
    console.error('   ❌ FALLO! La reserva no debería haber sido exitosa')
  } else {
    console.log(`   ⚠️  Error recibido: "${bookFail.message}" (esperábamos "No hay barberos disponibles...")`)
  }

  // 14. Verificar que 10:00 ya no aparece en disponibilidad con any
  console.log('\n13. Verificando que 10:00 ya NO está disponible con any...')
  const avail3 = await request(`${API}/public/salon/${testUsername}/availability?date=${dateStr}&serviceId=${serviceId}&barberId=any`)
  const is1000StillAvail = avail3.data.availableSlots.includes('10:00')
  
  if (!is1000StillAvail) {
    console.log('   ✅ ¡CORRECTO! 10:00 ya no disponible (ambos barberos ocupados)')
  } else {
    console.error('   ❌ FALLO! 10:00 no debería estar disponible')
  }

  // 15. Probar con /availability/advanced
  console.log('\n14. Probando endpoint /availability/advanced con barberId=any...')
  const advAvail = await request(`${API}/public/salon/${testUsername}/availability/advanced?date=${dateStr}&serviceId=${serviceId}&barberId=any`)
  
  if (advAvail.success) {
    const advAvailSlots = advAvail.data.availableSlots
    const adv1000 = advAvailSlots.includes('10:00')
    console.log(`   Slots disponibles: ${advAvailSlots.length}`)
    console.log(`   10:00 disponible: ${adv1000 ? '❌ NO DEBERÍA' : '✅ Correcto, no disponible'}`)
    
    // Verificar que 11:00 SÍ está disponible (no hay citas ahí)
    const adv1100 = advAvailSlots.includes('11:00')
    console.log(`   11:00 disponible: ${adv1100 ? '✅ Correcto' : '❌ DEBERÍA ESTAR DISPONIBLE'}`)

    // 15.5 Verificar que availableBarbers tiene objetos con nombre (NO solo IDs)
    const slot1100 = advAvail.data.allSlots.find(s => s.time === '11:00')
    const hasNames = slot1100?.availableBarbers?.every(b => typeof b === 'object' && b.name)
    console.log(`   Barbers como objetos con nombre: ${hasNames ? '✅ Correcto' : '❌ FALLO: todavía son IDs'}`)
    if (hasNames) {
      console.log(`   Barberos en 11:00: ${slot1100.availableBarbers.map(b => b.name).join(', ')}`)
    }
  } else {
    console.error('   ❌ Error:', advAvail.message)
  }

  // 16. Test balanceo de carga: reservar varias citas con any
  console.log('\n15. Test balanceo de carga...')
  const assignments = []
  for (let i = 0; i < 4; i++) {
    const time = `1${i + 1}:00` // 11:00, 12:00, 13:00, 14:00
    const bk = await request(`${API}/public/salon/${testUsername}/book`, {
      method: 'POST',
      body: JSON.stringify({
        serviceId,
        barberId: 'any',
        clientName: `Load Test ${i + 1}`,
        clientEmail: `load${i + 1}@test.com`,
        clientPhone: `809000000${i}`,
        date: dateStr,
        time
      })
    })
    if (bk.success) {
      assignments.push({ time, barber: bk.data.barber?.name })
      console.log(`   ${time} → ${bk.data.barber?.name}`)
    } else {
      console.error(`   ❌ Error en ${time}: ${bk.message}`)
    }
  }

  const countA = assignments.filter(a => a.barber === 'Barbero A').length
  const countB = assignments.filter(a => a.barber === 'Barbero B').length
  console.log(`   Barbero A: ${countA} citas, Barbero B: ${countB} citas`)
  if (Math.abs(countA - countB) <= 1) {
    console.log('   ✅ Balanceo de carga correcto (diferencia ≤ 1)')
  } else {
    console.log('   ⚠️  Desbalance detectado pero no crítico')
  }

  // RESUMEN
  console.log('\n' + '='.repeat(50))
  console.log('📊 RESUMEN DEL TEST')
  console.log('='.repeat(50))
  
  let passed = 0
  let failed = 0
  
  const slot1100Check = advAvail.data?.allSlots?.find(s => s.time === '11:00')
  const hasBarberNames = slot1100Check?.availableBarbers?.every(b => typeof b === 'object' && b.name)

  const tests = [
    { name: '10:00 disponible con any después de reserva Barbero A', result: is1000Available },
    { name: '10:00 NO disponible para Barbero A', result: !is1000AvailA },
    { name: '10:00 disponible para Barbero B', result: is1000AvailB },
    { name: 'Auto-assign asigna a Barbero B', result: bookAny.data.barber?.id === barberB.id },
    { name: 'Error cuando todos ocupados', result: !bookFail.success },
    { name: '10:00 no disponible con any (ambos ocupados)', result: !is1000StillAvail },
    { name: 'Advanced endpoint funciona con any', result: advAvail.success },
    { name: 'availableBarbers tiene objetos con nombre', result: hasBarberNames },
    { name: 'Balanceo de carga (diff ≤ 1)', result: Math.abs(countA - countB) <= 1 },
  ]

  for (const t of tests) {
    if (t.result) {
      console.log(`  ✅ ${t.name}`)
      passed++
    } else {
      console.log(`  ❌ ${t.name}`)
      failed++
    }
  }

  console.log(`\n📈 Resultado: ${passed}/${tests.length} pruebas pasaron`)
  if (failed > 0) {
    console.log(`⚠️  ${failed} prueba(s) fallaron`)
  } else {
    console.log('🎉 ¡TODAS LAS PRUEBAS PASARON!')
  }
  
  console.log('\n')
}

run().catch(console.error)
