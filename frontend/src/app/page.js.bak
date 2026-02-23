"use client"

import Link from 'next/link'

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
      {/* Header */}
      <header className="px-4 lg:px-6 h-20 flex items-center justify-between bg-white/80 backdrop-blur-sm border-b border-gray-200/50 sticky top-0 z-50">
        <div className="flex items-center">
          <span className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
            💈 ReservaBarber
          </span>
        </div>
        <nav className="flex gap-4">
          <Link 
            href="/login" 
            className="px-6 py-2 text-gray-700 hover:text-blue-600 font-medium transition-colors duration-200"
          >
            Iniciar Sesión
          </Link>
          <Link 
            href="/register" 
            className="px-6 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg font-medium hover:from-blue-700 hover:to-indigo-700 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
          >
            Registrarse
          </Link>
        </nav>
      </header>

      {/* Hero Section */}
      <main className="container mx-auto px-4 py-16">
        <div className="text-center max-w-5xl mx-auto">
          <div className="mb-8">
            <span className="inline-block px-4 py-2 bg-blue-100 text-blue-800 rounded-full text-sm font-medium mb-6">
              🚀 Sistema de Gestión Profesional
            </span>
          </div>
          
          <h1 className="text-5xl md:text-7xl font-bold text-gray-900 mb-8 leading-tight">
            Gestiona tu barbería
            <span className="block bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
              de forma profesional
            </span>
          </h1>
          
          <p className="text-xl md:text-2xl text-gray-600 mb-12 max-w-3xl mx-auto leading-relaxed">
            Sistema completo para gestionar citas, clientes y horarios. 
            <span className="font-semibold text-gray-800">Tu barbería siempre organizada y tus clientes satisfechos.</span>
          </p>

          <div className="flex flex-col sm:flex-row gap-6 justify-center mb-16">
            <Link 
              href="/register" 
              className="px-10 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl font-bold text-lg hover:from-blue-700 hover:to-indigo-700 transition-all duration-300 shadow-xl hover:shadow-2xl transform hover:-translate-y-1"
            >
              🚀 Comenzar Gratis
            </Link>
            <Link 
              href="/ramfi_aog" 
              className="px-10 py-4 border-2 border-gray-300 text-gray-700 rounded-xl font-bold text-lg hover:border-blue-500 hover:text-blue-600 transition-all duration-300 hover:shadow-lg transform hover:-translate-y-1"
            >
              🏪 Ver Perfil Demo
            </Link>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto mb-20">
            <div className="text-center">
              <div className="text-3xl font-bold text-blue-600 mb-2">100%</div>
              <div className="text-gray-600">Gratuito</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-blue-600 mb-2">24/7</div>
              <div className="text-gray-600">Disponible</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-blue-600 mb-2">5 min</div>
              <div className="text-gray-600">Configuración</div>
            </div>
          </div>
        </div>

        {/* Demo Notice */}
        <div className="mb-20">
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-2xl p-8 max-w-2xl mx-auto text-center">
            <div className="text-4xl mb-4">💡</div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">Prueba el perfil público</h3>
            <p className="text-blue-800 mb-4">
              Ve cómo los clientes verán tu salón visitando el perfil demo
            </p>
            <Link 
              href="/ramfi_aog" 
              className="inline-flex items-center px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors duration-200"
            >
              Ver Demo →
            </Link>
          </div>
        </div>

        {/* Features - Primera fila */}
        <div className="grid md:grid-cols-3 gap-8 mb-8">
          <div className="group bg-white rounded-2xl p-8 shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 border border-gray-100">
            <div className="text-5xl mb-6 group-hover:scale-110 transition-transform duration-300">📅</div>
            <h3 className="text-2xl font-bold text-gray-900 mb-4">Gestión de Citas</h3>
            <p className="text-gray-600 leading-relaxed">
              Calendario inteligente con disponibilidad automática y gestión completa de citas desde el dashboard.
            </p>
          </div>
          
          <div className="group bg-white rounded-2xl p-8 shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 border border-gray-100">
            <div className="text-5xl mb-6 group-hover:scale-110 transition-transform duration-300">📧</div>
            <h3 className="text-2xl font-bold text-gray-900 mb-4">Emails Automáticos</h3>
            <p className="text-gray-600 leading-relaxed">
              Confirmaciones automáticas por email y recordatorios para reducir inasistencias.
            </p>
          </div>
          
          <div className="group bg-white rounded-2xl p-8 shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 border border-gray-100">
            <div className="text-5xl mb-6 group-hover:scale-110 transition-transform duration-300">👥</div>
            <h3 className="text-2xl font-bold text-gray-900 mb-4">Perfil Público</h3>
            <p className="text-gray-600 leading-relaxed">
              Tu propia página web donde los clientes pueden ver servicios y reservar directamente.
            </p>
          </div>
        </div>

        {/* Segunda fila de características */}
        <div className="grid md:grid-cols-3 gap-8 mb-20">
          <div className="group bg-white rounded-2xl p-8 shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 border border-gray-100">
            <div className="text-5xl mb-6 group-hover:scale-110 transition-transform duration-300">🖼️</div>
            <h3 className="text-2xl font-bold text-gray-900 mb-4">Galería de Imágenes</h3>
            <p className="text-gray-600 leading-relaxed">
              Sube y gestiona fotos de tu negocio para mostrar en tu perfil público.
            </p>
          </div>
          
          <div className="group bg-white rounded-2xl p-8 shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 border border-gray-100">
            <div className="text-5xl mb-6 group-hover:scale-110 transition-transform duration-300">⚙️</div>
            <h3 className="text-2xl font-bold text-gray-900 mb-4">Horarios Avanzados</h3>
            <p className="text-gray-600 leading-relaxed">
              Configura horarios por día, descansos y excepciones para días especiales.
            </p>
          </div>
          
          <div className="group bg-white rounded-2xl p-8 shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 border border-gray-100">
            <div className="text-5xl mb-6 group-hover:scale-110 transition-transform duration-300">📊</div>
            <h3 className="text-2xl font-bold text-gray-900 mb-4">Dashboard Completo</h3>
            <p className="text-gray-600 leading-relaxed">
              Estadísticas en tiempo real, gestión de servicios y control total de tu negocio.
            </p>
          </div>
        </div>

        {/* Sección de Tecnologías */}
        <section className="mb-20">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
              Tecnologías Modernas
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
              Desarrollado con las mejores tecnologías para garantizar rendimiento, seguridad y escalabilidad.
            </p>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 max-w-6xl mx-auto">
            <div className="group text-center p-8 bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2">
              <div className="text-4xl mb-4 group-hover:scale-110 transition-transform duration-300">⚛️</div>
              <h3 className="text-xl font-bold text-gray-800 mb-2">Next.js 14</h3>
              <p className="text-gray-600">App Router</p>
            </div>
            
            <div className="group text-center p-8 bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2">
              <div className="text-4xl mb-4 group-hover:scale-110 transition-transform duration-300">🎨</div>
              <h3 className="text-xl font-bold text-gray-800 mb-2">TailwindCSS</h3>
              <p className="text-gray-600">Diseño Responsive</p>
            </div>
            
            <div className="group text-center p-8 bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2">
              <div className="text-4xl mb-4 group-hover:scale-110 transition-transform duration-300">🗄️</div>
              <h3 className="text-xl font-bold text-gray-800 mb-2">PostgreSQL</h3>
              <p className="text-gray-600">Base de Datos</p>
            </div>
            
            <div className="group text-center p-8 bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2">
              <div className="text-4xl mb-4 group-hover:scale-110 transition-transform duration-300">🔐</div>
              <h3 className="text-xl font-bold text-gray-800 mb-2">JWT</h3>
              <p className="text-gray-600">Autenticación</p>
            </div>
          </div>
        </section>

        {/* Sección de Funcionalidades Detalladas */}
        <section className="mb-20">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
              Funcionalidades Implementadas
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
              Sistema completo y funcional con todas las herramientas necesarias para gestionar tu barbería.
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 gap-8 max-w-7xl mx-auto">
            {/* Panel de Administración */}
            <div className="group bg-white rounded-2xl shadow-xl p-8 hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 border border-gray-100">
              <h3 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
                <span className="text-3xl mr-4 group-hover:scale-110 transition-transform duration-300">⚙️</span>
                Panel de Administración
              </h3>
              <ul className="space-y-4 text-gray-600">
                <li className="flex items-center group/item">
                  <span className="text-green-500 mr-3 text-xl group-hover/item:scale-110 transition-transform duration-200">✅</span>
                  <span className="group-hover/item:text-gray-800 transition-colors duration-200">Dashboard con estadísticas en tiempo real</span>
                </li>
                <li className="flex items-center group/item">
                  <span className="text-green-500 mr-3 text-xl group-hover/item:scale-110 transition-transform duration-200">✅</span>
                  <span className="group-hover/item:text-gray-800 transition-colors duration-200">Gestión completa de citas (crear, editar, cancelar)</span>
                </li>
                <li className="flex items-center group/item">
                  <span className="text-green-500 mr-3 text-xl group-hover/item:scale-110 transition-transform duration-200">✅</span>
                  <span className="group-hover/item:text-gray-800 transition-colors duration-200">Configuración de servicios y precios</span>
                </li>
                <li className="flex items-center group/item">
                  <span className="text-green-500 mr-3 text-xl group-hover/item:scale-110 transition-transform duration-200">✅</span>
                  <span className="group-hover/item:text-gray-800 transition-colors duration-200">Gestión de horarios avanzada</span>
                </li>
                <li className="flex items-center group/item">
                  <span className="text-green-500 mr-3 text-xl group-hover/item:scale-110 transition-transform duration-200">✅</span>
                  <span className="group-hover/item:text-gray-800 transition-colors duration-200">Galería de imágenes con categorías</span>
                </li>
              </ul>
            </div>

            {/* Perfil Público */}
            <div className="group bg-white rounded-2xl shadow-xl p-8 hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 border border-gray-100">
              <h3 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
                <span className="text-3xl mr-4 group-hover:scale-110 transition-transform duration-300">🌐</span>
                Perfil Público
              </h3>
              <ul className="space-y-4 text-gray-600">
                <li className="flex items-center group/item">
                  <span className="text-green-500 mr-3 text-xl group-hover/item:scale-110 transition-transform duration-200">✅</span>
                  <span className="group-hover/item:text-gray-800 transition-colors duration-200">URL personalizada para cada salón</span>
                </li>
                <li className="flex items-center group/item">
                  <span className="text-green-500 mr-3 text-xl group-hover/item:scale-110 transition-transform duration-200">✅</span>
                  <span className="group-hover/item:text-gray-800 transition-colors duration-200">Catálogo de servicios con precios</span>
                </li>
                <li className="flex items-center group/item">
                  <span className="text-green-500 mr-3 text-xl group-hover/item:scale-110 transition-transform duration-200">✅</span>
                  <span className="group-hover/item:text-gray-800 transition-colors duration-200">Galería de imágenes del negocio</span>
                </li>
                <li className="flex items-center group/item">
                  <span className="text-green-500 mr-3 text-xl group-hover/item:scale-110 transition-transform duration-200">✅</span>
                  <span className="group-hover/item:text-gray-800 transition-colors duration-200">Sistema de reservas en 4 pasos</span>
                </li>
                <li className="flex items-center group/item">
                  <span className="text-green-500 mr-3 text-xl group-hover/item:scale-110 transition-transform duration-200">✅</span>
                  <span className="group-hover/item:text-gray-800 transition-colors duration-200">Calendario con disponibilidad en tiempo real</span>
                </li>
              </ul>
            </div>

            {/* Sistema de Reservas */}
            <div className="group bg-white rounded-2xl shadow-xl p-8 hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 border border-gray-100">
              <h3 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
                <span className="text-3xl mr-4 group-hover:scale-110 transition-transform duration-300">📅</span>
                Sistema de Reservas
              </h3>
              <ul className="space-y-4 text-gray-600">
                <li className="flex items-center group/item">
                  <span className="text-green-500 mr-3 text-xl group-hover/item:scale-110 transition-transform duration-200">✅</span>
                  <span className="group-hover/item:text-gray-800 transition-colors duration-200">Verificación de disponibilidad en tiempo real</span>
                </li>
                <li className="flex items-center group/item">
                  <span className="text-green-500 mr-3 text-xl group-hover/item:scale-110 transition-transform duration-200">✅</span>
                  <span className="group-hover/item:text-gray-800 transition-colors duration-200">Gestión de horarios por día de la semana</span>
                </li>
                <li className="flex items-center group/item">
                  <span className="text-green-500 mr-3 text-xl group-hover/item:scale-110 transition-transform duration-200">✅</span>
                  <span className="group-hover/item:text-gray-800 transition-colors duration-200">Descansos y excepciones de horario</span>
                </li>
                <li className="flex items-center group/item">
                  <span className="text-green-500 mr-3 text-xl group-hover/item:scale-110 transition-transform duration-200">✅</span>
                  <span className="group-hover/item:text-gray-800 transition-colors duration-200">Consideración de duración de servicios</span>
                </li>
                <li className="flex items-center group/item">
                  <span className="text-green-500 mr-3 text-xl group-hover/item:scale-110 transition-transform duration-200">✅</span>
                  <span className="group-hover/item:text-gray-800 transition-colors duration-200">Proceso de reserva optimizado para móviles</span>
                </li>
              </ul>
            </div>

            {/* Comunicación */}
            <div className="group bg-white rounded-2xl shadow-xl p-8 hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 border border-gray-100">
              <h3 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
                <span className="text-3xl mr-4 group-hover:scale-110 transition-transform duration-300">📧</span>
                Sistema de Comunicación
              </h3>
              <ul className="space-y-4 text-gray-600">
                <li className="flex items-center group/item">
                  <span className="text-green-500 mr-3 text-xl group-hover/item:scale-110 transition-transform duration-200">✅</span>
                  <span className="group-hover/item:text-gray-800 transition-colors duration-200">Emails de confirmación automáticos</span>
                </li>
                <li className="flex items-center group/item">
                  <span className="text-green-500 mr-3 text-xl group-hover/item:scale-110 transition-transform duration-200">✅</span>
                  <span className="group-hover/item:text-gray-800 transition-colors duration-200">Plantillas HTML profesionales</span>
                </li>
                <li className="flex items-center group/item">
                  <span className="text-green-500 mr-3 text-xl group-hover/item:scale-110 transition-transform duration-200">✅</span>
                  <span className="group-hover/item:text-gray-800 transition-colors duration-200">Políticas de no-show incluidas</span>
                </li>
                <li className="flex items-center group/item">
                  <span className="text-green-500 mr-3 text-xl group-hover/item:scale-110 transition-transform duration-200">✅</span>
                  <span className="group-hover/item:text-gray-800 transition-colors duration-200">Integración con Resend para alta entregabilidad</span>
                </li>
                <li className="flex items-center group/item">
                  <span className="text-green-500 mr-3 text-xl group-hover/item:scale-110 transition-transform duration-200">✅</span>
                  <span className="group-hover/item:text-gray-800 transition-colors duration-200">Sistema de recordatorios programados</span>
                </li>
              </ul>
            </div>
          </div>
        </section>

        {/* CTA Final */}
        <section className="mb-20">
          <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 rounded-3xl p-12 md:p-16 text-white text-center relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-blue-600/20 to-purple-600/20"></div>
            <div className="relative z-10">
              <h2 className="text-4xl md:text-6xl font-bold mb-6">
                ¿Listo para digitalizar tu barbería?
              </h2>
              <p className="text-xl md:text-2xl text-blue-100 mb-10 max-w-3xl mx-auto leading-relaxed">
                Únete a cientos de barberos que ya están gestionando su negocio de forma profesional.
              </p>
              <div className="flex flex-col sm:flex-row gap-6 justify-center">
                <Link 
                  href="/register" 
                  className="px-10 py-4 bg-white text-blue-600 rounded-xl font-bold text-lg hover:bg-gray-100 transition-all duration-300 shadow-xl hover:shadow-2xl transform hover:-translate-y-1"
                >
                  🚀 Comenzar Gratis
                </Link>
                <Link 
                  href="/ramfi_aog" 
                  className="px-10 py-4 border-2 border-white text-white rounded-xl font-bold text-lg hover:bg-white hover:text-blue-600 transition-all duration-300 hover:shadow-xl transform hover:-translate-y-1"
                >
                  🏪 Ver Demo
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="container mx-auto px-4 text-center">
          <div className="mb-6">
            <span className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent">
              💈 ReservaBarber
            </span>
          </div>
          <p className="text-gray-400">&copy; 2025 ReservaBarber. Todos los derechos reservados.</p>
        </div>
      </footer>
    </div>
  )
} 