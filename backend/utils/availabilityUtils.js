const { prisma } = require('../lib/prisma')

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
  const [hours, minutes] = time.split(':').map(Number)
  const newStartMinutes = hours * 60 + minutes
  const newEndMinutes = newStartMinutes + serviceDuration

  // Normalizar fecha
  let appointmentDate
  if (typeof date === 'string') {
    const [year, month, day] = date.split('-').map(Number)
    if (year && month && day) {
      appointmentDate = new Date(year, month - 1, day)
    } else {
      appointmentDate = new Date(date)
    }
  } else {
    appointmentDate = new Date(date)
  }
  appointmentDate.setHours(0, 0, 0, 0)

  const where = {
    userId,
    date: appointmentDate,
    status: { not: 'CANCELADA' }
  }

  // Filtrar por barbero si se especifica
  if (barberId) {
    where.barberId = barberId
  }

  // Excluir una cita específica (útil para actualizaciones)
  if (excludeAppointmentId) {
    where.NOT = { id: excludeAppointmentId }
  }

  const existingAppointments = await prisma.appointment.findMany({
    where,
    include: {
      service: { select: { duration: true } }
    }
  })

  // Verificar solapamiento con cada cita existente
  for (const apt of existingAppointments) {
    const [aptHours, aptMinutes] = apt.time.split(':').map(Number)
    const aptStartMinutes = aptHours * 60 + aptMinutes
    const aptEndMinutes = aptStartMinutes + (apt.service?.duration || 30)

    // Solapamiento: el nuevo inicio < fin existente Y el nuevo fin > inicio existente
    if (newStartMinutes < aptEndMinutes && newEndMinutes > aptStartMinutes) {
      return true // hay solapamiento
    }
  }

  return false // no hay solapamiento
}

/**
 * Verifica solapamiento y crea la cita en una transacción atómica.
 * Previene condiciones de carrera donde dos clientes reservan el mismo slot.
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

    // Obtener citas existentes dentro de la transacción
    const existingAppointments = await tx.appointment.findMany({
      where,
      include: {
        service: { select: { duration: true } }
      }
    })

    const [hours, minutes] = appointmentData.time.split(':').map(Number)
    const newStartMinutes = hours * 60 + minutes
    const newEndMinutes = newStartMinutes + serviceDuration

    // Verificar solapamiento
    for (const apt of existingAppointments) {
      const [aptHours, aptMinutes] = apt.time.split(':').map(Number)
      const aptStartMinutes = aptHours * 60 + aptMinutes
      const aptEndMinutes = aptStartMinutes + (apt.service?.duration || 30)

      if (newStartMinutes < aptEndMinutes && newEndMinutes > aptStartMinutes) {
        throw new Error('OVERLAP_CONFLICT')
      }
    }

    // No hay solapamiento, crear la cita
    const newAppointment = await tx.appointment.create({
      data: appointmentData
    })

    return newAppointment
  })
}

module.exports = { checkTimeOverlap, createAppointmentWithOverlapCheck }
