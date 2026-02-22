/**
 * Servicio abstracto de pasarela de pago.
 * 
 * Actualmente es un placeholder. En producción se reemplazará
 * con la integración real de Stripe o Polar.
 * 
 * Todas las funciones siguen la misma interfaz independientemente
 * del proveedor que se elija.
 */

// ──────────── Configuración ────────────
// En producción se leería de env:
// const GATEWAY = process.env.PAYMENT_GATEWAY || 'stripe' // 'stripe' | 'polar'

/**
 * Crea una sesión de pago para cobrar el depósito.
 * 
 * @param {Object} options
 * @param {string} options.appointmentId  - ID de la cita
 * @param {string} options.groupId        - ID de grupo (multi-servicio)
 * @param {number} options.amount         - Monto del depósito en centavos
 * @param {string} options.currency       - Moneda (ej: 'usd', 'dop')
 * @param {string} options.customerEmail  - Email del cliente
 * @param {string} options.customerName   - Nombre del cliente
 * @param {string} options.description    - Descripción del pago
 * @param {string} options.successUrl     - URL de redirección al completar pago
 * @param {string} options.cancelUrl      - URL de redirección al cancelar
 * @param {Object} options.metadata       - Metadata extra (paymentToken, salonUsername, etc.)
 * @returns {Promise<{sessionId: string, paymentUrl: string}>}
 */
async function createPaymentSession(options) {
  console.log('[PaymentGateway] createPaymentSession llamado (placeholder)', {
    appointmentId: options.appointmentId,
    amount: options.amount,
    currency: options.currency
  })

  // TODO: Reemplazar con integración real
  // Stripe: const session = await stripe.checkout.sessions.create({...})
  // Polar:  const session = await polar.checkouts.create({...})

  const mockSessionId = `mock_session_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
  const mockPaymentUrl = `${options.successUrl}?session_id=${mockSessionId}&mock=true`

  return {
    sessionId: mockSessionId,
    paymentUrl: mockPaymentUrl
  }
}

/**
 * Verifica si un pago fue completado exitosamente.
 * 
 * @param {string} sessionId - ID de la sesión de pago
 * @returns {Promise<{paid: boolean, amount: number, method: string}>}
 */
async function verifyPayment(sessionId) {
  console.log('[PaymentGateway] verifyPayment llamado (placeholder)', { sessionId })

  // TODO: Reemplazar con verificación real
  // Stripe: const session = await stripe.checkout.sessions.retrieve(sessionId)
  // Polar:  const checkout = await polar.checkouts.get(sessionId)

  // En modo placeholder, siempre retorna pagado (para testing)
  return {
    paid: true,
    amount: 0, // Se llenará con el monto real
    method: 'PASARELA'
  }
}

/**
 * Procesa un webhook del proveedor de pago.
 * 
 * @param {Object} options
 * @param {Buffer|string} options.rawBody  - Body crudo del request
 * @param {string} options.signature       - Header de firma (stripe-signature, etc.)
 * @returns {Promise<{event: string, sessionId: string, metadata: Object}|null>}
 */
async function handleWebhook(options) {
  console.log('[PaymentGateway] handleWebhook llamado (placeholder)')

  // TODO: Reemplazar con verificación real de webhook
  // Stripe: const event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret)
  // Polar:  verificar firma HMAC

  return null
}

/**
 * Verifica si la pasarela de pago está configurada.
 * @returns {boolean}
 */
function isConfigured() {
  // TODO: Verificar que las API keys estén presentes
  // return !!process.env.STRIPE_SECRET_KEY || !!process.env.POLAR_API_KEY
  return false
}

module.exports = {
  createPaymentSession,
  verifyPayment,
  handleWebhook,
  isConfigured
}
