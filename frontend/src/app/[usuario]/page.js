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
    if (minutes < 60) {
      return `${minutes} min`
    }
    const hours = Math.floor(minutes / 60)
    const remainingMinutes = minutes % 60
    return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}min` : `${hours}h`
  }

  const getCategoryName = (category) => {
    const categories = {
      'corte': 'Cortes',
      'barba': 'Barba',
      'combo': 'Combos',
      'tratamiento': 'Tratamientos',
      'otro': 'Otros Servicios'
    }
    return categories[category] || 'Servicios'
  }

  const getCategoryIcon = (category) => {
    const icons = {
      'corte': '✂️',
      'barba': '🧔',
      'combo': '💫',
      'tratamiento': '💆',
      'otro': '⭐'
    }
    return icons[category] || '📝'
  }

  // Agrupar servicios por categoría
  const servicesByCategory = salon?.services?.reduce((acc, service) => {
    const category = (service.category || 'OTRO').toLowerCase()
    if (!acc[category]) {
      acc[category] = []
    }
    acc[category].push(service)
    return acc
  }, {}) || {}

  // Mostrar loading: mientras carga O cuando aún no hay datos ni error (evitar flash de "no encontrado")
  const isInitialOrLoading = loading || (!salon && !error)

  if (isInitialOrLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-2 border-blue-600 border-t-transparent mx-auto"></div>
          <p className="mt-4 text-gray-600">Cargando perfil del salón...</p>
        </div>
      </div>
    )
  }

  // Solo mostrar error cuando realmente no se encontró el salón (error explícito de la API)
  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md px-4">
          <div className="text-6xl mb-4">🚫</div>
          <h1 className="text-2xl font-bold text-gray-800 mb-2">Salón no encontrado</h1>
          <p className="text-gray-600 mb-6">{error}</p>
          <button
            onClick={() => router.push('/')}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Volver al inicio
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Banner promocional para nuevos usuarios */}
      <div className="bg-gradient-to-r from-green-600 to-blue-600 text-white py-3 px-4">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="text-center sm:text-left">
            <p className="text-sm font-medium">
              💡 <strong>¿Tienes tu propia barbería?</strong> Crea tu perfil profesional gratis
            </p>
          </div>
          <div className="flex gap-3">
            <Link
              href="/register"
              className="px-4 py-2 bg-white text-green-600 rounded-lg text-sm font-semibold hover:bg-gray-100 transition-colors duration-200"
            >
              Crear Perfil
            </Link>
            <Link
              href="/"
              className="px-4 py-2 border border-white text-white rounded-lg text-sm font-semibold hover:bg-white hover:text-green-600 transition-colors duration-200"
            >
              Ver Demo
            </Link>
          </div>
        </div>
      </div>

      {/* Header del Salón */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-800 text-white">
        <div className="max-w-6xl mx-auto px-4 py-12">
          <div className="flex flex-col md:flex-row items-center gap-8">
            {/* Avatar del Salón */}
            <div className="w-32 h-32 bg-white bg-opacity-20 rounded-full flex items-center justify-center text-4xl">
              {salon?.avatar ? (
                <img src={salon.avatar} alt={salon.salonName || 'Salón'} className="w-full h-full rounded-full object-cover" />
              ) : (
                '💈'
              )}
            </div>

            {/* Información Principal */}
            <div className="text-center md:text-left flex-1">
              <h1 className="text-4xl md:text-5xl font-bold mb-2">{salon?.salonName || 'Salón'}</h1>
              <p className="text-xl text-blue-100 mb-4">@{salon?.username || usuario}</p>
              
              {/* Información de Contacto */}
              <div className="flex flex-col md:flex-row gap-4 text-blue-100">
                <div className="flex items-center justify-center md:justify-start gap-2">
                  <span>📍</span>
                  <span>{salon?.address || 'Dirección no disponible'}</span>
                </div>
                <div className="flex items-center justify-center md:justify-start gap-2">
                  <span>📞</span>
                  <span>{salon?.phone || 'Teléfono no disponible'}</span>
                </div>
              </div>
            </div>

            {/* Botón CTA Principal */}
            <div className="text-center">
              <button
                onClick={handleReservar}
                className="bg-white text-blue-600 px-8 py-4 rounded-lg font-bold text-lg hover:bg-gray-100 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105 mb-4"
              >
                📅 Reservar Cita
              </button>
              
              {/* Botón secundario para crear perfil */}
              <div className="mt-3">
                <Link
                  href="/register"
                  className="inline-block px-6 py-2 bg-blue-500 text-white rounded-lg font-medium hover:bg-blue-400 transition-colors duration-200 text-sm"
                >
                  💼 ¿Tienes barbería? Crear perfil gratis
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Contenido Principal */}
      <div className="max-w-6xl mx-auto px-4 py-12">
        {/* Galería destacada */}
        {salon?.gallery && salon.gallery.length > 0 && (
          <div className="mb-12">
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold text-gray-800 mb-2">Galería de Fotos</h2>
              <p className="text-gray-600">Conoce nuestras instalaciones y servicios</p>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {salon.gallery.slice(0, 4).map((image, idx) => (
                <div key={image._id || image.id || `img-${idx}`} className="relative aspect-square rounded-lg overflow-hidden group cursor-pointer">
                  <img 
                    src={image.imageUrl} 
                    alt={image.title || 'Imagen del salón'} 
                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
                  />
                  {image.title && (
                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-3 opacity-0 group-hover:opacity-100 transition-opacity">
                      <h4 className="text-white font-medium text-sm truncate">
                        {image.title}
                      </h4>
                    </div>
                  )}
                </div>
              ))}
            </div>
            
            {salon.gallery.length > 4 && (
              <div className="text-center mt-6">
                <button 
                  onClick={() => document.getElementById('galeria-completa').scrollIntoView({ behavior: 'smooth' })}
                  className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Ver galería completa
                </button>
              </div>
            )}
          </div>
        )}

        {/* Sección de Servicios */}
        <div className="mb-12">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-gray-800 mb-2">Nuestros Servicios</h2>
            <p className="text-gray-600">Descubre todos los servicios que ofrecemos</p>
          </div>

          {servicesByCategory && Object.keys(servicesByCategory).length > 0 ? (
            <div className="space-y-8">
              {Object.entries(servicesByCategory).map(([category, services]) => (
                <div key={category} className="bg-white rounded-xl shadow-lg p-6">
                  <h3 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2">
                    <span className="text-3xl">{getCategoryIcon(category)}</span>
                    {getCategoryName(category)}
                  </h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {services.map((service) => (
                      <div 
                        key={service._id || service.id} 
                        className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-all duration-200 cursor-pointer hover:border-blue-300 hover:bg-blue-50"
                        onClick={() => router.push(`/${usuario}/book?service=${service._id || service.id}`)}
                      >
                        <div className="flex justify-between items-start mb-2">
                          <h4 className="font-semibold text-gray-800">{service.name}</h4>
                          <span className="text-xl font-bold text-blue-600">{formatPrice(service.price)}</span>
                        </div>
                        
                        <p className="text-gray-600 text-sm mb-3">{service.description}</p>
                        
                        <div className="flex justify-between items-center text-sm">
                          {service.showDuration && (
                            <span className="text-gray-500 flex items-center gap-1">
                              <span>⏱️</span>
                              {formatDuration(service.duration)}
                            </span>
                          )}
                          
                          {salon?.requiresDeposit && salon?.depositAmount > 0 && (
                            <span className="bg-green-100 text-green-800 px-2 py-1 rounded text-xs">
                              Depósito para reservar: {formatPrice(salon.depositAmount)}
                            </span>
                          )}
                        </div>
                        
                        {/* Indicador de que es clickeable */}
                        <div className="mt-3 pt-3 border-t border-gray-100">
                          <span className="text-blue-600 text-sm font-medium flex items-center gap-1">
                            📅 Reservar este servicio
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">📋</div>
              <h3 className="text-xl font-semibold text-gray-800 mb-2">No hay servicios disponibles</h3>
              <p className="text-gray-600">El salón aún no ha publicado sus servicios.</p>
            </div>
          )}
        </div>

        {/* Sección promocional intermedia */}
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-2xl p-8 mb-12 text-white text-center">
          <div className="max-w-3xl mx-auto">
            <h3 className="text-3xl font-bold mb-4">¿Te gusta lo que ves?</h3>
            <p className="text-xl text-indigo-100 mb-6">
              Crea tu propio perfil profesional y gestiona tu barbería de forma digital. 
              Es completamente gratis y solo toma 5 minutos configurarlo.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/register"
                className="px-8 py-3 bg-white text-indigo-600 rounded-lg font-bold hover:bg-gray-100 transition-colors duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
              >
                🚀 Crear Mi Perfil Gratis
              </Link>
              <Link
                href="/"
                className="px-8 py-3 border-2 border-white text-white rounded-lg font-bold hover:bg-white hover:text-indigo-600 transition-colors duration-200"
              >
                ℹ️ Conocer Más
              </Link>
            </div>
          </div>
        </div>

        {/* Sección de Información Adicional */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
          {/* Información de Contacto */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h3 className="text-2xl font-bold text-gray-800 mb-4 flex items-center gap-2">
              <span>📞</span>
              Información de Contacto
            </h3>
            
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <span className="text-2xl">🏪</span>
                <div>
                  <p className="font-semibold text-gray-800">Nombre del Salón</p>
                  <p className="text-gray-600">{salon?.salonName || 'No disponible'}</p>
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                <span className="text-2xl">📍</span>
                <div>
                  <p className="font-semibold text-gray-800">Dirección</p>
                  <p className="text-gray-600">{salon?.address || 'No disponible'}</p>
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                <span className="text-2xl">📞</span>
                <div>
                  <p className="font-semibold text-gray-800">Teléfono</p>
                  <p className="text-gray-600">{salon?.phone || 'No disponible'}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Sección CTA Secundaria */}
          <div className="bg-gradient-to-r from-blue-500 to-blue-700 text-white rounded-xl shadow-lg p-6">
            <h3 className="text-2xl font-bold mb-4">¿Listo para tu nueva imagen?</h3>
            <p className="mb-6 text-blue-100">
              Reserva tu cita ahora y déjanos cuidar de tu estilo. 
              Nuestros profesionales están listos para atenderte.
            </p>
            
            <button
              onClick={handleReservar}
              className="w-full bg-white text-blue-600 px-6 py-3 rounded-lg font-bold hover:bg-gray-100 transition-colors"
            >
              📅 Reservar Mi Cita Ahora
            </button>
          </div>
        </div>

        {/* Sección de Políticas de Reserva */}
        {salon?.requiresDeposit && salon?.depositAmount > 0 && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-6 mb-8">
            <div className="flex items-start gap-3">
              <div className="text-yellow-600 text-2xl">⚠️</div>
              <div>
                <h3 className="text-xl font-bold text-yellow-800 mb-3">Políticas de Reserva</h3>
                <div className="text-sm text-yellow-700 space-y-2">
                  <p><strong>IMPORTANTE:</strong> Se requiere depósito para confirmar tu reserva. El precio completo del servicio se paga al recibir el servicio.</p>
                  <ul className="list-disc list-inside space-y-1 ml-2">
                    <li><strong>Política de Inasistencia:</strong> Si no asistes a tu cita, el depósito <strong>NO será reembolsado</strong></li>
                    <li><strong>Cancelaciones:</strong> Para cancelar o reprogramar, contacta al salón con <strong>al menos 24 horas de anticipación</strong></li>
                    <li><strong>Confirmación:</strong> Recibirás un email de confirmación con los detalles de tu cita</li>
                    <li><strong>Pago del servicio:</strong> El precio completo se paga al llegar al salón</li>
                  </ul>
                  <p className="text-yellow-800 font-medium">
                    Al hacer una reserva, aceptas automáticamente estas condiciones.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Galería Completa */}
        <div id="galeria-completa" className="mb-12">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-gray-800 mb-2">Nuestra Galería Completa</h2>
            <p className="text-gray-600">Descubre más imágenes de nuestro salón</p>
          </div>
          
          <PublicGallery username={usuario} />
        </div>

        {/* Botón de Reserva Flotante para Móvil */}
        <div className="fixed bottom-4 right-4 md:hidden">
          <button
            onClick={handleReservar}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            📅 Reservar Cita
          </button>
        </div>
      </div>

      {/* Footer */}
      <div className="bg-gray-800 text-white py-8">
        <div className="max-w-6xl mx-auto px-4">
          {/* Sección de navegación para nuevos usuarios */}
          <div className="text-center mb-8">
            <h3 className="text-2xl font-bold mb-4">¿Tienes tu propia barbería?</h3>
            <p className="text-gray-300 mb-6 max-w-2xl mx-auto">
              Crea tu perfil profesional y gestiona tus citas de forma digital. 
              Es gratis y solo toma 5 minutos configurarlo.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/register"
                className="px-8 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
              >
                🚀 Crear Mi Perfil Gratis
              </Link>
              <Link
                href="/"
                className="px-8 py-3 border border-gray-600 text-gray-300 rounded-lg font-semibold hover:border-white hover:text-white transition-colors duration-200"
              >
                ℹ️ Más Información
              </Link>
            </div>
          </div>
          
          {/* Separador */}
          <div className="border-t border-gray-700 pt-6">
            <div className="text-center">
              <p className="text-gray-400 mb-2">
                © 2025 {salon.salonName} - Powered by ReservaBarber
              </p>
              <p className="text-gray-500 text-sm">
                Sistema profesional de gestión para barberías
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default PerfilPublico 