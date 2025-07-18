'use client'

import { useState, useRef } from 'react'
import api from '@/utils/api'

export default function ImageUploader({ onImageUploaded }) {
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [error, setError] = useState('')
  const [imagePreview, setImagePreview] = useState(null)
  const fileInputRef = useRef(null)
  
  const [imageData, setImageData] = useState({
    title: '',
    description: '',
    category: 'otros',
    isFeatured: false
  })

  const handleFileChange = (e) => {
    const file = e.target.files[0]
    if (!file) return

    // Reset states
    setError('')
    setImagePreview(null)
    
    // Validate file type
    const validTypes = ['image/jpeg', 'image/png', 'image/jpg', 'image/webp']
    if (!validTypes.includes(file.type)) {
      setError('Tipo de archivo no soportado. Solo se permiten JPG, PNG y WebP.')
      return
    }
    
    // Validate file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      setError('La imagen es demasiado grande. El tamaño máximo es 5MB.')
      return
    }
    
    // Create preview
    const reader = new FileReader()
    reader.onload = (e) => {
      setImagePreview(e.target.result)
    }
    reader.readAsDataURL(file)
  }
  
  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target
    setImageData({
      ...imageData,
      [name]: type === 'checkbox' ? checked : value
    })
  }
  
  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!fileInputRef.current?.files?.length) {
      setError('Por favor selecciona una imagen')
      return
    }
    
    const file = fileInputRef.current.files[0]
    const formData = new FormData()
    
    // Append image file
    formData.append('image', file)
    
    // Append metadata
    Object.keys(imageData).forEach(key => {
      formData.append(key, imageData[key])
    })
    
    setIsUploading(true)
    setUploadProgress(0)
    
    try {
      // Simular progreso para mejor UX
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 90) clearInterval(progressInterval)
          return Math.min(prev + 5, 90)
        })
      }, 300)
      
      const response = await api.post('/gallery', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      })
      
      clearInterval(progressInterval)
      setUploadProgress(100)
      
      // Reset form
      setTimeout(() => {
        setIsUploading(false)
        setUploadProgress(0)
        setImagePreview(null)
        fileInputRef.current.value = ''
        setImageData({
          title: '',
          description: '',
          category: 'otros',
          isFeatured: false
        })
        
        // Notify parent component
        if (onImageUploaded) {
          onImageUploaded(response.data.data)
        }
      }, 1000)
      
    } catch (error) {
      console.error('Error al subir imagen:', error)
      setIsUploading(false)
      setError(error.response?.data?.message || 'Error al subir la imagen')
    }
  }
  
  return (
    <div className="bg-white p-6 rounded-lg shadow-md">
      <h3 className="text-lg font-semibold mb-4">Subir Nueva Imagen</h3>
      
      {error && (
        <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-md">
          {error}
        </div>
      )}
      
      <form onSubmit={handleSubmit}>
        {/* File input */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Imagen
          </label>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept="image/jpeg,image/png,image/jpg,image/webp"
            className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
            disabled={isUploading}
          />
        </div>
        
        {/* Image preview */}
        {imagePreview && (
          <div className="mb-4">
            <div className="relative aspect-video overflow-hidden rounded-md">
              <img 
                src={imagePreview} 
                alt="Preview" 
                className="object-cover w-full h-full"
              />
            </div>
          </div>
        )}
        
        {/* Image metadata */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Título
          </label>
          <input
            type="text"
            name="title"
            value={imageData.title}
            onChange={handleInputChange}
            className="w-full p-2 border border-gray-300 rounded-md"
            disabled={isUploading}
          />
        </div>
        
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Descripción
          </label>
          <textarea
            name="description"
            value={imageData.description}
            onChange={handleInputChange}
            className="w-full p-2 border border-gray-300 rounded-md"
            rows="2"
            disabled={isUploading}
          ></textarea>
        </div>
        
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Categoría
          </label>
          <select
            name="category"
            value={imageData.category}
            onChange={handleInputChange}
            className="w-full p-2 border border-gray-300 rounded-md"
            disabled={isUploading}
          >
            <option value="exterior">Exterior</option>
            <option value="interior">Interior</option>
            <option value="servicios">Servicios</option>
            <option value="equipo">Equipo</option>
            <option value="otros">Otros</option>
          </select>
        </div>
        
        <div className="mb-4">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              name="isFeatured"
              checked={imageData.isFeatured}
              onChange={handleInputChange}
              className="rounded text-blue-600"
              disabled={isUploading}
            />
            <span className="text-sm font-medium text-gray-700">
              Destacar en perfil público
            </span>
          </label>
        </div>
        
        {/* Upload progress */}
        {isUploading && (
          <div className="mb-4">
            <div className="w-full bg-gray-200 rounded-full h-2.5">
              <div 
                className="bg-blue-600 h-2.5 rounded-full transition-all duration-300"
                style={{ width: `${uploadProgress}%` }}
              ></div>
            </div>
            <p className="text-sm text-gray-500 mt-1 text-center">
              {uploadProgress < 100 ? 'Subiendo...' : '¡Subida completada!'}
            </p>
          </div>
        )}
        
        {/* Submit button */}
        <button
          type="submit"
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
          disabled={isUploading}
        >
          {isUploading ? 'Subiendo...' : 'Subir Imagen'}
        </button>
      </form>
    </div>
  )
} 