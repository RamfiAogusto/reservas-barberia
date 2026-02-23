'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import api from '@/utils/api'
import { useSocketEvent } from '@/contexts/SocketContext'
import { toast } from 'sonner'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from '@/components/ui/dialog'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Loader2, Plus, Pencil, Trash2, Users } from 'lucide-react'

const BarbersPage = () => {
  const router = useRouter()
  const [barbers, setBarbers] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingBarber, setEditingBarber] = useState(null)
  const [formData, setFormData] = useState({ name: '', phone: '', email: '', specialty: '' })
  const [errors, setErrors] = useState({})
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => { loadBarbers() }, [])

  useSocketEvent('barber:updated', useCallback(() => { loadBarbers() }, []))

  const loadBarbers = async () => {
    try {
      setLoading(true)
      const response = await api.get('/barbers')
      if (response.success) setBarbers(response.data || [])
    } catch (error) {
      console.error('Error cargando barberos:', error)
    } finally { setLoading(false) }
  }

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: '' }))
  }

  const handleValidateForm = () => {
    const newErrors = {}
    if (!formData.name.trim()) newErrors.name = 'El nombre del barbero es requerido'
    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) newErrors.email = 'Email inválido'
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!handleValidateForm()) return
    try {
      setSubmitting(true)
      const barberData = {
        name: formData.name.trim(),
        phone: formData.phone.trim() || undefined,
        email: formData.email.trim() || undefined,
        specialty: formData.specialty.trim() || undefined
      }
      let response
      if (editingBarber) {
        response = await api.put(`/barbers/${editingBarber.id}`, barberData)
      } else {
        response = await api.post('/barbers', barberData)
      }
      if (response.success) {
        if (editingBarber) {
          setBarbers(prev => prev.map(b => b.id === editingBarber.id ? response.data : b))
        } else {
          setBarbers(prev => [...prev, response.data])
        }
        handleCloseModal()
        toast.success(editingBarber ? 'Barbero actualizado' : 'Barbero creado')
      } else {
        setErrors({ general: response.message || 'Error al guardar el barbero' })
      }
    } catch (error) {
      console.error('Error guardando barbero:', error)
      setErrors({ general: 'Error interno del servidor' })
    } finally { setSubmitting(false) }
  }

  const handleEdit = (barber) => {
    setEditingBarber(barber)
    setFormData({ name: barber.name || '', phone: barber.phone || '', email: barber.email || '', specialty: barber.specialty || '' })
    setShowModal(true)
  }

  const handleDelete = async (barberId) => {
    try {
      const response = await api.delete(`/barbers/${barberId}`)
      if (response.success) {
        setBarbers(prev => prev.filter(b => b.id !== barberId))
        toast.success('Barbero eliminado')
      } else {
        toast.error('Error al desactivar el barbero')
      }
    } catch (error) {
      console.error('Error eliminando barbero:', error)
      toast.error('Error interno del servidor')
    }
  }

  const handleCloseModal = () => {
    setShowModal(false)
    setEditingBarber(null)
    setFormData({ name: '', phone: '', email: '', specialty: '' })
    setErrors({})
  }

  const handleOpenCreateModal = () => {
    setEditingBarber(null)
    setFormData({ name: '', phone: '', email: '', specialty: '' })
    setErrors({})
    setShowModal(true)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <Loader2 className="h-10 w-10 animate-spin text-primary-600 mx-auto" />
          <p className="mt-3 text-sm text-gray-500 dark:text-gray-400">Cargando barberos...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Barberos</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Administra el equipo de tu barbería</p>
        </div>
        <Button onClick={handleOpenCreateModal}>
          <Plus className="w-4 h-4 mr-2" />
          Agregar barbero
        </Button>
      </div>

      {barbers.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <Users className="w-12 h-12 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">No hay barberos registrados</h3>
            <p className="text-gray-500 dark:text-gray-400 mb-6">Agrega a los barberos de tu equipo para que los clientes puedan elegir con quién reservar.</p>
            <Button onClick={handleOpenCreateModal}>
              <Plus className="w-4 h-4 mr-2" />
              Agregar primer barbero
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {barbers.map(barber => (
            <Card key={barber.id}>
              <CardContent className="p-5 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-full bg-primary-100 dark:bg-primary-900/40 flex items-center justify-center text-2xl flex-shrink-0">
                    {barber.avatar ? (
                      <img src={barber.avatar} alt={barber.name} className="w-full h-full rounded-full object-cover" />
                    ) : '✂️'}
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-gray-100">{barber.name}</h3>
                    {barber.specialty && <p className="text-sm text-primary-600 dark:text-primary-400">{barber.specialty}</p>}
                    <div className="flex gap-3 mt-1 text-xs text-gray-500 dark:text-gray-400">
                      {barber.phone && <span>📞 {barber.phone}</span>}
                      {barber.email && <span>✉️ {barber.email}</span>}
                      {barber._count?.appointments !== undefined && <span>📋 {barber._count.appointments} citas</span>}
                    </div>
                  </div>
                </div>
                <div className="flex gap-1">
                  <Button variant="ghost" size="icon" onClick={() => handleEdit(barber)} aria-label="Editar barbero">
                    <Pencil className="w-4 h-4" />
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" size="icon" className="text-red-600 hover:text-red-700 dark:text-red-400" aria-label="Eliminar barbero">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>¿Eliminar barbero?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Se desactivará a {barber.name}. Las citas existentes no se verán afectadas.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={() => handleDelete(barber.id)} className="bg-red-600 hover:bg-red-700 text-white">Eliminar</AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={showModal} onOpenChange={(open) => { if (!open) handleCloseModal() }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingBarber ? 'Editar barbero' : 'Nuevo barbero'}</DialogTitle>
            <DialogDescription>{editingBarber ? 'Modifica los datos del barbero' : 'Agrega un nuevo barbero a tu equipo'}</DialogDescription>
          </DialogHeader>

          {errors.general && (
            <div className="p-3 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-700 dark:text-red-400">
              {errors.general}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="barber-name">Nombre *</Label>
              <Input id="barber-name" name="name" value={formData.name} onChange={handleInputChange} placeholder="Nombre del barbero" required className={errors.name ? 'border-red-500' : ''} />
              {errors.name && <p className="text-sm text-red-600 dark:text-red-400">{errors.name}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="barber-specialty">Especialidad</Label>
              <Input id="barber-specialty" name="specialty" value={formData.specialty} onChange={handleInputChange} placeholder="Ej: Cortes clásicos, Degradados, etc." />
            </div>
            <div className="space-y-2">
              <Label htmlFor="barber-phone">Teléfono</Label>
              <Input id="barber-phone" name="phone" type="tel" value={formData.phone} onChange={handleInputChange} placeholder="809-555-1234" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="barber-email">Email</Label>
              <Input id="barber-email" name="email" type="email" value={formData.email} onChange={handleInputChange} placeholder="barbero@email.com" className={errors.email ? 'border-red-500' : ''} />
              {errors.email && <p className="text-sm text-red-600 dark:text-red-400">{errors.email}</p>}
            </div>

            <DialogFooter className="pt-4">
              <Button type="button" variant="outline" onClick={handleCloseModal}>Cancelar</Button>
              <Button type="submit" disabled={submitting}>
                {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {submitting ? 'Guardando...' : editingBarber ? 'Actualizar' : 'Crear barbero'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default BarbersPage
