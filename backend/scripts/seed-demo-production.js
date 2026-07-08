/**
 * Crea/actualiza el usuario demo (ramfi_aog) en producción, con datos
 * completos de ejemplo, para que el botón "Ver Demo" del landing muestre
 * un salón real y funcional.
 */
const bcrypt = require('bcryptjs')
const { prisma } = require('../lib/prisma')

async function main() {
  const hashedPassword = await bcrypt.hash('12345678', 12)

  const user = await prisma.user.upsert({
    where: { username: 'ramfi_aog' },
    update: {
      email: 'ramfiaogusto@gmail.com',
      password: hashedPassword,
      salonName: 'Barbería Demo',
      phone: '8095551234',
      address: 'Av. Winston Churchill 123, Santo Domingo, RD',
      onboardingCompleted: true
    },
    create: {
      username: 'ramfi_aog',
      email: 'ramfiaogusto@gmail.com',
      password: hashedPassword,
      salonName: 'Barbería Demo',
      phone: '8095551234',
      address: 'Av. Winston Churchill 123, Santo Domingo, RD',
      onboardingCompleted: true
    }
  })

  // Lunes a sábado, 9:00–19:00. Domingo cerrado (no se crea registro).
  const days = [1, 2, 3, 4, 5, 6]
  for (const dayOfWeek of days) {
    await prisma.businessHour.upsert({
      where: { userId_dayOfWeek: { userId: user.id, dayOfWeek } },
      update: { startTime: '09:00', endTime: '19:00', isActive: true },
      create: { userId: user.id, dayOfWeek, startTime: '09:00', endTime: '19:00', isActive: true }
    })
  }

  await prisma.service.deleteMany({ where: { userId: user.id } })
  await prisma.service.createMany({
    data: [
      {
        userId: user.id,
        name: 'Corte Clásico',
        description: 'Corte de cabello tradicional a tijera y máquina, incluye lavado.',
        price: 300,
        duration: 30,
        category: 'CORTE',
        showDuration: true,
        requiresPayment: false,
        depositAmount: 0
      },
      {
        userId: user.id,
        name: 'Corte Fade + Diseño',
        description: 'Degradado moderno con diseño personalizado a navaja.',
        price: 450,
        duration: 45,
        category: 'CORTE',
        showDuration: true,
        requiresPayment: false,
        depositAmount: 0
      },
      {
        userId: user.id,
        name: 'Afeitado Clásico',
        description: 'Afeitado con navaja, toalla caliente y loción calmante.',
        price: 200,
        duration: 20,
        category: 'BARBA',
        showDuration: true,
        requiresPayment: false,
        depositAmount: 0
      },
      {
        userId: user.id,
        name: 'Perfilado de Barba',
        description: 'Diseño y perfilado de barba con máquina y navaja.',
        price: 250,
        duration: 25,
        category: 'BARBA',
        showDuration: true,
        requiresPayment: false,
        depositAmount: 0
      },
      {
        userId: user.id,
        name: 'Corte + Barba Completo',
        description: 'Paquete completo: corte clásico o fade más perfilado de barba.',
        price: 500,
        duration: 55,
        category: 'COMBO',
        showDuration: true,
        requiresPayment: true,
        depositAmount: 100
      },
      {
        userId: user.id,
        name: 'Tratamiento Capilar',
        description: 'Hidratación profunda y masaje capilar con productos profesionales.',
        price: 350,
        duration: 30,
        category: 'TRATAMIENTO',
        showDuration: true,
        requiresPayment: false,
        depositAmount: 0
      }
    ]
  })

  console.log('Usuario demo listo:', user.username, '/', user.email)
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
