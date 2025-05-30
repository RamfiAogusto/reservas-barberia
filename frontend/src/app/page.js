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
            Sistema completo para gestionar citas, clientes y pagos. 
            Tu barbería siempre organizada y tus clientes satisfechos.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/register" className="btn-primary text-lg px-8 py-3">
              Comenzar Gratis
            </Link>
            <Link href="#demo" className="btn-secondary text-lg px-8 py-3">
              Ver Demo
            </Link>
          </div>
        </div>

        {/* Features */}
        <div className="grid md:grid-cols-3 gap-8 mt-20">
          <div className="card text-center">
            <div className="text-4xl mb-4">📅</div>
            <h3 className="text-xl font-semibold mb-2">Gestión de Citas</h3>
            <p className="text-gray-600">
              Calendario inteligente con disponibilidad automática y recordatorios.
            </p>
          </div>
          
          <div className="card text-center">
            <div className="text-4xl mb-4">💳</div>
            <h3 className="text-xl font-semibold mb-2">Pagos Integrados</h3>
            <p className="text-gray-600">
              Cobra anticipos automáticamente y reduce las inasistencias.
            </p>
          </div>
          
          <div className="card text-center">
            <div className="text-4xl mb-4">👥</div>
            <h3 className="text-xl font-semibold mb-2">Perfil Público</h3>
            <p className="text-gray-600">
              Tu propia página web donde los clientes pueden reservar directamente.
            </p>
          </div>
        </div>

        {/* Demo Section */}
        <section id="demo" className="mt-20 text-center">
          <h2 className="text-3xl font-bold text-gray-900 mb-8">
            Mira cómo funciona
          </h2>
          <div className="bg-white rounded-lg shadow-lg p-8 max-w-4xl mx-auto">
            <div className="bg-gray-100 h-64 rounded-lg flex items-center justify-center">
              <p className="text-gray-500 text-lg">
                🎬 Video demo próximamente
              </p>
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