"use client"

import Link from 'next/link'

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-blue-100">
      {/* Header */}
      <header className="px-4 lg:px-6 h-16 flex items-center justify-between">
        <div className="flex items-center">
          <span className="text-2xl font-bold text-primary-800">💈 ReservaBarber</span>
        </div>
        <nav className="flex gap-4">
          <Link href="/login" className="btn-secondary">
            Iniciar Sesión
          </Link>
          <Link href="/register" className="btn-primary">
            Registrarse
          </Link>
        </nav>
      </header>

      {/* Hero Section */}
      <main className="container mx-auto px-4 py-12">
        <div className="text-center max-w-4xl mx-auto">
          <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-6">
            Gestiona tu barbería
            <span className="text-primary-600 block">de forma profesional</span>
          </h1>
          
          <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
            Sistema completo para gestionar citas, clientes y horarios. 
            Tu barbería siempre organizada y tus clientes satisfechos.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/register" className="btn-primary text-lg px-8 py-3">
              Comenzar Gratis
            </Link>
            <Link href="/ramfi_aog" className="btn-secondary text-lg px-8 py-3">
              🏪 Ver Perfil Demo
            </Link>
          </div>
        </div>

        {/* Demo Notice */}
        <div className="mt-8 text-center">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 max-w-md mx-auto">
            <p className="text-blue-800 text-sm">
              <span className="font-semibold">💡 Prueba el perfil público:</span><br/>
              Ve cómo los clientes verán tu salón visitando el 
              <Link href="/ramfi_aog" className="underline font-medium">perfil demo</Link>
            </p>
          </div>
        </div>

        {/* Features - Actualizado con funcionalidades reales */}
        <div className="grid md:grid-cols-3 gap-8 mt-20">
          <div className="card text-center">
            <div className="text-4xl mb-4">📅</div>
            <h3 className="text-xl font-semibold mb-2">Gestión de Citas</h3>
            <p className="text-gray-600">
              Calendario inteligente con disponibilidad automática y gestión completa de citas desde el dashboard.
            </p>
          </div>
          
          <div className="card text-center">
            <div className="text-4xl mb-4">📧</div>
            <h3 className="text-xl font-semibold mb-2">Emails Automáticos</h3>
            <p className="text-gray-600">
              Confirmaciones automáticas por email y recordatorios para reducir inasistencias.
            </p>
          </div>
          
          <div className="card text-center">
            <div className="text-4xl mb-4">👥</div>
            <h3 className="text-xl font-semibold mb-2">Perfil Público</h3>
            <p className="text-gray-600">
              Tu propia página web donde los clientes pueden ver servicios y reservar directamente.
            </p>
          </div>
        </div>

        {/* Segunda fila de características */}
        <div className="grid md:grid-cols-3 gap-8 mt-8">
          <div className="card text-center">
            <div className="text-4xl mb-4">🖼️</div>
            <h3 className="text-xl font-semibold mb-2">Galería de Imágenes</h3>
            <p className="text-gray-600">
              Sube y gestiona fotos de tu negocio para mostrar en tu perfil público.
            </p>
          </div>
          
          <div className="card text-center">
            <div className="text-4xl mb-4">⚙️</div>
            <h3 className="text-xl font-semibold mb-2">Horarios Avanzados</h3>
            <p className="text-gray-600">
              Configura horarios por día, descansos y excepciones para días especiales.
            </p>
          </div>
          
          <div className="card text-center">
            <div className="text-4xl mb-4">📊</div>
            <h3 className="text-xl font-semibold mb-2">Dashboard Completo</h3>
            <p className="text-gray-600">
              Estadísticas en tiempo real, gestión de servicios y control total de tu negocio.
            </p>
          </div>
        </div>

        {/* Sección de Tecnologías */}
        <section className="mt-20">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Tecnologías Modernas
            </h2>
            <p className="text-gray-600 max-w-2xl mx-auto">
              Desarrollado con las mejores tecnologías para garantizar rendimiento, seguridad y escalabilidad.
            </p>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-4xl mx-auto">
            <div className="text-center p-4">
              <div className="text-3xl mb-2">⚛️</div>
              <h3 className="font-semibold text-gray-800">Next.js 14</h3>
              <p className="text-sm text-gray-600">App Router</p>
            </div>
            
            <div className="text-center p-4">
              <div className="text-3xl mb-2">🎨</div>
              <h3 className="font-semibold text-gray-800">TailwindCSS</h3>
              <p className="text-sm text-gray-600">Diseño Responsive</p>
            </div>
            
            <div className="text-center p-4">
              <div className="text-3xl mb-2">🗄️</div>
              <h3 className="font-semibold text-gray-800">PostgreSQL</h3>
              <p className="text-sm text-gray-600">Base de Datos</p>
            </div>
            
            <div className="text-center p-4">
              <div className="text-3xl mb-2">🔐</div>
              <h3 className="font-semibold text-gray-800">JWT</h3>
              <p className="text-sm text-gray-600">Autenticación</p>
            </div>
          </div>
        </section>

        {/* Sección de Funcionalidades Detalladas */}
        <section className="mt-20">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Funcionalidades Implementadas
            </h2>
            <p className="text-gray-600 max-w-2xl mx-auto">
              Sistema completo y funcional con todas las herramientas necesarias para gestionar tu barbería.
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 gap-8 max-w-6xl mx-auto">
            {/* Panel de Administración */}
            <div className="bg-white rounded-lg shadow-lg p-6">
              <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
                <span className="text-2xl mr-3">⚙️</span>
                Panel de Administración
              </h3>
              <ul className="space-y-2 text-gray-600">
                <li className="flex items-center">
                  <span className="text-green-500 mr-2">✅</span>
                  Dashboard con estadísticas en tiempo real
                </li>
                <li className="flex items-center">
                  <span className="text-green-500 mr-2">✅</span>
                  Gestión completa de citas (crear, editar, cancelar)
                </li>
                <li className="flex items-center">
                  <span className="text-green-500 mr-2">✅</span>
                  Configuración de servicios y precios
                </li>
                <li className="flex items-center">
                  <span className="text-green-500 mr-2">✅</span>
                  Gestión de horarios avanzada
                </li>
                <li className="flex items-center">
                  <span className="text-green-500 mr-2">✅</span>
                  Galería de imágenes con categorías
                </li>
              </ul>
            </div>

            {/* Perfil Público */}
            <div className="bg-white rounded-lg shadow-lg p-6">
              <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
                <span className="text-2xl mr-3">🌐</span>
                Perfil Público
              </h3>
              <ul className="space-y-2 text-gray-600">
                <li className="flex items-center">
                  <span className="text-green-500 mr-2">✅</span>
                  URL personalizada para cada salón
                </li>
                <li className="flex items-center">
                  <span className="text-green-500 mr-2">✅</span>
                  Catálogo de servicios con precios
                </li>
                <li className="flex items-center">
                  <span className="text-green-500 mr-2">✅</span>
                  Galería de imágenes del negocio
                </li>
                <li className="flex items-center">
                  <span className="text-green-500 mr-2">✅</span>
                  Sistema de reservas en 4 pasos
                </li>
                <li className="flex items-center">
                  <span className="text-green-500 mr-2">✅</span>
                  Calendario con disponibilidad en tiempo real
                </li>
              </ul>
            </div>

            {/* Sistema de Reservas */}
            <div className="bg-white rounded-lg shadow-lg p-6">
              <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
                <span className="text-2xl mr-3">📅</span>
                Sistema de Reservas
              </h3>
              <ul className="space-y-2 text-gray-600">
                <li className="flex items-center">
                  <span className="text-green-500 mr-2">✅</span>
                  Verificación de disponibilidad en tiempo real
                </li>
                <li className="flex items-center">
                  <span className="text-green-500 mr-2">✅</span>
                  Gestión de horarios por día de la semana
                </li>
                <li className="flex items-center">
                  <span className="text-green-500 mr-2">✅</span>
                  Descansos y excepciones de horario
                </li>
                <li className="flex items-center">
                  <span className="text-green-500 mr-2">✅</span>
                  Consideración de duración de servicios
                </li>
                <li className="flex items-center">
                  <span className="text-green-500 mr-2">✅</span>
                  Proceso de reserva optimizado para móviles
                </li>
              </ul>
            </div>

            {/* Comunicación */}
            <div className="bg-white rounded-lg shadow-lg p-6">
              <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
                <span className="text-2xl mr-3">📧</span>
                Sistema de Comunicación
              </h3>
              <ul className="space-y-2 text-gray-600">
                <li className="flex items-center">
                  <span className="text-green-500 mr-2">✅</span>
                  Emails de confirmación automáticos
                </li>
                <li className="flex items-center">
                  <span className="text-green-500 mr-2">✅</span>
                  Plantillas HTML profesionales
                </li>
                <li className="flex items-center">
                  <span className="text-green-500 mr-2">✅</span>
                  Políticas de no-show incluidas
                </li>
                <li className="flex items-center">
                  <span className="text-green-500 mr-2">✅</span>
                  Integración con Resend para alta entregabilidad
                </li>
                <li className="flex items-center">
                  <span className="text-green-500 mr-2">✅</span>
                  Sistema de recordatorios programados
                </li>
              </ul>
            </div>
          </div>
        </section>

        {/* CTA Final */}
        <section className="mt-20 text-center">
          <div className="bg-gradient-to-r from-blue-600 to-blue-800 rounded-2xl p-12 text-white">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              ¿Listo para digitalizar tu barbería?
            </h2>
            <p className="text-xl text-blue-100 mb-8 max-w-2xl mx-auto">
              Únete a cientos de barberos que ya están gestionando su negocio de forma profesional.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/register" className="bg-white text-blue-600 px-8 py-4 rounded-lg font-bold text-lg hover:bg-gray-100 transition-all duration-200">
                Comenzar Gratis
              </Link>
              <Link href="/ramfi_aog" className="border-2 border-white text-white px-8 py-4 rounded-lg font-bold text-lg hover:bg-white hover:text-blue-600 transition-all duration-200">
                Ver Demo
              </Link>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-8 mt-20">
        <div className="container mx-auto px-4 text-center">
          <p>&copy; 2025 ReservaBarber. Todos los derechos reservados.</p>
        </div>
      </footer>
    </div>
  )
} 