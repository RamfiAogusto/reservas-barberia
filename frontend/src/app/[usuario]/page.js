'use client'
import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import PublicGallery from '@/components/PublicGallery'

const PerfilPublico = () => {
  const { usuario } = useParams()
  const router = useRouter()
  const [salon, setSalon] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const fetchSalonProfile = async () => {
      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'
        const response = await fetch(`${apiUrl}/public/salon/${usuario}`)
        const data = await response.json()

        if (data.success) {
          setSalon(data.data)
        } else {
          setError(data.message || 'Salón no encontrado')
        }
      } catch (error) {
        console.error('Error al cargar perfil:', error)
        setError('Error al cargar la información del salón')
      } finally {
        setLoading(false)
      }
    }

    if (usuario) {
      fetchSalonProfile()
    }
  }, [usuario])

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
    const category = service.category || 'otro'
    if (!acc[category]) {
      acc[category] = []
    }
    acc[category].push(service)
    return acc
  }, {})

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Cargando perfil del salón...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md">
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
      {/* Header del Salón */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-800 text-white">
        <div className="max-w-6xl mx-auto px-4 py-12">
          <div className="flex flex-col md:flex-row items-center gap-8">
            {/* Avatar del Salón */}
            <div className="w-32 h-32 bg-white bg-opacity-20 rounded-full flex items-center justify-center text-4xl">
              {salon.avatar ? (
                <img src={salon.avatar} alt={salon.salonName} className="w-full h-full rounded-full object-cover" />
              ) : (
                '💈'
              )}
            </div>

            {/* Información Principal */}
            <div className="text-center md:text-left flex-1">
              <h1 className="text-4xl md:text-5xl font-bold mb-2">{salon.salonName}</h1>
              <p className="text-xl text-blue-100 mb-4">@{salon.username}</p>
              
              {/* Información de Contacto */}
              <div className="flex flex-col md:flex-row gap-4 text-blue-100">
                <div className="flex items-center justify-center md:justify-start gap-2">
                  <span>📍</span>
                  <span>{salon.address}</span>
                </div>
                <div className="flex items-center justify-center md:justify-start gap-2">
                  <span>📞</span>
                  <span>{salon.phone}</span>
                </div>
              </div>
            </div>

            {/* Botón CTA Principal */}
            <div className="text-center">
              <button
                onClick={handleReservar}
                className="bg-white text-blue-600 px-8 py-4 rounded-lg font-bold text-lg hover:bg-gray-100 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105"
              >
                📅 Reservar Cita
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Contenido Principal */}
      <div className="max-w-6xl mx-auto px-4 py-12">
        {/* Galería destacada */}
        {salon.gallery && salon.gallery.length > 0 && (
          <div className="mb-12">
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold text-gray-800 mb-2">Galería de Fotos</h2>
              <p className="text-gray-600">Conoce nuestras instalaciones y servicios</p>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {salon.gallery.slice(0, 4).map((image) => (
                <div key={image._id} className="relative aspect-square rounded-lg overflow-hidden group cursor-pointer">
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
                      <div key={service._id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                        <div className="flex justify-between items-start mb-2">
                          <h4 className="font-semibold text-gray-800">{service.name}</h4>
                          <span className="text-xl font-bold text-blue-600">{formatPrice(service.price)}</span>
                        </div>
                        
                        <p className="text-gray-600 text-sm mb-3">{service.description}</p>
                        
                        <div className="flex justify-between items-center text-sm">
                          <span className="text-gray-500 flex items-center gap-1">
                            <span>⏱️</span>
                            {formatDuration(service.duration)}
                          </span>
                          
                          {service.requiresDeposit && (
                            <span className="bg-green-100 text-green-800 px-2 py-1 rounded text-xs">
                              Anticipo: {formatPrice(service.depositAmount)}
                            </span>
                          )}
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
                  <p className="text-gray-600">{salon.salonName}</p>
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                <span className="text-2xl">📍</span>
                <div>
                  <p className="font-semibold text-gray-800">Dirección</p>
                  <p className="text-gray-600">{salon.address}</p>
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                <span className="text-2xl">📞</span>
                <div>
                  <p className="font-semibold text-gray-800">Teléfono</p>
                  <p className="text-gray-600">{salon.phone}</p>
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
        {salon.services?.some(service => service.requiresDeposit) && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-6 mb-8">
            <div className="flex items-start gap-3">
              <div className="text-yellow-600 text-2xl">⚠️</div>
              <div>
                <h3 className="text-xl font-bold text-yellow-800 mb-3">Políticas de Reserva</h3>
                <div className="text-sm text-yellow-700 space-y-2">
                  <p><strong>IMPORTANTE:</strong> Algunos servicios requieren depósito para confirmar la reserva.</p>
                  <ul className="list-disc list-inside space-y-1 ml-2">
                    <li><strong>Política de Inasistencia:</strong> Si no asistes a tu cita confirmada con depósito, el monto <strong>NO será reembolsado</strong></li>
                    <li><strong>Cancelaciones:</strong> Para cancelar o reprogramar, contacta al salón con <strong>al menos 24 horas de anticipación</strong></li>
                    <li><strong>Confirmación:</strong> Recibirás un email de confirmación con los detalles de tu cita</li>
                    <li><strong>Pago:</strong> El saldo restante se paga al llegar al salón</li>
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
        <div className="max-w-6xl mx-auto px-4 text-center">
          <p className="text-gray-400">
            © 2025 {salon.salonName} - Powered by ReservasBarbería
          </p>
        </div>
      </div>
    </div>
  )
}

export default PerfilPublico 