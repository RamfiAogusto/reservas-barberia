/**
 * Test E2E: Reserva multi-servicio
 * Verifica que se puedan reservar múltiples servicios en una sola cita.
 */
const BASE_URL = 'http://localhost:5000/api'

async function fetchJSON(url, options = {}) {
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options
  })
  return res.json()
}

async function runTests() {
  console.log('\n🧪 === TEST MULTI-SERVICE BOOKING ===\n')
  const results = []
  const uniqueId = Date.now()
  const username = 'test_ms_' + uniqueId

  // 1. Registrar usuario de prueba
  console.log('1. Registrando usuario de prueba...')
  const regData = await fetchJSON(BASE_URL + '/auth/register', {
    method: 'POST',
    body: JSON.stringify({
      username,
      email: 'ms_' + uniqueId + '@test.com',
      password: 'Test123!',
      confirmPassword: 'Test123!',
      phone: '8091234567',
      salonName: 'Test Multi-Service',
      address: 'Test Address'
    })
  })
  if (!regData.token) {
    console.error('   Error registrando:', JSON.stringify(regData).slice(0, 200))
    process.exit(1)
  }
  const token = regData.token
  console.log('   ✅ Usuario registrado: ' + username)

  // 2. Completar onboarding con 3 servicios
  console.log('2. Completando onboarding con 3 servicios...')
  var onboardingRes = await fetchJSON(BASE_URL + '/users/onboarding', {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      ownerCutsHair: false,
      services: [
        { name: 'Corte', price: 200, duration: 30, category: 'CORTE' },
        { name: 'Barba', price: 100, duration: 15, category: 'BARBA' },
        { name: 'Lavado', price: 80, duration: 20, category: 'TRATAMIENTO' }
      ],
      businessHours: [
        { dayOfWeek: 1, startTime: '09:00', endTime: '18:00', isActive: true },
        { dayOfWeek: 2, startTime: '09:00', endTime: '18:00', isActive: true },
        { dayOfWeek: 3, startTime: '09:00', endTime: '18:00', isActive: true },
        { dayOfWeek: 4, startTime: '09:00', endTime: '18:00', isActive: true },
        { dayOfWeek: 5, startTime: '09:00', endTime: '18:00', isActive: true }
      ],
      barbers: [
        { name: 'Barbero A' },
        { name: 'Barbero B' }
      ]
    })
  })
  console.log('   ✅ Onboarding completado')

  // 3. Obtener IDs de servicios
  console.log('3. Obteniendo datos creados...')
  const salonData = await fetchJSON(BASE_URL + '/public/salon/' + username)
  if (!salonData.success || !salonData.data) {
    console.error('   Error obteniendo salon:', JSON.stringify(salonData).slice(0, 200))
    process.exit(1)
  }
  const services = salonData.data.services
  console.log('   Servicios encontrados: ' + services.map(function(s) { return s.name }).join(', '))
  const corte = services.find(function(s) { return s.name === 'Corte' })
  const barba = services.find(function(s) { return s.name === 'Barba' })
  const lavado = services.find(function(s) { return s.name === 'Lavado' })
  if (!corte || !barba || !lavado) {
    console.error('   Error: servicios no encontrados. Nombres:', services.map(function(s) { return s.name }))
    process.exit(1)
  }
  console.log('   ✅ Corte: ' + corte._id + ' (30 min, $200)')
  console.log('   ✅ Barba: ' + barba._id + ' (15 min, $100)')
  console.log('   ✅ Lavado: ' + lavado._id + ' (20 min, $80)')

  // Buscar una fecha futura que sea lunes-viernes
  var today = new Date()
  var testDate = new Date(today)
  testDate.setDate(today.getDate() + 2)
  while (testDate.getDay() === 0 || testDate.getDay() === 6) {
    testDate.setDate(testDate.getDate() + 1)
  }
  var dateStr = testDate.toISOString().split('T')[0]
  console.log('\n📅 Fecha de prueba: ' + dateStr + '\n')

  // 4. Disponibilidad con 1 servicio (30 min)
  console.log('4. Disponibilidad con 1 servicio (Corte, 30 min)...')
  var avail1 = await fetchJSON(
    BASE_URL + '/public/salon/' + username + '/availability/advanced?date=' + dateStr + '&serviceId=' + corte._id + '&barberId=any'
  )
  var slots1 = avail1.data.availableSlots
  console.log('   ✅ Slots disponibles (30 min): ' + slots1.length)

  // 5. Disponibilidad con totalDuration=45 min
  console.log('5. Disponibilidad con 2 servicios (totalDuration=45 min)...')
  var avail2 = await fetchJSON(
    BASE_URL + '/public/salon/' + username + '/availability/advanced?date=' + dateStr + '&serviceId=' + corte._id + '&barberId=any&totalDuration=45'
  )
  var slots2 = avail2.data.availableSlots
  console.log('   ✅ Slots disponibles (45 min): ' + slots2.length)

  var test1 = slots2.length <= slots1.length
  results.push({ name: 'Menos slots con mayor duracion', pass: test1 })
  console.log('   ' + (test1 ? '✅' : '❌') + ' slots 45min (' + slots2.length + ') <= slots 30min (' + slots1.length + ')')

  // 6. Disponibilidad con totalDuration=65 min
  console.log('6. Disponibilidad con 3 servicios (totalDuration=65 min)...')
  var avail3 = await fetchJSON(
    BASE_URL + '/public/salon/' + username + '/availability/advanced?date=' + dateStr + '&serviceId=' + corte._id + '&barberId=any&totalDuration=65'
  )
  var slots3 = avail3.data.availableSlots
  console.log('   ✅ Slots disponibles (65 min): ' + slots3.length)

  var test2 = slots3.length <= slots2.length
  results.push({ name: 'Aun menos slots con 65 min', pass: test2 })
  console.log('   ' + (test2 ? '✅' : '❌') + ' slots 65min (' + slots3.length + ') <= slots 45min (' + slots2.length + ')')

  // 7. Reservar con serviceIds (multi-servicio)
  console.log('\n7. Reservando con serviceIds (Corte + Barba) a las 10:00...')
  var booking = await fetchJSON(BASE_URL + '/public/salon/' + username + '/book', {
    method: 'POST',
    body: JSON.stringify({
      serviceIds: [corte._id, barba._id],
      serviceId: corte._id,
      clientName: 'Test Multi Client',
      clientEmail: 'test@multi.com',
      clientPhone: '8091111111',
      date: dateStr,
      time: '10:00',
      barberId: 'any'
    })
  })

  var test3 = booking.success === true
  results.push({ name: 'Reserva multi-servicio exitosa', pass: test3 })
  console.log('   ' + (test3 ? '✅' : '❌') + ' Reserva: ' + (booking.success ? 'exitosa' : booking.message))

  if (booking.success) {
    var data = booking.data
    console.log('   Appointment ID: ' + data.appointmentId)
    console.log('   Group ID: ' + data.groupId)
    console.log('   Servicios: ' + data.service)
    console.log('   Total: $' + data.totalAmount)
    console.log('   Duracion total: ' + data.totalDuration + ' min')
    console.log('   Citas creadas: ' + data.appointmentCount)
    console.log('   Barbero: ' + (data.barber ? data.barber.name : 'N/A'))

    var test4 = data.groupId !== null && data.groupId !== undefined
    results.push({ name: 'groupId presente en multi-servicio', pass: test4 })
    console.log('   ' + (test4 ? '✅' : '❌') + ' groupId presente: ' + data.groupId)

    var test5 = data.totalAmount === 300
    results.push({ name: 'Precio total correcto ($300)', pass: test5 })
    console.log('   ' + (test5 ? '✅' : '❌') + ' Precio: $' + data.totalAmount + ' (esperado $300)')

    var test6 = data.totalDuration === 45
    results.push({ name: 'Duracion total correcta (45 min)', pass: test6 })
    console.log('   ' + (test6 ? '✅' : '❌') + ' Duracion: ' + data.totalDuration + ' min (esperado 45)')

    var test7 = data.appointmentCount === 2
    results.push({ name: '2 citas creadas', pass: test7 })
    console.log('   ' + (test7 ? '✅' : '❌') + ' Citas: ' + data.appointmentCount + ' (esperado 2)')

    var test8 = data.barber !== null
    results.push({ name: 'Barbero auto-asignado', pass: test8 })
    console.log('   ' + (test8 ? '✅' : '❌') + ' Barbero: ' + (data.barber ? data.barber.name : 'ninguno'))

    // 8. Verificar que el bloque esta ocupado
    console.log('\n8. Verificando que 10:00 esta ocupado tras reserva...')
    var afterBooking = await fetchJSON(
      BASE_URL + '/public/salon/' + username + '/availability/advanced?date=' + dateStr + '&serviceId=' + corte._id + '&barberId=' + data.barber.id
    )
    var is1000Avail = afterBooking.data.availableSlots.includes('10:00')
    var is1030Avail = afterBooking.data.availableSlots.includes('10:30')

    var test9 = !is1000Avail
    results.push({ name: '10:00 ocupado tras reserva', pass: test9 })
    console.log('   ' + (test9 ? '✅' : '❌') + ' 10:00 disponible: ' + is1000Avail + ' (esperado: false)')

    var test10 = !is1030Avail
    results.push({ name: '10:30 ocupado (bloque consecutivo)', pass: test10 })
    console.log('   ' + (test10 ? '✅' : '❌') + ' 10:30 disponible: ' + is1030Avail + ' (esperado: false)')
  }

  // 9. Single service (compatibilidad)
  console.log('\n9. Reservando con serviceId individual (Lavado, 14:00)...')
  var singleBooking = await fetchJSON(BASE_URL + '/public/salon/' + username + '/book', {
    method: 'POST',
    body: JSON.stringify({
      serviceId: lavado._id,
      clientName: 'Test Single Client',
      clientEmail: 'test@single.com',
      clientPhone: '8092222222',
      date: dateStr,
      time: '14:00',
      barberId: 'any'
    })
  })

  var test11 = singleBooking.success === true
  results.push({ name: 'Reserva single-servicio compatible', pass: test11 })
  console.log('   ' + (test11 ? '✅' : '❌') + ' Reserva: ' + (singleBooking.success ? 'exitosa' : singleBooking.message))

  if (singleBooking.success) {
    var test12 = singleBooking.data.groupId === null || singleBooking.data.groupId === undefined
    results.push({ name: 'Sin groupId en single', pass: test12 })
    console.log('   ' + (test12 ? '✅' : '❌') + ' groupId: ' + (singleBooking.data.groupId || 'null'))

    var test13 = singleBooking.data.appointmentCount === 1
    results.push({ name: '1 cita creada en single', pass: test13 })
    console.log('   ' + (test13 ? '✅' : '❌') + ' Citas: ' + singleBooking.data.appointmentCount)
  }

  // Resumen
  console.log('\n==================================================')
  console.log('📊 RESUMEN DEL TEST MULTI-SERVICIO')
  console.log('==================================================')
  var passed = results.filter(function(r) { return r.pass }).length
  var total = results.length
  results.forEach(function(r) { console.log('  ' + (r.pass ? '✅' : '❌') + ' ' + r.name) })
  console.log('\n📈 Resultado: ' + passed + '/' + total + ' pruebas pasaron')
  console.log(passed === total ? '🎉 ¡TODAS LAS PRUEBAS PASARON!' : '⚠️ Algunas pruebas fallaron')
  process.exit(passed === total ? 0 : 1)
}

runTests().catch(function(err) {
  console.error('Error fatal:', err)
  process.exit(1)
})
