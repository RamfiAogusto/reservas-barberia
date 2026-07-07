/**
 * Ejecuta una promesa "fire-and-forget" (ej. envío de email o cola)
 * y registra el resultado con contexto, sin bloquear ni propagar el error
 * al flujo principal de la request.
 *
 * Reemplaza el patrón repetido `promise.then(...).catch(...)` disperso
 * en las rutas, centralizando el formato de logging de éxito/fallo.
 *
 * @param {Promise<{success?: boolean, error?: string} | any>} promise
 * @param {string} label - Descripción corta de la operación (ej. "email de confirmación").
 * @returns {Promise<void>}
 */
async function sendAndLog(promise, label) {
  try {
    const result = await promise
    if (result && typeof result === 'object' && 'success' in result) {
      if (result.success) {
        console.log(`✅ ${label}: completado`)
      } else {
        console.error(`❌ ${label}: falló -`, result.error || result.message || 'sin detalle')
      }
    } else {
      console.log(`✅ ${label}: completado`)
    }
  } catch (error) {
    console.error(`❌ ${label}: excepción -`, error.message || error)
  }
}

module.exports = sendAndLog
