/**
 * Constantes compartidas que reflejan los enums definidos en prisma/schema.prisma.
 * Mantener sincronizado manualmente con el schema: si se agrega/quita un valor
 * de un enum, actualizar también este archivo.
 */

// Enum AppointmentStatus (schema.prisma)
const APPOINTMENT_STATUSES = [
  'PENDIENTE',
  'ESPERANDO_PAGO',
  'CONFIRMADA',
  'COMPLETADA',
  'CANCELADA',
  'NO_ASISTIO',
  'EXPIRADA'
]

// Enum PaymentStatus (schema.prisma)
const PAYMENT_STATUSES = [
  'PENDIENTE',
  'PARCIAL',
  'COMPLETO',
  'REEMBOLSADO'
]

// Enum PaymentMethod (schema.prisma)
const PAYMENT_METHODS = [
  'EFECTIVO',
  'TARJETA',
  'TRANSFERENCIA',
  'STRIPE',
  'PAYPAL',
  'PASARELA'
]

// Enum RecurrenceType (schema.prisma)
const RECURRENCE_TYPES = [
  'DAILY',
  'WEEKLY',
  'SPECIFIC_DAYS'
]

// Enum ExceptionType (schema.prisma)
const EXCEPTION_TYPES = [
  'DAY_OFF',
  'SPECIAL_HOURS',
  'VACATION',
  'HOLIDAY'
]

module.exports = {
  APPOINTMENT_STATUSES,
  PAYMENT_STATUSES,
  PAYMENT_METHODS,
  RECURRENCE_TYPES,
  EXCEPTION_TYPES
}
