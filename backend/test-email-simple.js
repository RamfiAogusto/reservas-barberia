const { Resend } = require('resend');

// Usar la API key directamente para la prueba
const resend = new Resend('re_BM7CX92n_FfzX6zbHosaL35uNFSsPhSZm');

async function testResendBasic() {
  console.log('🧪 Probando conexión básica con Resend...\n');

  try {
    const result = await resend.emails.send({
      from: 'onboarding@resend.dev',
      to: 'ramfiaogusto@gmail.com',
      subject: '✅ Prueba de Sistema de Emails - ReservaBarber',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: #4F46E5; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
            <h1>💈 ReservaBarber</h1>
            <h2>¡Sistema de Emails Funcionando!</h2>
          </div>
          
          <div style="background: white; padding: 30px; border: 1px solid #ddd; border-radius: 0 0 8px 8px;">
            <p>¡Hola!</p>
            
            <p>Este es un email de prueba para verificar que el sistema de emails con Resend está funcionando correctamente.</p>
            
            <div style="background: #f3f4f6; padding: 15px; border-radius: 6px; margin: 15px 0;">
              <h3>✅ Funcionalidades Implementadas:</h3>
              <ul>
                <li>📧 Emails de confirmación de citas</li>
                <li>⏰ Emails de recordatorio</li>
                <li>❌ Emails de cancelación</li>
                <li>⚠️ Políticas de no-show visibles</li>
              </ul>
            </div>

            <p><strong>¡El sistema está listo para usar!</strong></p>
            
            <p>Saludos,<br>Equipo de ReservaBarber</p>
          </div>
        </div>
      `
    });

    console.log('✅ Email enviado exitosamente!');
    console.log('📨 Message ID:', result.id);
    console.log('📬 Revisa tu email: ramfiaogusto@gmail.com');

  } catch (error) {
    console.log('❌ Error enviando email:', error.message);
    console.log('🔍 Detalles del error:', error);
  }
}

testResendBasic(); 