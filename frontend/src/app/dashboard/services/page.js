'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import api from '@/utils/api'
import { useSocketEvent } from '@/contexts/SocketContext'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from '@/components/ui/dialog'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Loader2, Plus, Pencil, Trash2, Scissors, ArrowLeft } from 'lucide-react'

const ServicesPage = () => {
  const [services, setServices] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingService, setEditingService] = useState(null)
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    duration: '',
    category: 'corte',
    showDuration: true
  })
  const [errors, setErrors] = useState({})
  const [submitting, setSubmitting] = useState(false)

  const reloadServices = useCallback(async () => {
    try {
      const response = await api.get('/services')
      if (response.success) {
        setServices(response.data || [])
      }
    } catch (error) {
      console.error('Error cargando servicios:', error)
    }
  }, [])

  useEffect(() => {
    const handleLoadServices = async () => {
      try {
        setLoading(true)
        await reloadServices()
      } finally {
        setLoading(false)
      }
    }
    handleLoadServices()
  }, [reloadServices])

  useSocketEvent('service:updated', reloadServices)

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }))
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }))
    }
  }

  const handleValidateForm = () => {
    const newErrors = {}
    if (!formData.name.trim()) newErrors.name = 'El nombre del servicio es requerido'
    if (!formData.price || formData.price <= 0) newErrors.price = 'El precio debe ser mayor a 0'
    if (!formData.duration || formData.duration < 30) {
      newErrors.duration = 'La duración debe ser al menos 30 minutos'
    } else if (formData.duration % 30 !== 0) {
      newErrors.duration = 'La duración debe ser en bloques de 30 minutos'
    }
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!handleValidateForm()) return

    try {
      setSubmitting(true)
      const serviceData = {
        name: formData.name,
        description: formData.description,
        price: parseFloat(formData.price),
        duration: parseInt(formData.duration),
        category: formData.category.toUpperCase(),
        showDuration: formData.showDuration
      }

      let response
      if (editingService) {
        response = await api.put(`/services/${editingService.id || editingService._id}`, serviceData)
      } else {
        response = await api.post('/services', serviceData)
      }

      if (response.success) {
        if (editingService) {
          const editingId = editingService.id || editingService._id
          setServices(prev => prev.map(service =>
            (service.id || service._id) === editingId ? response.data : service
          ))
        } else {
          setServices(prev => [...prev, response.data])
        }
        handleCloseModal()
      } else {
        setErrors({ general: response.message || 'Error al guardar el servicio' })
      }
    } catch (error) {
      console.error('Error guardando servicio:', error)
      setErrors({ general: 'Error interno del servidor' })
    } finally {
      setSubmitting(false)
    }
  }

  const handleEdit = (service) => {
    setEditingService(service)
    setFormData({
      name: service.name,
      description: service.description || '',
      price: service.price.toString(),
      duration: service.duration.toString(),
      category: service.category ? service.category.toLowerCase() : 'corte',
      showDuration: service.showDuration !== undefined ? service.showDuration : true
    })
    setShowModal(true)
  }

  const handleDelete = async (serviceId) => {
    try {
      const response = await api.delete(`/services/${serviceId}`)
      if (response.success) {
        setServices(prev => prev.filter(service => (service.id || service._id) !== serviceId))
      }
    } catch (error) {
      console.error('Error eliminando servicio:', error)
    }
  }

  const handleCloseModal = () => {
    setShowModal(false)
    setEditingService(null)
    setFormData({ name: '', description: '', price: '', duration: '', category: 'corte', showDuration: true })
    setErrors({})
  }

  const handleOpenCreateModal = () => {
    setEditingService(null)
    setFormData({ name: '', description: '', price: '', duration: '', category: 'corte', showDuration: true })
    setErrors({})
    setShowModal(true)
  }

  const formatDuration = (minutes) => {
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    if (hours > 0) return mins > 0 ? `${hours}h ${mins}min` : `${hours}h`
    return `${mins}min`
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <Loader2 className="h-10 w-10 animate-spin text-primary-600 mx-auto" />
          <p className="mt-3 text-sm text-gray-500 dark:text-gray-400">Cargando servicios...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Gestión de Servicios</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Administra los servicios que ofreces</p>
        </div>
        <Button onClick={handleOpenCreateModal}>
          <Plus className="w-4 h-4 mr-2" />
          Nuevo Servicio
        </Button>
      </div>

      {!services || services.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <Scissors className="w-12 h-12 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">No tienes servicios creados</h3>
            <p className="text-gray-500 dark:text-gray-400 mb-6">Comienza agregando los servicios que ofreces en tu barbería</p>
            <Button onClick={handleOpenCreateModal}>
              <Plus className="w-4 h-4 mr-2" />
              Crear mi primer servicio
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Mis Servicios ({services.length})</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Servicio</TableHead>
                  <TableHead>Categoría</TableHead>
                  <TableHead>Precio</TableHead>
                  <TableHead>Duración</TableHead>
                  <TableHead>Visible</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {services.map((service) => (
                  <TableRow key={service.id || service._id}>
                    <TableCell>
                      <div>
                        <div className="font-medium text-gray-900 dark:text-gray-100">{service.name}</div>
                        {service.description && (
                          <div className="text-sm text-gray-500 dark:text-gray-400 max-w-xs truncate">{service.description}</div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="info" className="capitalize">{service.category}</Badge>
                    </TableCell>
                    <TableCell className="text-gray-900 dark:text-gray-100">${service.price}</TableCell>
                    <TableCell className="text-gray-900 dark:text-gray-100">
                      {service.formattedDuration ? service.formattedDuration : formatDuration(service.duration)}
                    </TableCell>
                    <TableCell>
                      <Badge variant={service.showDuration ? 'success' : 'destructive'}>
                        {service.showDuration ? 'Sí' : 'No'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon" onClick={() => handleEdit(service)} aria-label="Editar servicio">
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon" className="text-red-600 hover:text-red-700 dark:text-red-400" aria-label="Eliminar servicio">
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>¿Eliminar servicio?</AlertDialogTitle>
                              <AlertDialogDescription>
                                Esta acción no se puede deshacer. Se eliminará permanentemente el servicio "{service.name}".
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleDelete(service.id || service._id)}
                                className="bg-red-600 hover:bg-red-700 text-white"
                              >
                                Eliminar
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      <Dialog open={showModal} onOpenChange={(open) => { if (!open) handleCloseModal() }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingService ? 'Editar Servicio' : 'Nuevo Servicio'}</DialogTitle>
            <DialogDescription>
              {editingService ? 'Modifica los datos del servicio' : 'Agrega un nuevo servicio a tu barbería'}
            </DialogDescription>
          </DialogHeader>

          {errors.general && (
            <div className="p-3 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-700 dark:text-red-400">
              {errors.general}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="svc-name">Nombre del Servicio *</Label>
              <Input
                id="svc-name"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                placeholder="Ej: Corte clásico"
                className={errors.name ? 'border-red-500' : ''}
              />
              {errors.name && <p className="text-sm text-red-600 dark:text-red-400">{errors.name}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="svc-desc">Descripción</Label>
              <Textarea
                id="svc-desc"
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                rows={3}
                placeholder="Descripción detallada del servicio..."
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="svc-price">Precio *</Label>
                <Input
                  id="svc-price"
                  name="price"
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.price}
                  onChange={handleInputChange}
                  placeholder="0.00"
                  className={errors.price ? 'border-red-500' : ''}
                />
                {errors.price && <p className="text-sm text-red-600 dark:text-red-400">{errors.price}</p>}
              </div>

              <div className="space-y-2">
                <Label>Duración *</Label>
                <Select
                  value={formData.duration}
                  onValueChange={(val) => {
                    setFormData(prev => ({ ...prev, duration: val }))
                    if (errors.duration) setErrors(prev => ({ ...prev, duration: '' }))
                  }}
                >
                  <SelectTrigger className={errors.duration ? 'border-red-500' : ''}>
                    <SelectValue placeholder="Seleccionar duración" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="30">30 minutos</SelectItem>
                    <SelectItem value="60">1 hora</SelectItem>
                    <SelectItem value="90">1 hora 30 min</SelectItem>
                    <SelectItem value="120">2 horas</SelectItem>
                    <SelectItem value="150">2 horas 30 min</SelectItem>
                    <SelectItem value="180">3 horas</SelectItem>
                    <SelectItem value="240">4 horas</SelectItem>
                    <SelectItem value="300">5 horas</SelectItem>
                    <SelectItem value="360">6 horas</SelectItem>
                    <SelectItem value="420">7 horas</SelectItem>
                    <SelectItem value="480">8 horas</SelectItem>
                  </SelectContent>
                </Select>
                {errors.duration && <p className="text-sm text-red-600 dark:text-red-400">{errors.duration}</p>}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Categoría</Label>
              <Select
                value={formData.category}
                onValueChange={(val) => setFormData(prev => ({ ...prev, category: val }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="corte">Corte</SelectItem>
                  <SelectItem value="barba">Barba</SelectItem>
                  <SelectItem value="combo">Combo</SelectItem>
                  <SelectItem value="tratamiento">Tratamiento</SelectItem>
                  <SelectItem value="otro">Otro</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center space-x-2 pt-2">
              <Checkbox
                id="svc-showDuration"
                checked={formData.showDuration}
                onCheckedChange={(checked) => setFormData(prev => ({ ...prev, showDuration: !!checked }))}
              />
              <Label htmlFor="svc-showDuration" className="font-normal cursor-pointer">
                Mostrar duración del servicio en el perfil público
              </Label>
            </div>

            <p className="text-xs text-gray-500 dark:text-gray-400">
              El depósito para reservas se configura en Configuración del dashboard
            </p>

            <DialogFooter className="pt-4">
              <Button type="button" variant="outline" onClick={handleCloseModal}>
                Cancelar
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {submitting ? 'Guardando...' : (editingService ? 'Actualizar' : 'Crear')}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default ServicesPage
