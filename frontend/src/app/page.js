"use client"

import Link from 'next/link'
import {
  Scissors, Calendar, Mail, Users, Image as ImageIcon, Settings2,
  BarChart3, Store, Lightbulb, CheckCircle2, Atom, Palette, Database,
  Lock, Globe, LayoutDashboard,
} from 'lucide-react'

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-stone-50 via-amber-50 to-stone-100 dark:from-gray-950 dark:via-gray-900 dark:to-gray-900">
      {/* Header */}
      <header className="px-4 lg:px-6 h-20 flex items-center justify-between bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm border-b border-stone-200/50 dark:border-gray-700/50 sticky top-0 z-50">
        <div className="flex items-center gap-2">
          <Scissors className="w-6 h-6 text-primary-600 dark:text-primary-400" aria-hidden="true" />
          <span className="text-2xl font-bold text-stone-900 dark:text-white">
            ReservaBarber
          </span>
        </div>
        <nav className="flex gap-4">
          <Link
            href="/login"
            className="px-6 py-2 text-stone-700 dark:text-gray-300 hover:text-primary-700 dark:hover:text-primary-400 font-medium transition-colors duration-200"
          >
            Iniciar Sesión
          </Link>
          <Link
            href="/register"
            className="px-6 py-2 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700 transition-[background-color,transform] duration-150 active:scale-[0.98] shadow-lg"
          >
            Registrarse
          </Link>
        </nav>
      </header>

      {/* Hero Section */}
      <main className="container mx-auto px-4 py-16">
        <div className="text-center max-w-5xl mx-auto">
          <div className="mb-8">
            <span className="inline-block px-4 py-2 bg-primary-100 dark:bg-primary-900/30 text-primary-800 dark:text-primary-300 rounded-full text-sm font-medium mb-6">
              Sistema de Gestión Profesional
            </span>
          </div>

          <h1 className="text-5xl md:text-7xl font-bold text-stone-900 dark:text-white mb-8 leading-tight">
            Gestiona tu barbería
            <span className="block bg-gradient-to-r from-primary-600 to-primary-800 dark:from-primary-400 dark:to-primary-500 bg-clip-text text-transparent">
              de forma profesional
            </span>
          </h1>

          <p className="text-xl md:text-2xl text-stone-600 dark:text-gray-400 mb-12 max-w-3xl mx-auto leading-relaxed">
            Sistema completo para gestionar citas, clientes y horarios.
            <span className="font-semibold text-stone-800 dark:text-gray-200"> Tu barbería siempre organizada y tus clientes satisfechos.</span>
          </p>

          <div className="flex flex-col sm:flex-row gap-6 justify-center mb-16">
            <Link
              href="/register"
              className="px-10 py-4 bg-primary-600 text-white rounded-xl font-bold text-lg hover:bg-primary-700 transition-[background-color,transform,box-shadow] duration-200 active:scale-[0.98] shadow-xl hover:shadow-2xl"
            >
              Comenzar Gratis
            </Link>
            <Link
              href="/ramfi_aog"
              className="px-10 py-4 border-2 border-stone-300 dark:border-gray-600 text-stone-700 dark:text-gray-300 rounded-xl font-bold text-lg hover:border-primary-500 dark:hover:border-primary-400 hover:text-primary-700 dark:hover:text-primary-400 transition-colors duration-200 active:scale-[0.98]"
            >
              Ver Perfil Demo
            </Link>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto mb-20">
            <div className="text-center">
              <div className="text-3xl font-bold text-primary-700 dark:text-primary-400 mb-2">100%</div>
              <div className="text-stone-600 dark:text-gray-400">Gratuito</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-primary-700 dark:text-primary-400 mb-2">24/7</div>
              <div className="text-stone-600 dark:text-gray-400">Disponible</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-primary-700 dark:text-primary-400 mb-2">5 min</div>
              <div className="text-stone-600 dark:text-gray-400">Configuración</div>
            </div>
          </div>
        </div>

        {/* Demo Notice */}
        <div className="mb-20">
          <div className="bg-primary-50 dark:bg-primary-950/30 border border-primary-200 dark:border-primary-800 rounded-2xl p-8 max-w-2xl mx-auto text-center">
            <Lightbulb className="w-10 h-10 text-primary-600 dark:text-primary-400 mx-auto mb-4" aria-hidden="true" />
            <h3 className="text-xl font-bold text-stone-900 dark:text-white mb-2">Prueba el perfil público</h3>
            <p className="text-primary-800 dark:text-primary-300 mb-4">
              Ve cómo los clientes verán tu salón visitando el perfil demo
            </p>
            <Link
              href="/ramfi_aog"
              className="inline-flex items-center px-6 py-3 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700 transition-[background-color,transform] duration-150 active:scale-[0.98]"
            >
              Ver Demo →
            </Link>
          </div>
        </div>

        {/* Features - Primera fila */}
        <div className="grid md:grid-cols-3 gap-8 mb-8">
          {[
            { Icon: Calendar, title: 'Gestión de Citas', desc: 'Calendario inteligente con disponibilidad automática y gestión completa de citas desde el dashboard.' },
            { Icon: Mail, title: 'Emails Automáticos', desc: 'Confirmaciones automáticas por email y recordatorios para reducir inasistencias.' },
            { Icon: Users, title: 'Perfil Público', desc: 'Tu propia página web donde los clientes pueden ver servicios y reservar directamente.' },
          ].map(f => (
            <div key={f.title} className="bg-white dark:bg-gray-800 rounded-2xl p-8 shadow-lg hover:shadow-xl transition-shadow duration-200 border border-stone-100 dark:border-gray-700">
              <div className="w-14 h-14 rounded-xl bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center text-primary-700 dark:text-primary-400 mb-6">
                <f.Icon className="w-7 h-7" aria-hidden="true" />
              </div>
              <h3 className="text-2xl font-bold text-stone-900 dark:text-white mb-4">{f.title}</h3>
              <p className="text-stone-600 dark:text-gray-400 leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>

        {/* Segunda fila */}
        <div className="grid md:grid-cols-3 gap-8 mb-20">
          {[
            { Icon: ImageIcon, title: 'Galería de Imágenes', desc: 'Sube y gestiona fotos de tu negocio para mostrar en tu perfil público.' },
            { Icon: Settings2, title: 'Horarios Avanzados', desc: 'Configura horarios por día, descansos y excepciones para días especiales.' },
            { Icon: BarChart3, title: 'Dashboard Completo', desc: 'Estadísticas en tiempo real, gestión de servicios y control total de tu negocio.' },
          ].map(f => (
            <div key={f.title} className="bg-white dark:bg-gray-800 rounded-2xl p-8 shadow-lg hover:shadow-xl transition-shadow duration-200 border border-stone-100 dark:border-gray-700">
              <div className="w-14 h-14 rounded-xl bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center text-primary-700 dark:text-primary-400 mb-6">
                <f.Icon className="w-7 h-7" aria-hidden="true" />
              </div>
              <h3 className="text-2xl font-bold text-stone-900 dark:text-white mb-4">{f.title}</h3>
              <p className="text-stone-600 dark:text-gray-400 leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>

        {/* Tecnologías */}
        <section className="mb-20">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-stone-900 dark:text-white mb-6">Tecnologías Modernas</h2>
            <p className="text-xl text-stone-600 dark:text-gray-400 max-w-3xl mx-auto leading-relaxed">
              Desarrollado con las mejores tecnologías para garantizar rendimiento, seguridad y escalabilidad.
            </p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 max-w-6xl mx-auto">
            {[
              { Icon: Atom, name: 'Next.js 14', sub: 'App Router' },
              { Icon: Palette, name: 'TailwindCSS', sub: 'Diseño Responsive' },
              { Icon: Database, name: 'PostgreSQL', sub: 'Base de Datos' },
              { Icon: Lock, name: 'JWT', sub: 'Autenticación' },
            ].map(t => (
              <div key={t.name} className="text-center p-8 bg-white dark:bg-gray-800 rounded-2xl shadow-lg hover:shadow-xl transition-shadow duration-200">
                <div className="w-12 h-12 mx-auto rounded-xl bg-stone-100 dark:bg-gray-700 flex items-center justify-center text-stone-600 dark:text-gray-300 mb-4">
                  <t.Icon className="w-6 h-6" aria-hidden="true" />
                </div>
                <h3 className="text-xl font-bold text-stone-800 dark:text-gray-100 mb-2">{t.name}</h3>
                <p className="text-stone-600 dark:text-gray-400">{t.sub}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Funcionalidades */}
        <section className="mb-20">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-stone-900 dark:text-white mb-6">Funcionalidades Implementadas</h2>
            <p className="text-xl text-stone-600 dark:text-gray-400 max-w-3xl mx-auto leading-relaxed">
              Sistema completo y funcional con todas las herramientas necesarias para gestionar tu barbería.
            </p>
          </div>
          <div className="grid md:grid-cols-2 gap-8 max-w-7xl mx-auto">
            {[
              { Icon: LayoutDashboard, title: 'Panel de Administración', items: ['Dashboard con estadísticas en tiempo real', 'Gestión completa de citas (crear, editar, cancelar)', 'Configuración de servicios y precios', 'Gestión de horarios avanzada', 'Galería de imágenes con categorías'] },
              { Icon: Globe, title: 'Perfil Público', items: ['URL personalizada para cada salón', 'Catálogo de servicios con precios', 'Galería de imágenes del negocio', 'Sistema de reservas en 4 pasos', 'Calendario con disponibilidad en tiempo real'] },
              { Icon: Calendar, title: 'Sistema de Reservas', items: ['Verificación de disponibilidad en tiempo real', 'Gestión de horarios por día de la semana', 'Descansos y excepciones de horario', 'Consideración de duración de servicios', 'Proceso de reserva optimizado para móviles'] },
              { Icon: Mail, title: 'Sistema de Comunicación', items: ['Emails de confirmación automáticos', 'Plantillas HTML profesionales', 'Políticas de no-show incluidas', 'Integración con Resend para alta entregabilidad', 'Sistema de recordatorios programados'] },
            ].map(section => (
              <div key={section.title} className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 hover:shadow-2xl transition-shadow duration-200 border border-stone-100 dark:border-gray-700">
                <h3 className="text-2xl font-bold text-stone-900 dark:text-white mb-6 flex items-center">
                  <span className="w-11 h-11 mr-4 rounded-xl bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center text-primary-700 dark:text-primary-400 shrink-0">
                    <section.Icon className="w-6 h-6" aria-hidden="true" />
                  </span>
                  {section.title}
                </h3>
                <ul className="space-y-4 text-stone-600 dark:text-gray-400">
                  {section.items.map(item => (
                    <li key={item} className="flex items-center">
                      <CheckCircle2 className="w-5 h-5 text-primary-600 dark:text-primary-400 mr-3 shrink-0" aria-hidden="true" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>

        {/* CTA Final */}
        <section className="mb-20">
          <div className="bg-gradient-to-r from-stone-900 via-stone-800 to-stone-900 rounded-3xl p-12 md:p-16 text-white text-center relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-primary-900/20 to-primary-800/10" aria-hidden="true"></div>
            <div className="relative z-10">
              <h2 className="text-4xl md:text-6xl font-bold mb-6">¿Listo para digitalizar tu barbería?</h2>
              <p className="text-xl md:text-2xl text-stone-300 mb-10 max-w-3xl mx-auto leading-relaxed">
                Únete a cientos de barberos que ya están gestionando su negocio de forma profesional.
              </p>
              <div className="flex flex-col sm:flex-row gap-6 justify-center">
                <Link
                  href="/register"
                  className="px-10 py-4 bg-primary-500 text-stone-950 rounded-xl font-bold text-lg hover:bg-primary-400 transition-[background-color,transform] duration-150 active:scale-[0.98] shadow-xl"
                >
                  Comenzar Gratis
                </Link>
                <Link
                  href="/ramfi_aog"
                  className="px-10 py-4 border-2 border-white text-white rounded-xl font-bold text-lg hover:bg-white hover:text-stone-900 transition-colors duration-200 active:scale-[0.98]"
                >
                  Ver Demo
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-stone-900 text-white py-12">
        <div className="container mx-auto px-4 text-center">
          <div className="mb-6 flex items-center justify-center gap-2">
            <Scissors className="w-5 h-5 text-primary-400" aria-hidden="true" />
            <span className="text-2xl font-bold text-white">
              ReservaBarber
            </span>
          </div>
          <p className="text-stone-400">&copy; 2025 ReservaBarber. Todos los derechos reservados.</p>
        </div>
      </footer>
    </div>
  )
}
