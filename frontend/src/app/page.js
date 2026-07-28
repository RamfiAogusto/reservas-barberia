"use client"

import Link from 'next/link'
import { motion, MotionConfig } from 'motion/react'
import {
  Scissors, Calendar, Mail, CheckCircle2, Globe, CalendarCheck2,
  Settings2, Image as ImageIcon, BarChart3,
} from 'lucide-react'

// Variants compartidas (module-level, reutilizadas en toda la página)
const fadeInUp = {
  hidden: { opacity: 0, y: 16 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: [0.23, 1, 0.32, 1] },
  },
}

const staggerContainer = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.07, delayChildren: 0.1 },
  },
}

const FOCUS_RING =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2'
const FOCUS_RING_LIGHT = `${FOCUS_RING} dark:focus-visible:ring-offset-gray-900`
const FOCUS_RING_DARK = `${FOCUS_RING} focus-visible:ring-offset-stone-900`

const trustItems = [
  { Icon: CheckCircle2, label: 'Gratis, sin tarjeta de crédito' },
  { Icon: Mail, label: 'Confirmaciones por email automáticas' },
  { Icon: Globe, label: 'Tu página pública de reservas incluida' },
  { Icon: CalendarCheck2, label: 'Disponibilidad en tiempo real' },
]

const steps = [
  {
    title: 'Crea tu cuenta',
    desc: 'Regístrate gratis y dale un nombre a tu barbería.',
  },
  {
    title: 'Configura servicios y horarios',
    desc: 'Define qué ofreces, cuánto cuesta y cuándo atiendes. Con descansos y excepciones.',
  },
  {
    title: 'Comparte tu link',
    desc: 'Tu página pública queda lista en reservabarber.com/tu-barbería. Tus clientes reservan desde el celular.',
  },
]

const bentoCards = [
  {
    Icon: Calendar,
    title: 'Gestión de citas',
    desc: 'Calendario del día, semana y mes. Crea, confirma o cancela desde el dashboard.',
  },
  {
    Icon: Mail,
    title: 'Emails automáticos',
    desc: 'Confirmaciones y recordatorios que reducen las inasistencias.',
  },
  {
    Icon: Settings2,
    title: 'Horarios avanzados',
    desc: 'Horarios por día, descansos y excepciones para días especiales.',
  },
  {
    Icon: ImageIcon,
    title: 'Galería',
    desc: 'Muestra tu trabajo: sube fotos a tu perfil público.',
  },
  {
    Icon: BarChart3,
    title: 'Estadísticas',
    desc: 'Citas e ingresos del mes de un vistazo.',
  },
]

const demoBullets = [
  'Reserva en 4 pasos desde el móvil',
  'Calendario con disponibilidad real',
  'Catálogo con precios y duración',
]

const includedItems = [
  'Dashboard con estadísticas en tiempo real',
  'URL personalizada para tu salón',
  'Reservas optimizadas para móvil',
  'Políticas de no-show configurables',
  'Recordatorios programados',
  'Gestión de servicios y precios',
  'Descansos y excepciones de horario',
  'Galería con categorías',
  'Confirmación o rechazo de citas en un toque',
]

const demoServices = [
  { name: 'Corte Clásico', dur: '30 min', price: 'RD$300' },
  { name: 'Corte Fade + Diseño', dur: '45 min', price: 'RD$450' },
  { name: 'Afeitado Clásico', dur: '20 min', price: 'RD$200' },
]

export default function LandingPage() {
  return (
    <MotionConfig reducedMotion="user">
      <div className="min-h-screen bg-white dark:bg-gray-950">
        {/* Header */}
        <header className="px-4 lg:px-6 h-20 flex items-center justify-between bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm border-b border-stone-200/50 dark:border-gray-700/50 sticky top-0 z-50">
          <div className="flex items-center gap-2">
            <Scissors className="w-6 h-6 text-primary-600 dark:text-primary-400" aria-hidden="true" />
            <span className="text-2xl font-bold text-stone-900 dark:text-white">
              ReservaBarber
            </span>
          </div>
          <nav className="flex items-center gap-1 sm:gap-2">
            <Link
              href="/ramfi_aog"
              className={`min-h-[44px] flex items-center px-3 sm:px-5 py-2.5 rounded-lg text-stone-700 dark:text-gray-300 hover:text-primary-700 dark:hover:text-primary-400 font-medium transition-colors duration-200 ${FOCUS_RING_LIGHT}`}
            >
              Ver demo
            </Link>
            <Link
              href="/login"
              className={`min-h-[44px] flex items-center px-3 sm:px-5 py-2.5 rounded-lg text-stone-700 dark:text-gray-300 hover:text-primary-700 dark:hover:text-primary-400 font-medium transition-colors duration-200 ${FOCUS_RING_LIGHT}`}
            >
              Iniciar Sesión
            </Link>
            <Link
              href="/register"
              className={`min-h-[44px] flex items-center px-5 sm:px-6 py-2.5 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700 transition-[background-color,transform] duration-150 active:scale-[0.98] shadow-lg ${FOCUS_RING_LIGHT}`}
            >
              Registrarse
            </Link>
          </nav>
        </header>

        <main>
          {/* Hero */}
          <section
            aria-labelledby="hero-heading"
            className="bg-gradient-to-br from-stone-50 via-amber-50 to-stone-100 dark:from-gray-950 dark:via-gray-900 dark:to-gray-900"
          >
            <div className="max-w-7xl mx-auto px-4 py-20 lg:py-28 grid lg:grid-cols-2 gap-12 items-center">
              {/* Columna izquierda */}
              <div className="text-left order-2 lg:order-1">
                <motion.span
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
                  className="inline-block px-4 py-2 bg-primary-100 dark:bg-primary-900/30 text-primary-800 dark:text-primary-300 rounded-full text-sm font-medium mb-6"
                >
                  Para barberías y salones
                </motion.span>

                <motion.h1
                  id="hero-heading"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.55, ease: [0.23, 1, 0.32, 1], delay: 0.08 }}
                  className="text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight text-stone-900 dark:text-white mb-6 leading-tight"
                >
                  Gestiona tu barbería
                  <span className="block bg-gradient-to-r from-primary-600 to-primary-800 dark:from-primary-400 dark:to-primary-500 bg-clip-text text-transparent">
                    de forma profesional
                  </span>
                </motion.h1>

                <motion.p
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, ease: [0.23, 1, 0.32, 1], delay: 0.16 }}
                  className="text-xl text-stone-600 dark:text-gray-400 max-w-xl mb-8"
                >
                  Agenda online, recordatorios por email y tu propia página de reservas. Tus clientes reservan solos; tú solo cortas.
                </motion.p>

                <motion.div
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, ease: [0.23, 1, 0.32, 1], delay: 0.24 }}
                >
                  <div className="flex flex-col sm:flex-row gap-4 mb-4">
                    <Link
                      href="/register"
                      className={`inline-flex items-center justify-center min-h-[44px] px-8 py-3.5 bg-primary-600 text-white rounded-xl font-bold text-lg hover:bg-primary-700 transition-[background-color,transform,box-shadow] duration-200 active:scale-[0.98] shadow-xl hover:shadow-2xl ${FOCUS_RING_LIGHT}`}
                    >
                      Crear mi barbería gratis
                    </Link>
                    <Link
                      href="/ramfi_aog"
                      className={`inline-flex items-center justify-center min-h-[44px] px-8 py-3.5 border-2 border-stone-300 dark:border-gray-600 text-stone-700 dark:text-gray-300 rounded-xl font-bold text-lg hover:border-primary-500 dark:hover:border-primary-400 hover:text-primary-700 dark:hover:text-primary-400 transition-colors duration-200 active:scale-[0.98] ${FOCUS_RING_LIGHT}`}
                    >
                      Ver una barbería real →
                    </Link>
                  </div>
                  <p className="text-sm text-stone-600 dark:text-gray-400">
                    Gratis. Sin tarjeta de crédito.
                  </p>
                </motion.div>
              </div>

              {/* Columna derecha — mockup del navegador */}
              <div className="relative order-1 lg:order-2">
                <motion.div
                  initial={{ opacity: 0, y: 28, scale: 0.97 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ duration: 0.6, ease: [0.23, 1, 0.32, 1], delay: 0.3 }}
                >
                  <Link
                    href="/ramfi_aog"
                    aria-label="Ver el perfil demo de una barbería real"
                    className={`block rounded-2xl ${FOCUS_RING_LIGHT}`}
                  >
                    <motion.div
                      whileHover={{ y: -6 }}
                      transition={{ type: 'spring', stiffness: 260, damping: 22 }}
                      className="rounded-2xl border border-stone-200 dark:border-gray-700 shadow-2xl bg-white dark:bg-gray-800 overflow-hidden"
                    >
                      <div aria-hidden="true">
                        {/* Barra superior del navegador */}
                        <div className="flex items-center gap-2 px-4 py-3 bg-stone-100 dark:bg-gray-900 border-b border-stone-200 dark:border-gray-700">
                          <span className="w-3 h-3 rounded-full bg-red-400" />
                          <span className="w-3 h-3 rounded-full bg-amber-400" />
                          <span className="w-3 h-3 rounded-full bg-green-400" />
                          <span className="ml-3 flex-1 px-3 py-1 rounded-md bg-white dark:bg-gray-800 text-xs text-stone-500 dark:text-gray-400 font-mono truncate">
                            reservabarber.com/ramfi_aog
                          </span>
                        </div>

                        {/* Encabezado del salón */}
                        <div className="bg-stone-900 px-6 py-5">
                          <p className="text-white font-bold text-lg">Barbería Demo</p>
                          <p className="text-stone-300 text-xs">Corte, barba y estilo</p>
                        </div>

                        {/* Filas de servicio */}
                        <div className="p-4 space-y-3">
                          {demoServices.map((s) => (
                            <div
                              key={s.name}
                              className="flex items-center justify-between rounded-xl border border-stone-100 dark:border-gray-700 px-4 py-3"
                            >
                              <div>
                                <p className="text-sm font-semibold text-stone-800 dark:text-gray-100">{s.name}</p>
                                <p className="text-xs text-stone-600 dark:text-gray-400">{s.dur} · {s.price}</p>
                              </div>
                              <span className="px-3 py-1.5 rounded-lg bg-primary-600 text-white text-xs font-medium shrink-0">
                                Reservar
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </motion.div>
                  </Link>
                </motion.div>

                {/* Pill flotante */}
                <div
                  className="absolute -top-4 -right-2 sm:-right-4 flex items-center gap-2 bg-stone-900 text-white text-xs px-3 py-1.5 rounded-full shadow-lg"
                  aria-hidden="true"
                >
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse motion-reduce:animate-none" />
                  Demo en vivo — perfil real
                </div>
              </div>
            </div>

            {/* Franja de confianza */}
            <div className="max-w-7xl mx-auto px-4 border-t border-stone-200/60 dark:border-gray-800 py-6">
              <motion.div
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, margin: '-80px' }}
                variants={staggerContainer}
                className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
              >
                {trustItems.map(({ Icon, label }) => (
                  <motion.div
                    key={label}
                    variants={fadeInUp}
                    className="flex items-center gap-2 text-sm text-stone-600 dark:text-gray-400"
                  >
                    <Icon className="w-4 h-4 text-primary-700 dark:text-primary-400 shrink-0" aria-hidden="true" />
                    <span>{label}</span>
                  </motion.div>
                ))}
              </motion.div>
            </div>
          </section>

          {/* Cómo funciona */}
          <section aria-labelledby="how-it-works-heading" className="bg-white dark:bg-gray-900 py-20 lg:py-28">
            <div className="max-w-7xl mx-auto px-4">
              <motion.div
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, margin: '-80px' }}
                variants={fadeInUp}
                className="max-w-2xl mb-14"
              >
                <p className="text-sm font-semibold text-primary-700 dark:text-primary-400 uppercase tracking-wide mb-3">
                  Cómo funciona
                </p>
                <h2 id="how-it-works-heading" className="text-3xl md:text-4xl font-bold text-stone-900 dark:text-white">
                  Empieza en minutos, no en días
                </h2>
              </motion.div>

              <motion.div
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, margin: '-80px' }}
                variants={staggerContainer}
                className="grid md:grid-cols-3 gap-8"
              >
                {steps.map((step, i) => (
                  <motion.div key={step.title} variants={fadeInUp}>
                    <span
                      className="block text-5xl font-bold text-primary-200 dark:text-primary-900 mb-4"
                      aria-hidden="true"
                    >
                      {String(i + 1).padStart(2, '0')}
                    </span>
                    <h3 className="text-xl font-bold text-stone-900 dark:text-white mb-2">{step.title}</h3>
                    <p className="text-stone-600 dark:text-gray-400">{step.desc}</p>
                  </motion.div>
                ))}
              </motion.div>
            </div>
          </section>

          {/* Features — bento grid */}
          <section aria-labelledby="features-heading" className="bg-stone-50 dark:bg-gray-950 py-20 lg:py-28">
            <div className="max-w-6xl mx-auto px-4">
              <motion.div
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, margin: '-80px' }}
                variants={fadeInUp}
                className="max-w-2xl mb-14"
              >
                <p className="text-sm font-semibold text-primary-700 dark:text-primary-400 uppercase tracking-wide mb-3">
                  Funcionalidades
                </p>
                <h2 id="features-heading" className="text-3xl md:text-4xl font-bold text-stone-900 dark:text-white">
                  Todo lo que tu barbería necesita
                </h2>
              </motion.div>

              <motion.div
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, margin: '-80px' }}
                variants={staggerContainer}
                className="grid md:grid-cols-3 gap-5"
              >
                {/* Card A grande */}
                <motion.div
                  variants={fadeInUp}
                  whileHover={{ y: -4 }}
                  transition={{ type: 'spring', stiffness: 300, damping: 24 }}
                  className="md:col-span-2 md:row-span-2 bg-white dark:bg-gray-800 rounded-2xl border border-stone-100 dark:border-gray-700 shadow-lg hover:shadow-xl transition-shadow duration-200 p-8 flex flex-col"
                >
                  <h3 className="text-2xl font-bold text-stone-900 dark:text-white mb-3">
                    Tu página de reservas, sin intermediarios
                  </h3>
                  <p className="text-stone-600 dark:text-gray-400 mb-6 max-w-md">
                    URL propia, catálogo de servicios, galería y reservas en 4 pasos con disponibilidad en tiempo real.
                  </p>
                  <div className="mt-auto space-y-2" aria-hidden="true">
                    {[
                      { time: '9:00 AM', available: false },
                      { time: '10:30 AM', available: true },
                      { time: '12:00 PM', available: false },
                    ].map(({ time, available }) => (
                      <div
                        key={time}
                        className={`flex items-center justify-between rounded-lg px-4 py-2.5 text-sm ${
                          available
                            ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-800 dark:text-primary-300 font-semibold'
                            : 'bg-stone-100 dark:bg-gray-900 text-stone-600 dark:text-gray-400'
                        }`}
                      >
                        <span>{time}</span>
                        <span>{available ? 'Disponible' : 'Ocupado'}</span>
                      </div>
                    ))}
                  </div>
                </motion.div>

                {bentoCards.map((card) => (
                  <motion.div
                    key={card.title}
                    variants={fadeInUp}
                    whileHover={{ y: -4 }}
                    transition={{ type: 'spring', stiffness: 300, damping: 24 }}
                    className="bg-white dark:bg-gray-800 rounded-2xl border border-stone-100 dark:border-gray-700 shadow-lg hover:shadow-xl transition-shadow duration-200 p-6"
                  >
                    <div className="w-12 h-12 rounded-xl bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-400 flex items-center justify-center mb-4">
                      <card.Icon className="w-6 h-6" aria-hidden="true" />
                    </div>
                    <h3 className="text-lg font-bold text-stone-900 dark:text-white mb-2">{card.title}</h3>
                    <p className="text-stone-600 dark:text-gray-400 text-sm">{card.desc}</p>
                  </motion.div>
                ))}
              </motion.div>
            </div>
          </section>

          {/* Demo showcase */}
          <section aria-labelledby="demo-showcase-heading" className="bg-stone-900 text-white py-20">
            <div className="max-w-7xl mx-auto px-4 grid lg:grid-cols-2 items-center gap-12">
              <motion.div
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, margin: '-80px' }}
                variants={fadeInUp}
              >
                <p className="text-sm font-semibold text-primary-400 uppercase tracking-wide mb-3">Demo en vivo</p>
                <h2 id="demo-showcase-heading" className="text-3xl md:text-4xl font-bold text-white mb-4">
                  Explora una barbería real usando ReservaBarber
                </h2>
                <p className="text-stone-300 mb-8 max-w-xl">
                  El perfil demo es una barbería de verdad: 6 servicios, horarios y reservas funcionando en producción. Entra, elige un servicio y recorre el flujo completo — así exactamente te verán tus clientes.
                </p>
                <Link
                  href="/ramfi_aog"
                  className={`inline-flex items-center justify-center min-h-[44px] px-8 py-3.5 bg-primary-500 text-stone-950 rounded-xl font-bold hover:bg-primary-400 transition-[background-color,transform] duration-150 active:scale-[0.98] ${FOCUS_RING_DARK}`}
                >
                  Abrir el perfil demo →
                </Link>
              </motion.div>

              <motion.div
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, margin: '-80px' }}
                variants={fadeInUp}
                transition={{ duration: 0.5, ease: [0.23, 1, 0.32, 1], delay: 0.12 }}
                className="space-y-4"
              >
                {demoBullets.map((bullet) => (
                  <div key={bullet} className="flex items-center gap-3 text-stone-300">
                    <CheckCircle2 className="w-5 h-5 text-primary-400 shrink-0" aria-hidden="true" />
                    <span>{bullet}</span>
                  </div>
                ))}
              </motion.div>
            </div>
          </section>

          {/* Todo incluido */}
          <section aria-labelledby="everything-included-heading" className="bg-white dark:bg-gray-900 py-20 lg:py-28">
            <div className="max-w-4xl mx-auto px-4 text-center">
              <motion.div
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, margin: '-80px' }}
                variants={fadeInUp}
                className="mb-12"
              >
                <h2 id="everything-included-heading" className="text-3xl md:text-4xl font-bold text-stone-900 dark:text-white mb-4">
                  Todo lo que necesitas, incluido desde el día uno
                </h2>
                <p className="text-lg text-stone-600 dark:text-gray-400">
                  Sin planes ni límites ocultos: cada cuenta gratuita incluye el sistema completo.
                </p>
              </motion.div>

              <motion.ul
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, margin: '-80px' }}
                variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.04 } } }}
                className="grid sm:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-4 text-left list-none"
              >
                {includedItems.map((item) => (
                  <motion.li
                    key={item}
                    variants={{
                      hidden: { opacity: 0, y: 8 },
                      visible: { opacity: 1, y: 0, transition: { duration: 0.35, ease: [0.23, 1, 0.32, 1] } },
                    }}
                    className="flex gap-3"
                  >
                    <CheckCircle2 className="w-5 h-5 text-primary-600 dark:text-primary-400 shrink-0 mt-0.5" aria-hidden="true" />
                    <span className="text-stone-700 dark:text-gray-300">{item}</span>
                  </motion.li>
                ))}
              </motion.ul>
            </div>
          </section>

          {/* CTA final */}
          <section aria-labelledby="cta-final-heading" className="bg-white dark:bg-gray-900 py-20 lg:py-28">
            <div className="max-w-7xl mx-auto px-4">
              <motion.div
                initial={{ opacity: 0, scale: 0.98, y: 16 }}
                whileInView={{ opacity: 1, scale: 1, y: 0 }}
                viewport={{ once: true, margin: '-80px' }}
                transition={{ duration: 0.55, ease: [0.23, 1, 0.32, 1] }}
                className="bg-gradient-to-r from-stone-900 via-stone-800 to-stone-900 rounded-3xl p-12 md:p-16 text-white text-center relative overflow-hidden"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-primary-900/20 to-primary-800/10" aria-hidden="true" />
                <div className="relative z-10">
                  <h2 id="cta-final-heading" className="text-4xl md:text-6xl font-bold mb-6">
                    ¿Listo para digitalizar tu barbería?
                  </h2>
                  <p className="text-xl md:text-2xl text-stone-300 mb-10 max-w-3xl mx-auto leading-relaxed">
                    Crea tu cuenta gratis, configura tus servicios y comparte tu link hoy mismo.
                  </p>
                  <div className="flex flex-col sm:flex-row gap-6 justify-center">
                    <Link
                      href="/register"
                      className={`inline-flex items-center justify-center min-h-[44px] px-10 py-4 bg-primary-500 text-stone-950 rounded-xl font-bold text-lg hover:bg-primary-400 transition-[background-color,transform] duration-150 active:scale-[0.98] shadow-xl ${FOCUS_RING_DARK}`}
                    >
                      Crear mi barbería gratis
                    </Link>
                    <Link
                      href="/ramfi_aog"
                      className={`inline-flex items-center justify-center min-h-[44px] px-10 py-4 border-2 border-white text-white rounded-xl font-bold text-lg hover:bg-white hover:text-stone-900 transition-colors duration-200 active:scale-[0.98] ${FOCUS_RING_DARK}`}
                    >
                      Ver el demo
                    </Link>
                  </div>
                </div>
              </motion.div>
            </div>
          </section>
        </main>

        {/* Footer */}
        <footer className="bg-stone-900 text-white py-12">
          <div className="max-w-7xl mx-auto px-4 text-center">
            <div className="mb-6 flex items-center justify-center gap-2">
              <Scissors className="w-5 h-5 text-primary-400" aria-hidden="true" />
              <span className="text-2xl font-bold text-white">
                ReservaBarber
              </span>
            </div>
            <nav className="mb-6 flex items-center justify-center gap-6 flex-wrap">
              <Link
                href="/ramfi_aog"
                className={`min-h-[44px] flex items-center px-2 text-stone-300 hover:text-white transition-colors duration-200 rounded-lg ${FOCUS_RING_DARK}`}
              >
                Ver demo
              </Link>
              <Link
                href="/login"
                className={`min-h-[44px] flex items-center px-2 text-stone-300 hover:text-white transition-colors duration-200 rounded-lg ${FOCUS_RING_DARK}`}
              >
                Iniciar sesión
              </Link>
              <Link
                href="/register"
                className={`min-h-[44px] flex items-center px-2 text-stone-300 hover:text-white transition-colors duration-200 rounded-lg ${FOCUS_RING_DARK}`}
              >
                Registrarse
              </Link>
            </nav>
            <p className="text-stone-300">&copy; 2025 ReservaBarber. Todos los derechos reservados.</p>
          </div>
        </footer>
      </div>
    </MotionConfig>
  )
}
