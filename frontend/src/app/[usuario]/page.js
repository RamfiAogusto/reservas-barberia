'use client'

import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import PublicGallery from '@/components/PublicGallery'
import { useSalonDataOptimized } from '@/utils/SalonContext'

const PerfilPublico = () => {
  const { usuario } = useParams()
  const router = useRouter()
  const { salon, loading, error } = useSalonDataOptimized(usuario)

  const handleReservar = () => {
    router.push(`/${usuario}/book`)
  }

  const formatPrice = (price) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN'
    }).format(price)
  }

  const formatDuration = (minutes) => {
    if (minutes < 60) return `${minutes} min`
    const hours = Math.floor(minutes / 60)
    const remainingMinutes = minutes % 60
    return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}min` : `${hours}h`
  }

  const getCategoryName = (category) => {
    const categories = {
      corte: 'Cortes',
      barba: 'Barba',
      combo: 'Combos',
      tratamiento: 'Tratamientos',
      otro: 'Otros Servicios'
    }
    return categories[category] || 'Servicios'
  }

  const getCategoryIcon = (category) => {
    const icons = {
      corte: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.121 14.121L19 19m-7-7l7-7m-7 7l-2.879 2.879M12 12L9.121 9.121m0 5.758a3 3 0 10-4.243 4.243 3 3 0 004.243-4.243zm0-5.758a3 3 0 10-4.243-4.243 3 3 0 004.243 4.243z" />
        </svg>
      ),
      barba: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
      ),
      combo: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
        </svg>
      ),
      tratamiento: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
        </svg>
      ),
      otro: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
        </svg>
      )
    }
    return icons[category] || icons.otro
  }

  const servicesByCategory = salon?.services?.reduce((acc, service) => {
    const category = (service.category || 'OTRO').toLowerCase()
    if (!acc[category]) acc[category] = []
    acc[category].push(service)
    return acc
  }, {}) || {}

  const heroImage = salon?.gallery?.[0]?.imageUrl
  const isInitialOrLoading = loading || (!salon && !error)

  if (isInitialOrLoading) {
    return (
      <div className="min-h-screen bg-stone-50 dark:bg-gray-950 flex items-center justify-center" role="status" aria-live="polite">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-2 border-amber-600 border-t-transparent mx-auto" aria-hidden="true" />
          <p className="mt-4 text-stone-600 dark:text-gray-400">Cargando perfil del salón...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-stone-50 dark:bg-gray-950 flex items-center justify-center px-4">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-stone-200 dark:bg-gray-700 flex items-center justify-center">
            <svg className="w-8 h-8 text-stone-500 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h1 className="text-2xl font-semibold text-stone-900 dark:text-white mb-2">Salón no encontrado</h1>
          <p className="text-stone-600 dark:text-gray-400 mb-8">{error}</p>
          <Link
            href="/"
            className="inline-flex items-center gap-2 bg-amber-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-amber-700 transition-colors focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2"
          >
            Volver al inicio
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-stone-50 dark:bg-gray-950">
      {/* Barra superior minimalista */}
      <header className="fixed top-0 left-0 right-0 z-40 bg-white/95 dark:bg-gray-900/95 backdrop-blur-sm border-b border-stone-200/80 dark:border-gray-700/80">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link
            href="/"
            className="text-sm text-stone-500 dark:text-gray-400 hover:text-stone-700 dark:hover:text-gray-200 transition-colors focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900 rounded"
            aria-label="Ir al inicio"
          >
            ReservaBarber
          </Link>
          <button
            onClick={handleReservar}
            className="bg-amber-600 text-white px-5 py-2.5 rounded-lg font-medium text-sm hover:bg-amber-700 transition-colors focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900"
          >
            Reservar cita
          </button>
        </div>
      </header>

      {/* Hero */}
      <section className="relative pt-16 min-h-[85vh] flex flex-col justify-end">
        {heroImage ? (
          <div className="absolute inset-0">
            <img
              src={heroImage}
              alt=""
              className="w-full h-full object-cover"
              aria-hidden="true"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-black/20" aria-hidden="true" />
          </div>
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-stone-800 via-stone-700 to-stone-900" aria-hidden="true" />
        )}

        <div className="relative max-w-6xl mx-auto w-full px-4 pb-16 md:pb-24">
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-8">
            <div className="flex items-end gap-6">
              <div className="flex-shrink-0 w-24 h-24 md:w-28 md:h-28 rounded-2xl overflow-hidden bg-white/10 backdrop-blur border border-white/20 shadow-xl">
                {salon?.avatar ? (
                  <img
                    src={salon.avatar}
                    alt=""
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-4xl">💈</div>
                )}
              </div>
              <div>
                <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white tracking-tight">
                  {salon?.salonName || 'Salón'}
                </h1>
                <p className="text-white/80 text-lg mt-1">@{salon?.username || usuario}</p>
              </div>
            </div>
            <button
              onClick={handleReservar}
              className="self-start md:self-end w-full md:w-auto bg-amber-500 hover:bg-amber-400 text-stone-900 dark:text-gray-950 font-semibold px-8 py-4 rounded-xl text-lg transition-all hover:scale-[1.02] focus:outline-none focus:ring-2 focus:ring-amber-400 focus:ring-offset-2 focus:ring-offset-transparent shadow-lg"
            >
              Reservar cita
            </button>
          </div>
        </div>
      </section>

      {/* Contenido principal */}
      <main className="max-w-6xl mx-auto px-4 py-16 md:py-24">
        {/* Servicios */}
        <section className="mb-24" id="servicios" aria-labelledby="servicios-titulo">
          <h2 id="servicios-titulo" className="text-2xl md:text-3xl font-bold text-stone-900 dark:text-white mb-2">
            Servicios
          </h2>
          <p className="text-stone-600 dark:text-gray-400 mb-12">
            Reserva en línea en pocos pasos
          </p>

          {Object.keys(servicesByCategory).length > 0 ? (
            <div className="space-y-14">
              {Object.entries(servicesByCategory).map(([category, services]) => (
                <div key={category}>
                  <h3 className="flex items-center gap-3 text-lg font-semibold text-stone-800 dark:text-gray-100 mb-6">
                    <span className="flex items-center justify-center w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400">
                      {getCategoryIcon(category)}
                    </span>
                    {getCategoryName(category)}
                  </h3>
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {services.map((service) => (
                      <button
                        key={service._id || service.id}
                        type="button"
                        onClick={() => router.push(`/${usuario}/book?service=${service._id || service.id}`)}
                        className="group text-left w-full bg-white dark:bg-gray-800 rounded-2xl p-6 border border-stone-200 dark:border-gray-700 hover:border-amber-300 dark:hover:border-amber-600 hover:shadow-lg hover:shadow-amber-500/5 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 dark:focus:ring-offset-gray-950"
                      >
                        <div className="flex justify-between items-start gap-4 mb-3">
                          <h4 className="font-semibold text-stone-900 dark:text-white group-hover:text-amber-700 dark:group-hover:text-amber-400 transition-colors">
                            {service.name}
                          </h4>
                          <span className="flex-shrink-0 font-bold text-amber-600 dark:text-amber-400">
                            {formatPrice(service.price)}
                          </span>
                        </div>
                        {service.description && (
                          <p className="text-stone-600 dark:text-gray-400 text-sm mb-4 line-clamp-2">
                            {service.description}
                          </p>
                        )}
                        <div className="flex flex-wrap items-center gap-3 text-sm">
                          {service.showDuration !== false && (
                            <span className="inline-flex items-center gap-1.5 text-stone-500 dark:text-gray-400">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                              {formatDuration(service.duration)}
                            </span>
                          )}
                          {salon?.requiresDeposit && salon?.depositAmount > 0 && (
                            <span className="inline-flex items-center px-2.5 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 text-xs font-medium">
                              Depósito: {formatPrice(salon.depositAmount)}
                            </span>
                          )}
                        </div>
                        <span className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-amber-600 dark:text-amber-400 group-hover:gap-3 transition-all">
                          Reservar
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-16 bg-white dark:bg-gray-800 rounded-2xl border border-stone-200 dark:border-gray-700">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-stone-100 dark:bg-gray-700 flex items-center justify-center">
                <svg className="w-8 h-8 text-stone-400 dark:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-stone-900 dark:text-white mb-2">Sin servicios publicados</h3>
              <p className="text-stone-600 dark:text-gray-400">El salón aún no ha agregado sus servicios.</p>
            </div>
          )}
        </section>

        {/* Barberos */}
        {salon?.barbers && salon.barbers.length > 0 && (
          <section className="mb-24" id="barberos" aria-labelledby="barberos-titulo">
            <h2 id="barberos-titulo" className="text-2xl md:text-3xl font-bold text-stone-900 dark:text-white mb-2">
              Nuestro equipo
            </h2>
            <p className="text-stone-600 dark:text-gray-400 mb-12">
              Conoce a nuestros barberos
            </p>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {salon.barbers.map((barber) => (
                <div
                  key={barber.id}
                  className="bg-white dark:bg-gray-800 rounded-2xl border border-stone-200 dark:border-gray-700 p-6 flex items-center gap-4"
                >
                  <div className="w-16 h-16 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center text-2xl shrink-0 overflow-hidden">
                    {barber.avatar ? (
                      <img src={barber.avatar} alt={barber.name} className="w-full h-full object-cover" />
                    ) : (
                      '✂️'
                    )}
                  </div>
                  <div>
                    <h3 className="font-semibold text-stone-900 dark:text-white">{barber.name}</h3>
                    {barber.specialty && (
                      <p className="text-sm text-amber-600 dark:text-amber-400">{barber.specialty}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Galería destacada */}
        {salon?.gallery && salon.gallery.length > 0 && (
          <section className="mb-24" id="galeria" aria-labelledby="galeria-titulo">
            <h2 id="galeria-titulo" className="text-2xl md:text-3xl font-bold text-stone-900 dark:text-white mb-2">
              Galería
            </h2>
            <p className="text-stone-600 dark:text-gray-400 mb-12">
              Conoce nuestras instalaciones
            </p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
              {salon.gallery.slice(0, 4).map((image, idx) => (
                <div
                  key={image._id || image.id || `img-${idx}`}
                  className="relative aspect-square rounded-2xl overflow-hidden group"
                >
                  <img
                    src={image.imageUrl}
                    alt={image.title || 'Imagen del salón'}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                  {image.title && (
                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                      <p className="text-white font-medium text-sm truncate">{image.title}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Info y contacto */}
        <section className="mb-24 grid md:grid-cols-2 gap-8">
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-stone-200 dark:border-gray-700 p-8">
            <h2 className="text-xl font-bold text-stone-900 dark:text-white mb-6 flex items-center gap-3">
              <span className="flex items-center justify-center w-10 h-10 rounded-xl bg-stone-100 dark:bg-gray-700 text-stone-600 dark:text-gray-400">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </span>
              Ubicación y contacto
            </h2>
            <dl className="space-y-4">
              {salon?.address && (
                <div>
                  <dt className="text-sm font-medium text-stone-500 dark:text-gray-400">Dirección</dt>
                  <dd className="text-stone-900 dark:text-white mt-0.5">{salon.address}</dd>
                </div>
              )}
              {salon?.phone && (
                <div>
                  <dt className="text-sm font-medium text-stone-500 dark:text-gray-400">Teléfono</dt>
                  <dd>
                    <a
                      href={`tel:${salon.phone}`}
                      className="text-amber-600 dark:text-amber-400 hover:text-amber-700 dark:hover:text-amber-300 font-medium focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800 rounded"
                    >
                      {salon.phone}
                    </a>
                  </dd>
                </div>
              )}
              {(!salon?.address && !salon?.phone) && (
                <p className="text-stone-500 dark:text-gray-400">Información de contacto no disponible</p>
              )}
            </dl>
          </div>

          {salon?.requiresDeposit && salon?.depositAmount > 0 && (
            <div className="bg-amber-50 dark:bg-amber-950/20 rounded-2xl border border-amber-200/60 dark:border-amber-800/60 p-8">
              <h2 className="text-xl font-bold text-amber-900 dark:text-amber-300 mb-4 flex items-center gap-3">
                <span className="flex items-center justify-center w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </span>
                Política de reserva
              </h2>
              <details className="group">
                <summary className="cursor-pointer list-none flex items-center justify-between text-amber-900 dark:text-amber-300 font-medium">
                  Ver condiciones
                  <svg className="w-5 h-5 transition-transform group-open:rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </summary>
                <div className="mt-4 space-y-3 text-sm text-amber-800 dark:text-amber-300">
                  <p>
                    Se requiere depósito de {formatPrice(salon.depositAmount)} para confirmar la reserva. 
                    El importe total del servicio se paga al llegar.
                  </p>
                  <ul className="list-disc list-inside space-y-1 text-amber-700 dark:text-amber-400">
                    <li>No se reembolsa el depósito si no asistes</li>
                    <li>Cancelar o reprogramar con al menos 24 h de anticipación</li>
                    <li>Recibirás un correo de confirmación</li>
                  </ul>
                </div>
              </details>
            </div>
          )}
        </section>

        {/* Galería completa */}
        <section className="mb-24" id="galeria-completa" aria-labelledby="galeria-completa-titulo">
          <h2 id="galeria-completa-titulo" className="text-2xl md:text-3xl font-bold text-stone-900 dark:text-white mb-2">
            Todas las fotos
          </h2>
          <PublicGallery username={usuario} />
        </section>
      </main>

      {/* CTA flotante móvil */}
      <div className="fixed bottom-6 left-4 right-4 z-30 md:hidden">
        <button
          onClick={handleReservar}
          className="w-full bg-amber-600 text-white py-4 rounded-xl font-semibold shadow-lg hover:bg-amber-700 transition-colors focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2"
        >
          Reservar cita
        </button>
      </div>

      {/* Footer minimalista */}
      <footer className="border-t border-stone-200 dark:border-gray-700 bg-white dark:bg-gray-900 py-12 mt-12">
        <div className="max-w-6xl mx-auto px-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
            <p className="text-stone-500 dark:text-gray-400 text-sm">
              © {new Date().getFullYear()} {salon?.salonName} · ReservaBarber
            </p>
            <Link
              href="/register"
              className="text-sm text-stone-500 dark:text-gray-400 hover:text-amber-600 dark:hover:text-amber-400 transition-colors focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900 rounded"
            >
              ¿Tienes barbería? Crea tu perfil gratis
            </Link>
          </div>
        </div>
      </footer>
    </div>
  )
}

export default PerfilPublico
