'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import api from '@/utils/api'
import ImageUploader from './ImageUploader'

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
          img._id === id ? {...img, isFeatured: !isFeatured} : img
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
        setImages(prev => prev.filter(img => img._id !== id))
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
          id: img._id,
          order: index
        }))
      })
    } catch (error) {
      console.error('Error guardando el orden:', error)
      alert('Error al guardar el orden de las imágenes')
    }
  }
  
  if (loading) {
    return <div className="text-center py-10">Cargando imágenes...</div>
  }
  
  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-1">
          <ImageUploader onImageUploaded={handleImageUploaded} />
        </div>
        
        <div className="md:col-span-2">
          <div className="bg-white p-6 rounded-lg shadow-md">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-semibold">Galería de Imágenes</h3>
              
              {/* Filtro de categorías */}
              <div className="flex items-center">
                <label className="mr-2 text-sm">Filtrar:</label>
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="p-1 border border-gray-300 rounded-md text-sm"
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
            
            {error && (
              <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-md">
                {error}
              </div>
            )}
            
            {filteredImages.length === 0 ? (
              <div className="text-center py-10 text-gray-500">
                No hay imágenes {selectedCategory !== 'all' ? `en la categoría "${selectedCategory}"` : ''}
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {filteredImages.map((image, index) => (
                  <div
                    key={image._id}
                    className="group relative rounded-md overflow-hidden border border-gray-200"
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
                    </div>
                    
                    <div className="p-2 bg-white">
                      <h4 className="font-medium text-sm truncate">
                        {image.title || 'Sin título'}
                      </h4>
                      <p className="text-xs text-gray-500 truncate">
                        {image.category}
                      </p>
                    </div>
                    
                    {/* Overlay con acciones */}
                    <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                      <div className="flex space-x-2">
                        <button
                          onClick={() => handleToggleFeatured(image._id, image.isFeatured)}
                          className={`p-2 rounded-full ${image.isFeatured ? 'bg-yellow-500' : 'bg-white'}`}
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
                          onClick={() => handleDelete(image._id)}
                          className="p-2 rounded-full bg-red-500"
                          title="Eliminar imagen"
                        >
                          <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
} 