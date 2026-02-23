'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import api from '@/utils/api'
import ImageUploader from './ImageUploader'
import { useSocketEvent } from '@/contexts/SocketContext'
import { toast } from 'sonner'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Loader2, Star, Trash2, Image as ImageIcon, ArrowLeft } from 'lucide-react'

export default function GalleryManager() {
  const [images, setImages] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [draggedItem, setDraggedItem] = useState(null)

  useEffect(() => { loadImages() }, [])

  useSocketEvent('gallery:updated', useCallback(() => { loadImages() }, []))

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
    } finally { setLoading(false) }
  }

  const handleImageUploaded = (newImage) => {
    setImages(prev => [newImage, ...prev])
  }

  const filteredImages = selectedCategory === 'all'
    ? images
    : images.filter(img => img.category === selectedCategory)

  const categories = ['all', ...new Set(images.map(img => img.category))]

  const handleToggleFeatured = async (id, isFeatured) => {
    try {
      const response = await api.put(`/gallery/${id}`, { isFeatured: !isFeatured })
      if (response.success) {
        setImages(prev => prev.map(img =>
          (img.id === id || img._id === id) ? { ...img, isFeatured: !isFeatured } : img
        ))
        toast.success(isFeatured ? 'Destacado removido' : 'Imagen destacada')
      }
    } catch (error) {
      console.error('Error actualizando imagen:', error)
      toast.error('Error al actualizar la imagen')
    }
  }

  const handleDelete = async (id) => {
    try {
      const response = await api.delete(`/gallery/${id}`)
      if (response.success) {
        setImages(prev => prev.filter(img => (img.id !== id && img._id !== id)))
        toast.success('Imagen eliminada')
      }
    } catch (error) {
      console.error('Error eliminando imagen:', error)
      toast.error('Error al eliminar la imagen')
    }
  }

  const handleDragStart = (e, index) => {
    setDraggedItem(index)
    e.dataTransfer.effectAllowed = 'move'
  }

  const handleDragOver = (e, index) => {
    e.preventDefault()
    if (draggedItem === null) return
    const newImages = [...images]
    const draggedItemContent = newImages[draggedItem]
    newImages.splice(draggedItem, 1)
    newImages.splice(index, 0, draggedItemContent)
    setImages(newImages)
    setDraggedItem(index)
  }

  const handleDragEnd = async () => {
    setDraggedItem(null)
    try {
      await api.put('/gallery/reorder', {
        items: images.map((img, index) => ({ id: img.id || img._id, order: index }))
      })
    } catch (error) {
      console.error('Error guardando el orden:', error)
      toast.error('Error al guardar el orden de las imágenes')
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <Loader2 className="h-10 w-10 animate-spin text-primary-600 mx-auto" />
          <p className="mt-3 text-sm text-gray-500 dark:text-gray-400">Cargando galería...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Galería de Imágenes</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Sube y organiza las fotos de tu barbería</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Subir Nueva Imagen</CardTitle>
            </CardHeader>
            <CardContent>
              <ImageUploader onImageUploaded={handleImageUploaded} />
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-2">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
              <CardTitle className="text-base">Mis Imágenes ({filteredImages.length})</CardTitle>
              <div className="flex items-center gap-2">
                <Label className="text-sm font-normal">Filtrar:</Label>
                <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                  <SelectTrigger className="w-[140px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas</SelectItem>
                    {categories.filter(c => c !== 'all').map(category => (
                      <SelectItem key={category} value={category}>
                        {category.charAt(0).toUpperCase() + category.slice(1)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent>
              {error && (
                <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 rounded-lg text-sm">
                  {error}
                </div>
              )}

              {filteredImages.length === 0 ? (
                <div className="text-center py-12">
                  <ImageIcon className="w-12 h-12 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">No hay imágenes</h3>
                  <p className="text-gray-500 dark:text-gray-400 mb-4 text-sm">
                    {selectedCategory !== 'all'
                      ? `No se encontraron imágenes en la categoría "${selectedCategory}"`
                      : 'Comienza subiendo fotos de tu negocio para mostrar a tus clientes'}
                  </p>
                  <p className="text-xs text-gray-400 dark:text-gray-500">
                    Las imágenes marcadas como destacadas aparecerán en la sección principal de tu perfil
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {filteredImages.map((image, index) => {
                    const imageId = image.id || image._id
                    return (
                      <div
                        key={imageId}
                        className="group relative rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md transition-shadow duration-200"
                        draggable
                        onDragStart={(e) => handleDragStart(e, index)}
                        onDragOver={(e) => handleDragOver(e, index)}
                        onDragEnd={handleDragEnd}
                      >
                        <div className="aspect-square relative">
                          <img src={image.imageUrl} alt={image.title || 'Imagen de negocio'} className="object-cover w-full h-full" />
                          {image.isFeatured && (
                            <Badge className="absolute top-2 left-2 bg-yellow-500 hover:bg-yellow-500 text-white">
                              <Star className="w-3 h-3 mr-1 fill-current" />
                              Destacada
                            </Badge>
                          )}
                        </div>
                        <div className="p-3">
                          <h4 className="font-medium text-sm truncate text-gray-900 dark:text-gray-100">{image.title || 'Sin título'}</h4>
                          <p className="text-xs text-gray-500 dark:text-gray-400 truncate capitalize">{image.category}</p>
                        </div>
                        <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                          <div className="flex space-x-2">
                            <Button
                              size="icon"
                              variant={image.isFeatured ? "default" : "secondary"}
                              className={image.isFeatured ? "bg-yellow-500 hover:bg-yellow-600" : ""}
                              onClick={() => handleToggleFeatured(imageId, image.isFeatured)}
                              aria-label={image.isFeatured ? 'Quitar destacado' : 'Destacar imagen'}
                            >
                              <Star className={`w-4 h-4 ${image.isFeatured ? 'fill-current text-white' : 'text-yellow-500'}`} />
                            </Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button size="icon" variant="destructive" aria-label="Eliminar imagen">
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>¿Eliminar imagen?</AlertDialogTitle>
                                  <AlertDialogDescription>Esta acción no se puede deshacer.</AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => handleDelete(imageId)} className="bg-red-600 hover:bg-red-700 text-white">Eliminar</AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
