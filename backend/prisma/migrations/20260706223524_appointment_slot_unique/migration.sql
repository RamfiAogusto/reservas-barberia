-- Backstop de base de datos contra reservas duplicadas (double-booking).
-- La aplicación ya valida solapamiento de horario dentro de una transacción
-- (ver backend/utils/availabilityUtils.js), pero este índice parcial único
-- actúa como última línea de defensa ante condiciones de carrera o accesos
-- directos a la base de datos.
--
-- Nota: esta restricción es por (userId, barberId, date, time) exactos, es
-- decir, evita que dos citas activas compartan el mismo barbero (o "sin
-- barbero" cuando barberId es NULL) en el mismo salón, fecha y hora exacta.
-- No reemplaza la verificación de solapamiento por duración del servicio
-- que hace la aplicación (dos citas que se cruzan en minutos distintos de
-- inicio no son detectadas por este índice).
--
-- barberId puede ser NULL (salón sin barberos / modo "cualquier barbero").
-- Un índice único parcial en Postgres permite múltiples filas con NULL en
-- una columna indexada, así que esto NO bloquea múltiples citas con
-- barberId NULL en el mismo (userId, date, time); esas se siguen protegiendo
-- únicamente por la verificación transaccional en la aplicación.
CREATE UNIQUE INDEX IF NOT EXISTS "appointment_slot_unique"
  ON "appointments" ("userId", "barberId", "date", "time")
  WHERE "status" NOT IN ('CANCELADA', 'EXPIRADA');
