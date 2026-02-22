const { prisma } = require('../lib/prisma')

// ==================== HELPERS ====================

/**
 * Normaliza una fecha a medianoche local.
 */
function normalizeDate(date) {
  let d
  if (typeof date === 'string') {
    const [year, month, day] = date.split('-').map(Number)
    d = (year && month && day) ? new Date(year, month - 1, day) : new Date(date)
  } else {
    d = new Date(date)
  }
  d.setHours(0, 0, 0, 0)
  return d
}

/**
 * Convierte "HH:MM" a minutos desde medianoche.
 */
function timeToMinutes(time) {
  const [h, m] = time.split(':').map(Number)
  return h * 60 + m
}

/**
 * Verifica si [startA, endA) se solapa con [startB, endB) en minutos.
 */
function rangesOverlap(startA, endA, startB, endB) {
  return startA < endB && endA > startB
}

/**
 * Dado una lista de citas existentes, verifica si un nuevo rango de tiempo tiene solapamiento.
 */
function hasOverlapWithAppointments(existingAppointments, newStartMinutes, newEndMinutes) {
  for (const apt of existingAppointments) {
    const aptStart = timeToMinutes(apt.time)
    const aptEnd = aptStart + (apt.service?.duration || 30)
    if (rangesOverlap(newStartMinutes, newEndMinutes, aptStart, aptEnd)) {
      return true
    }
  }
  return false
}

// ==================== FUNCIONES PRINCIPALES ====================

/**
 * Verifica si una nueva cita tendrÃ­a solapamiento con citas existentes.
 * Considera la duraciÃ³n completa del servicio, no solo la hora exacta.
 * 
 * @param {Object} params
 * @param {string} params.userId - ID del dueÃ±o del salÃ³n
 * @param {Date|string} params.date - Fecha de la cita
 * @param {string} params.time - Hora de la cita (HH:MM)
 * @param {number} params.serviceDuration - DuraciÃ³n del servicio en minutos
 * @param {string|null} params.barberId - ID del barbero (null = verificar todos)
 * @param {string|null} params.excludeAppointmentId - Excluir esta cita (para updates)
 * @returns {Promise<boolean>} true si hay solapamiento
 */
async function checkTimeOverlap({ userId, date, time, serviceDuration, barberId = null, excludeAppointmentId = null }) {
  const newStart = timeToMinutes(time)
  const newEnd = newStart + serviceDuration
  const appointmentDate = normalizeDate(date)

  const where = {
    userId,
    date: appointmentDate,
    status: { notIn: ['CANCELADA', 'EXPIRADA'] }
  }

  if (barberId) {
    where.barberId = barberId
  }

  if (excludeAppointmentId) {
    where.NOT = { id: excludeAppointmentId }
  }

  const existingAppointments = await prisma.appointment.findMany({
    where,
    include: { service: { select: { duration: true } } }
  })

  return hasOverlapWithAppointments(existingAppointments, newStart, newEnd)
}

/**
 * Verifica solapamiento y crea la cita en una transacciÃ³n atÃ³mica.
 * Si barberId es un ID especÃ­fico: verifica solo contra ese barbero.
 * Si barberId es null: verifica contra TODOS (modo sin barberos / compatibilidad).
 */
async function createAppointmentWithOverlapCheck({ appointmentData, serviceDuration, barberId = null }) {
  return await prisma.$transaction(async (tx) => {
    const where = {
      userId: appointmentData.userId,
      date: appointmentData.date,
      status: { notIn: ['CANCELADA', 'EXPIRADA'] }
    }

    if (barberId) {
      where.barberId = barberId
    }

    const existingAppointments = await tx.appointment.findMany({
      where,
      include: { service: { select: { duration: true } } }
    })

    const newStart = timeToMinutes(appointmentData.time)
    const newEnd = newStart + serviceDuration

    if (hasOverlapWithAppointments(existingAppointments, newStart, newEnd)) {
      throw new Error('OVERLAP_CONFLICT')
    }

    const newAppointment = await tx.appointment.create({
      data: appointmentData
    })

    return newAppointment
  })
}

/**
 * Auto-asigna un barbero disponible y crea la cita atÃ³micamente.
 * Usado cuando el cliente elige "cualquier barbero disponible".
 * 
 * LÃ³gica de asignaciÃ³n: elige el barbero con MENOS citas ese dÃ­a (balanceo de carga).
 * Si hay empate, elige al azar entre los empatados.
 * 
 * @param {Object} params
 * @param {Object} params.appointmentData - Datos de la cita (sin barberId)
 * @param {number} params.serviceDuration - DuraciÃ³n del servicio (minutos)
 * @param {string} params.userId - ID del dueÃ±o del salÃ³n
 * @returns {Promise<Object>} La cita creada con barbero asignado
 * @throws {Error} 'NO_BARBER_AVAILABLE' si ningÃºn barbero estÃ¡ libre
 * @throws {Error} 'OVERLAP_CONFLICT' si hay conflicto de horario
 */
async function createAppointmentWithAutoAssign({ appointmentData, serviceDuration, userId }) {
  return await prisma.$transaction(async (tx) => {
    // 1. Obtener todos los barberos activos del salÃ³n
    const barbers = await tx.barber.findMany({
      where: { userId, isActive: true }
    })

    if (barbers.length === 0) {
      throw new Error('NO_BARBER_AVAILABLE')
    }

    // 2. Obtener TODAS las citas del dÃ­a (de todos los barberos)
    const allAppointments = await tx.appointment.findMany({
      where: {
        userId,
        date: appointmentData.date,
        status: { notIn: ['CANCELADA', 'EXPIRADA'] }
      },
      include: { service: { select: { duration: true } } }
    })

    const newStart = timeToMinutes(appointmentData.time)
    const newEnd = newStart + serviceDuration

    // 3. Filtrar barberos que estÃ¡n LIBRES en este horario
    const availableBarbers = barbers.filter(barber => {
      const barberAppointments = allAppointments.filter(apt => apt.barberId === barber.id)
      return !hasOverlapWithAppointments(barberAppointments, newStart, newEnd)
    })

    if (availableBarbers.length === 0) {
      throw new Error('NO_BARBER_AVAILABLE')
    }

    // 4. Balanceo de carga: elegir el barbero con menos citas ese dÃ­a
    const barberLoad = availableBarbers.map(barber => ({
      barber,
      appointmentCount: allAppointments.filter(apt => apt.barberId === barber.id).length
    }))

    barberLoad.sort((a, b) => a.appointmentCount - b.appointmentCount)
    const minLoad = barberLoad[0].appointmentCount
    const leastBusy = barberLoad.filter(b => b.appointmentCount === minLoad)

    // Si hay empate, elegir al azar
    const chosen = leastBusy[Math.floor(Math.random() * leastBusy.length)].barber

    // 5. Crear la cita con el barbero asignado
    const newAppointment = await tx.appointment.create({
      data: {
        ...appointmentData,
        barberId: chosen.id
      }
    })

    return { appointment: newAppointment, assignedBarber: chosen }
  })
}

/**
 * Calcula disponibilidad POR BARBERO para una fecha/hora dados.
 * Retorna cuÃ¡les barberos estÃ¡n libres en cada slot generado.
 * 
 * @param {Object} params
 * @param {Array} params.barbers - Lista de barberos activos
 * @param {Array} params.allAppointments - Todas las citas del dÃ­a (todos los barberos)
 * @param {string} params.time - Hora a verificar (HH:MM)
 * @param {number} params.serviceDuration - DuraciÃ³n del servicio
 * @returns {Array} IDs de barberos disponibles en ese horario
 */
function getAvailableBarbersForSlot(barbers, allAppointments, time, serviceDuration) {
  const slotStart = timeToMinutes(time)
  const slotEnd = slotStart + serviceDuration

  return barbers.filter(barber => {
    const barberAppointments = allAppointments.filter(apt => apt.barberId === barber.id)
    return !hasOverlapWithAppointments(barberAppointments, slotStart, slotEnd)
  }).map(b => b.id)
}

/**
 * Crea mÃºltiples citas consecutivas para reservas multi-servicio.
 * Verifica solapamiento del bloque completo y asigna barbero automÃ¡ticamente si aplica.
 *
 * @param {Object} params
 * @param {Array} params.services - Array de servicios [{id, duration, price, name}]
 * @param {Object} params.baseData - Datos comunes: userId, clientName, clientEmail, clientPhone, date, time, notes, paymentStatus
 * @param {string|null} params.barberId - ID del barbero o null para auto-assign
 * @param {boolean} params.isAutoAssign - true si es modo "cualquier barbero"
 * @param {string} params.userId - ID del dueÃ±o del salÃ³n
 * @returns {Promise<Object>} { appointments: [...], assignedBarber, groupId }
 */
async function createMultiServiceAppointments({ services, baseData, barberId, isAutoAssign, userId }) {
  const { v4: uuidv4 } = (() => {
    try { return require('uuid') } catch { return { v4: () => require('crypto').randomUUID() } }
  })()

  const groupId = services.length > 1 ? uuidv4() : null
  const totalDuration = services.reduce((sum, s) => sum + s.duration, 0)

  return await prisma.$transaction(async (tx) => {
    // 1. Obtener barberos activos
    const barbers = await tx.barber.findMany({
      where: { userId, isActive: true }
    })
    const hasBarbers = barbers.length > 0

    // 2. Obtener citas existentes del dÃ­a
    const allAppointments = await tx.appointment.findMany({
      where: {
        userId,
        date: baseData.date,
        status: { notIn: ['CANCELADA', 'EXPIRADA'] }
      },
      include: { service: { select: { duration: true } } }
    })

    const blockStart = timeToMinutes(baseData.time)
    const blockEnd = blockStart + totalDuration

    let resolvedBarberId = barberId
    let assignedBarber = null

    if (hasBarbers && isAutoAssign) {
      // Buscar barbero libre para todo el bloque
      const availableBarbers = barbers.filter(barber => {
        const barberApts = allAppointments.filter(a => a.barberId === barber.id)
        return !hasOverlapWithAppointments(barberApts, blockStart, blockEnd)
      })

      if (availableBarbers.length === 0) {
        throw new Error('NO_BARBER_AVAILABLE')
      }

      // Balanceo de carga
      const barberLoad = availableBarbers.map(b => ({
        barber: b,
        count: allAppointments.filter(a => a.barberId === b.id).length
      }))
      barberLoad.sort((a, b) => a.count - b.count)
      const minLoad = barberLoad[0].count
      const leastBusy = barberLoad.filter(b => b.count === minLoad)
      const chosen = leastBusy[Math.floor(Math.random() * leastBusy.length)].barber

      resolvedBarberId = chosen.id
      assignedBarber = chosen
    } else if (hasBarbers && barberId) {
      // Verificar que el barbero especÃ­fico estÃ© libre para todo el bloque
      const barberApts = allAppointments.filter(a => a.barberId === barberId)
      if (hasOverlapWithAppointments(barberApts, blockStart, blockEnd)) {
        throw new Error('OVERLAP_CONFLICT')
      }
    } else {
      // Sin barberos: verificar solapamiento global
      if (hasOverlapWithAppointments(allAppointments, blockStart, blockEnd)) {
        throw new Error('OVERLAP_CONFLICT')
      }
    }

    // 3. Crear citas consecutivas
    const appointments = []
    let currentMinutes = blockStart

    for (const service of services) {
      const hour = Math.floor(currentMinutes / 60)
      const min = currentMinutes % 60
      const timeStr = `${hour.toString().padStart(2, '0')}:${min.toString().padStart(2, '0')}`

      const aptData = {
          userId: baseData.userId,
          serviceId: service.id,
          clientName: baseData.clientName,
          clientEmail: baseData.clientEmail,
          clientPhone: baseData.clientPhone,
          date: baseData.date,
          time: timeStr,
          notes: baseData.notes || '',
          totalAmount: service.price,
          status: baseData.status || 'PENDIENTE',
          paymentStatus: baseData.paymentStatus,
          barberId: resolvedBarberId,
          groupId
        }
      // Campos opcionales para modo con pago
      if (baseData.holdExpiresAt) aptData.holdExpiresAt = baseData.holdExpiresAt
      if (baseData.paymentToken) aptData.paymentToken = baseData.paymentToken

      const apt = await tx.appointment.create({ data: aptData })
      appointments.push(apt)
      currentMinutes += service.duration
    }

    return { appointments, assignedBarber, groupId }
  })
}

module.exports = {
  checkTimeOverlap,
  createAppointmentWithOverlapCheck,
  createAppointmentWithAutoAssign,
  createMultiServiceAppointments,
  getAvailableBarbersForSlot,
  timeToMinutes,
  normalizeDate,
  hasOverlapWithAppointments
}

