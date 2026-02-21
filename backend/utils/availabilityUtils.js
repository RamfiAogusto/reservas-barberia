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
 * Verifica si una nueva cita tendría solapamiento con citas existentes.
 * Considera la duración completa del servicio, no solo la hora exacta.
 * 
 * @param {Object} params
 * @param {string} params.userId - ID del dueño del salón
 * @param {Date|string} params.date - Fecha de la cita
 * @param {string} params.time - Hora de la cita (HH:MM)
 * @param {number} params.serviceDuration - Duración del servicio en minutos
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
    status: { not: 'CANCELADA' }
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
 * Verifica solapamiento y crea la cita en una transacción atómica.
 * Si barberId es un ID específico: verifica solo contra ese barbero.
 * Si barberId es null: verifica contra TODOS (modo sin barberos / compatibilidad).
 */
async function createAppointmentWithOverlapCheck({ appointmentData, serviceDuration, barberId = null }) {
  return await prisma.$transaction(async (tx) => {
    const where = {
      userId: appointmentData.userId,
      date: appointmentData.date,
      status: { not: 'CANCELADA' }
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
 * Auto-asigna un barbero disponible y crea la cita atómicamente.
 * Usado cuando el cliente elige "cualquier barbero disponible".
 * 
 * Lógica de asignación: elige el barbero con MENOS citas ese día (balanceo de carga).
 * Si hay empate, elige al azar entre los empatados.
 * 
 * @param {Object} params
 * @param {Object} params.appointmentData - Datos de la cita (sin barberId)
 * @param {number} params.serviceDuration - Duración del servicio (minutos)
 * @param {string} params.userId - ID del dueño del salón
 * @returns {Promise<Object>} La cita creada con barbero asignado
 * @throws {Error} 'NO_BARBER_AVAILABLE' si ningún barbero está libre
 * @throws {Error} 'OVERLAP_CONFLICT' si hay conflicto de horario
 */
async function createAppointmentWithAutoAssign({ appointmentData, serviceDuration, userId }) {
  return await prisma.$transaction(async (tx) => {
    // 1. Obtener todos los barberos activos del salón
    const barbers = await tx.barber.findMany({
      where: { userId, isActive: true }
    })

    if (barbers.length === 0) {
      throw new Error('NO_BARBER_AVAILABLE')
    }

    // 2. Obtener TODAS las citas del día (de todos los barberos)
    const allAppointments = await tx.appointment.findMany({
      where: {
        userId,
        date: appointmentData.date,
        status: { not: 'CANCELADA' }
      },
      include: { service: { select: { duration: true } } }
    })

    const newStart = timeToMinutes(appointmentData.time)
    const newEnd = newStart + serviceDuration

    // 3. Filtrar barberos que están LIBRES en este horario
    const availableBarbers = barbers.filter(barber => {
      const barberAppointments = allAppointments.filter(apt => apt.barberId === barber.id)
      return !hasOverlapWithAppointments(barberAppointments, newStart, newEnd)
    })

    if (availableBarbers.length === 0) {
      throw new Error('NO_BARBER_AVAILABLE')
    }

    // 4. Balanceo de carga: elegir el barbero con menos citas ese día
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
 * Retorna cuáles barberos están libres en cada slot generado.
 * 
 * @param {Object} params
 * @param {Array} params.barbers - Lista de barberos activos
 * @param {Array} params.allAppointments - Todas las citas del día (todos los barberos)
 * @param {string} params.time - Hora a verificar (HH:MM)
 * @param {number} params.serviceDuration - Duración del servicio
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

module.exports = {
  checkTimeOverlap,
  createAppointmentWithOverlapCheck,
  createAppointmentWithAutoAssign,
  getAvailableBarbersForSlot,
  timeToMinutes,
  normalizeDate,
  hasOverlapWithAppointments
}
