'use client'

import { useState, useEffect, useCallback } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import api from '@/utils/api'
import ImageUploader from './ImageUploader'
import { useSocketEvent } from '@/contexts/SocketContext'

export default function GalleryManager() {
  const [images, setImages] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [draggedItem, setDraggedItem] = useState(null)

  
  // Cargar imágenes
  useEffect(() => {
    loadImages()
  }, [])

  // Real-time: auto-refresh cuando se modifica la galería
  useSocketEvent('gallery:updated', useCallback(() => {
    loadImages()
  }, []))
  
  const loadImages = async () => {
    try {
      setLoading(true)
      setError('')
      
      const response = await api.get('/gallery')
      if (response.success) {
        setImages(response.data || [])
      } else {
        setError('Error al cargar las imágenes')
      }
    } catch (error) {
      console.error('Error cargando imágenes:', error)
      setError('Error al cargar las imágenes. Por favor intenta nuevamente.')
    } finally {
      setLoading(false)
    }
  }
  
  // Agregar imagen recién subida a la lista
  const handleImageUploaded = (newImage) => {
    setImages(prev => [newImage, ...prev])
  }
  
  // Filtrar imágenes por categoría
  const filteredImages = selectedCategory === 'all' 
    ? images 
    : images.filter(img => img.category === selectedCategory)
  
  // Obtener lista de categorías únicas
  const categories = ['all', ...new Set(images.map(img => img.category))]
  
  // Manejar cambio de destacado
  const handleToggleFeatured = async (id, isFeatured) => {
    try {
      const response = await api.put(`/gallery/${id}`, {
        isFeatured: !isFeatured
      })
      
      if (response.success) {
        // Actualizar estado local
        setImages(prev => prev.map(img => 
          (img.id === id || img._id === id) ? {...img, isFeatured: !isFeatured} : img
        ))
      }
    } catch (error) {
      console.error('Error actualizando imagen:', error)
      alert('Error al actualizar la imagen')
    }
  }
  
  // Manejar eliminación
  const handleDelete = async (id) => {
    if (!confirm('¿Estás seguro de eliminar esta imagen?')) return
    
    try {
      const response = await api.delete(`/gallery/${id}`)
      
      if (response.success) {
        // Eliminar del estado local
        setImages(prev => prev.filter(img => (img.id !== id && img._id !== id)))
      }
    } catch (error) {
      console.error('Error eliminando imagen:', error)
      alert('Error al eliminar la imagen')
    }
  }
  
  // Funciones para drag and drop (reordenamiento)
  const handleDragStart = (e, index) => {
    setDraggedItem(index)
    e.dataTransfer.effectAllowed = 'move'
  }
  
  const handleDragOver = (e, index) => {
    e.preventDefault()
    if (draggedItem === null) return
    
    // Reorganizar
    const newImages = [...images]
    const draggedItemContent = newImages[draggedItem]
    newImages.splice(draggedItem, 1)
    newImages.splice(index, 0, draggedItemContent)
    
    // Actualizar estado y draggedItem
    setImages(newImages)
    setDraggedItem(index)
  }
  
  const handleDragEnd = async () => {
    setDraggedItem(null)
    
    // Actualizar orden en el servidor
    try {
      await api.put('/gallery/reorder', {
        items: images.map((img, index) => ({
          id: img.id || img._id,
          order: index
        }))
      })
    } catch (error) {
      console.error('Error guardando el orden:', error)
      alert('Error al guardar el orden de las imágenes')
    }
  }
  
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Cargando galería...</p>
        </div>
      </div>
    )
  }
  
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 shadow-sm border-b dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <Link href="/dashboard" className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 mr-4">
                ← Volver al Dashboard
              </Link>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Galería de Imágenes</h1>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Panel de subida */}
          <div className="lg:col-span-1">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 border border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Subir Nueva Imagen</h3>
              <ImageUploader onImageUploaded={handleImageUploaded} />
            </div>
          </div>
          
          {/* Panel de galería */}
          <div className="lg:col-span-2">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden border border-gray-200 dark:border-gray-700">
              <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Mis Imágenes ({filteredImages.length})</h3>
                  
                  {/* Filtro de categorías */}
                  <div className="flex items-center">
                    <label className="mr-2 text-sm font-medium text-gray-700 dark:text-gray-300">Filtrar:</label>
                    <select
                      value={selectedCategory}
                      onChange={(e) => setSelectedCategory(e.target.value)}
                      className="px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                    >
                      <option value="all">Todas</option>
                      {categories
                        .filter(c => c !== 'all')
                        .map(category => (
                          <option key={category} value={category}>
                            {category.charAt(0).toUpperCase() + category.slice(1)}
                          </option>
                        ))
                      }
                    </select>
                  </div>
                </div>
              </div>
            
              <div className="p-6">
                {error && (
                  <div className="mb-6 p-4 bg-red-100 dark:bg-red-900/30 border border-red-400 dark:border-red-800 text-red-700 dark:text-red-200 rounded">
                    {error}
                  </div>
                )}
                
                {filteredImages.length === 0 ? (
                  <div className="text-center py-12">
                    <svg className="w-16 h-16 text-gray-400 dark:text-gray-500 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">No hay imágenes</h3>
                    <p className="text-gray-600 dark:text-gray-300 mb-6">
                      {selectedCategory !== 'all' 
                        ? `No se encontraron imágenes en la categoría "${selectedCategory}"`
                        : 'Comienza subiendo fotos de tu negocio para mostrar a tus clientes'
                      }
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      💡 Las imágenes marcadas como destacadas aparecerán en la sección principal de tu perfil
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {filteredImages.map((image, index) => {
                      const imageId = image.id || image._id;
                      return (
                        <div
                          key={imageId}
                          className="group relative rounded-lg overflow-hidden border border-gray-200 dark:border-gray-600 shadow-sm hover:shadow-md transition-shadow duration-200"
                          draggable
                          onDragStart={(e) => handleDragStart(e, index)}
                          onDragOver={(e) => handleDragOver(e, index)}
                          onDragEnd={handleDragEnd}
                        >
                          <div className="aspect-square relative">
                            <img
                              src={image.imageUrl}
                              alt={image.title || 'Imagen de negocio'}
                              className="object-cover w-full h-full"
                            />
                            {image.isFeatured && (
                              <div className="absolute top-2 left-2 bg-yellow-500 text-white px-2 py-1 rounded-full text-xs font-semibold flex items-center">
                                <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                </svg>
                                Destacada
                              </div>
                            )}
                          </div>
                          
                          <div className="p-3 bg-white dark:bg-gray-700">
                            <h4 className="font-medium text-sm truncate text-gray-900 dark:text-gray-100">
                              {image.title || 'Sin título'}
                            </h4>
                            <p className="text-xs text-gray-500 dark:text-gray-400 truncate capitalize">
                              {image.category}
                            </p>
                          </div>
                          
                          {/* Overlay con acciones */}
                          <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                            <div className="flex space-x-2">
                              <button
                                onClick={() => handleToggleFeatured(imageId, image.isFeatured)}
                                className={`p-3 rounded-full transition-colors ${image.isFeatured ? 'bg-yellow-500 hover:bg-yellow-600' : 'bg-white dark:bg-gray-600 hover:bg-gray-100 dark:hover:bg-gray-500'}`}
                                title={image.isFeatured ? 'Quitar destacado' : 'Destacar imagen'}
                              >
                                <svg 
                                  className={`w-5 h-5 ${image.isFeatured ? 'text-white' : 'text-yellow-500'}`} 
                                  fill="currentColor" 
                                  viewBox="0 0 20 20"
                                >
                                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                </svg>
                              </button>
                              
                              <button
                                onClick={() => handleDelete(imageId)}
                                className="p-3 rounded-full bg-red-500 hover:bg-red-600 transition-colors"
                                title="Eliminar imagen"
                              >
                                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
} 