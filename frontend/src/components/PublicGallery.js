'use client'

import { useState, useEffect } from 'react'
import api from '@/utils/api'

export default function PublicGallery({ username }) {
  const [images, setImages] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [lightboxOpen, setLightboxOpen] = useState(false)
  const [currentImageIndex, setCurrentImageIndex] = useState(0)
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [categories, setCategories] = useState([])

  useEffect(() => {
    if (!username) return
    loadGallery()
  }, [username])

  const loadGallery = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const response = await api.get(`/public/salon/${username}/gallery`)
      
      if (response.success) {
        setImages(response.data.images || [])
        setCategories(response.data.categories || [])
      } else {
        setError('No se pudo cargar la galería')
      }
    } catch (error) {
      console.error('Error cargando galería:', error)
      setError('Error al cargar las imágenes')
    } finally {
      setLoading(false)
    }
  }

  // Filtrar imágenes por categoría
  const filteredImages = selectedCategory === 'all' 
    ? images 
    : images.filter(img => img.category === selectedCategory)

  // Abrir lightbox con una imagen específica
  const openLightbox = (index) => {
    setCurrentImageIndex(index)
    setLightboxOpen(true)
    // Prevenir scroll del body cuando el lightbox está abierto
    document.body.style.overflow = 'hidden'
  }

  // Cerrar lightbox
  const closeLightbox = () => {
    setLightboxOpen(false)
    // Restaurar scroll
    document.body.style.overflow = 'auto'
  }

  // Navegar a la imagen anterior
  const prevImage = () => {
    setCurrentImageIndex((prev) => 
      prev === 0 ? filteredImages.length - 1 : prev - 1
    )
  }

  // Navegar a la siguiente imagen
  const nextImage = () => {
    setCurrentImageIndex((prev) => 
      prev === filteredImages.length - 1 ? 0 : prev + 1
    )
  }

  // Manejar teclas para navegación en lightbox
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!lightboxOpen) return
      
      if (e.key === 'Escape') {
        closeLightbox()
      } else if (e.key === 'ArrowLeft') {
        prevImage()
      } else if (e.key === 'ArrowRight') {
        nextImage()
      }
    }
    
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [lightboxOpen])

  if (loading) {
    return (
      <div className="py-12 flex justify-center" role="status" aria-live="polite">
        <div className="flex items-center gap-3 text-stone-500">
          <div className="animate-spin rounded-full h-6 w-6 border-2 border-amber-600 border-t-transparent" aria-hidden="true" />
          <span>Cargando galería...</span>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="py-12 text-center">
        <p className="text-red-600 dark:text-red-400">{error}</p>
      </div>
    )
  }

  if (images.length === 0) {
    return (
      <div className="py-12 text-center text-stone-500 dark:text-stone-400 rounded-2xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-gray-800">
        Aún no hay imágenes para mostrar
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Filtro de categorías */}
      {categories.length > 0 && (
        <div className="flex justify-center gap-2 overflow-x-auto pb-4">
          <button
            onClick={() => setSelectedCategory('all')}
            className={`px-4 py-2 text-sm font-medium rounded-xl whitespace-nowrap transition-colors focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 ${
              selectedCategory === 'all'
                ? 'bg-amber-600 text-white'
                : 'bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 hover:bg-stone-200 dark:hover:bg-stone-700'
            }`}
          >
            Todas
          </button>
          {categories.map(category => (
            <button
              key={category}
              onClick={() => setSelectedCategory(category)}
              className={`px-4 py-2 text-sm font-medium rounded-xl whitespace-nowrap transition-colors focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 ${
                selectedCategory === category
                  ? 'bg-amber-600 text-white'
                  : 'bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 hover:bg-stone-200 dark:hover:bg-stone-700'
              }`}
            >
              {category.charAt(0).toUpperCase() + category.slice(1)}
            </button>
          ))}
        </div>
      )}

      {/* Galería */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {filteredImages.map((image, index) => (
          <button
            type="button"
            key={image._id || image.id || `img-${index}`}
            className="relative overflow-hidden rounded-2xl cursor-pointer group text-left"
            onClick={() => openLightbox(index)}
            aria-label={image.title || `Ver imagen ${index + 1}`}
          >
            <div className="aspect-square overflow-hidden">
              <img
                src={image.imageUrl}
                alt={image.title || 'Imagen del negocio'}
                className="object-cover w-full h-full transition-transform duration-300 group-hover:scale-110"
              />
            </div>
            
            {image.title && (
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                <p className="text-white font-medium text-sm truncate">
                  {image.title}
                </p>
                {image.description && (
                  <p className="text-white/80 text-xs truncate mt-0.5">
                    {image.description}
                  </p>
                )}
              </div>
            )}
          </button>
        ))}
      </div>

      {/* Lightbox */}
      {lightboxOpen && filteredImages.length > 0 && (
        <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center" onClick={closeLightbox}>
          <div className="relative max-w-5xl w-full h-full flex items-center justify-center px-4" onClick={(e) => e.stopPropagation()}>
            {/* Imagen actual */}
            <div className="relative w-full h-full max-h-[80vh] flex items-center justify-center">
              <img
                src={filteredImages[currentImageIndex].imageUrl}
                alt={filteredImages[currentImageIndex].title || 'Imagen ampliada'}
                className="max-w-full max-h-full object-contain"
              />
              
              {/* Título y descripción */}
              {(filteredImages[currentImageIndex].title || filteredImages[currentImageIndex].description) && (
                <div className="absolute bottom-0 left-0 right-0 bg-black/50 text-white p-4">
                  {filteredImages[currentImageIndex].title && (
                    <h3 className="font-medium">{filteredImages[currentImageIndex].title}</h3>
                  )}
                  {filteredImages[currentImageIndex].description && (
                    <p className="text-sm text-white/90 mt-1">{filteredImages[currentImageIndex].description}</p>
                  )}
                </div>
              )}
            </div>
            
            {/* Botón de cierre */}
            <button
              className="absolute top-4 right-4 text-white p-2 rounded-full bg-black/50 hover:bg-black/70 transition-colors focus:outline-none focus:ring-2 focus:ring-white/50"
              onClick={closeLightbox}
              aria-label="Cerrar"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            
            {/* Botones de navegación */}
            <button
              className="absolute left-4 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/50 text-white hover:bg-black"
              onClick={(e) => {
                e.stopPropagation()
                prevImage()
              }}
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            
            <button
              className="absolute right-4 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/50 text-white hover:bg-black"
              onClick={(e) => {
                e.stopPropagation()
                nextImage()
              }}
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </div>
      )}
    </div>
  )
} 