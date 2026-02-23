'use client'

import { useState, useEffect, useCallback } from 'react'
import api from '@/utils/api'
import { formatTime12h } from '@/utils/formatTime'
import TimeInput12h from '@/components/TimeInput12h'
import { useSocketEvent } from '@/contexts/SocketContext'
import { toast } from 'sonner'

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from '@/components/ui/dialog'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Loader2, Plus, Trash2, CalendarDays, Coffee, Ban, Save } from 'lucide-react'

const dayNames = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']

const SchedulesPage = () => {
  const [loading, setLoading] = useState(false)
  const [businessHours, setBusinessHours] = useState([])
  const [breaks, setBreaks] = useState([])
  const [showBreakForm, setShowBreakForm] = useState(false)
  const [breakForm, setBreakForm] = useState({ name: '', startTime: '', endTime: '', recurrenceType: 'daily', specificDays: [] })
  const [exceptions, setExceptions] = useState([])
  const [showExceptionForm, setShowExceptionForm] = useState(false)
  const [exceptionForm, setExceptionForm] = useState({
    name: '', exceptionType: 'day_off', startDate: '', endDate: '',
    specialStartTime: '', specialEndTime: '', isRecurringAnnually: false, reason: ''
  })

  const formatRecurrence = (recurrenceType, specificDays = []) => {
    if (recurrenceType === 'DAILY' || recurrenceType === 'daily') return 'Todos los días'
    if (recurrenceType === 'WEEKLY' || recurrenceType === 'weekly') return 'Semanalmente'
    if (recurrenceType === 'SPECIFIC_DAYS' || recurrenceType === 'specific_days') {
      if (specificDays?.length > 0) return specificDays.map(d => dayNames[d]).join(', ')
      return 'Días específicos'
    }
    return ''
  }

  const formatExceptionType = (exceptionType) => {
    const types = {
      DAY_OFF: 'Día libre', day_off: 'Día libre',
      SPECIAL_HOURS: 'Horario especial', special_hours: 'Horario especial',
      VACATION: 'Vacaciones', vacation: 'Vacaciones',
      HOLIDAY: 'Día festivo', holiday: 'Día festivo'
    }
    return types[exceptionType] || exceptionType || ''
  }

  const normalizeBusinessHours = (data) => {
    const normalizedHours = []
    for (let dayOfWeek = 0; dayOfWeek <= 6; dayOfWeek++) {
      const existingDay = data.find(day => day.dayOfWeek === dayOfWeek)
      normalizedHours.push(existingDay || { dayOfWeek, startTime: '09:00', endTime: '18:00', isActive: false })
    }
    return normalizedHours
  }

  useEffect(() => { handleLoadData() }, [])
  useSocketEvent('schedule:updated', useCallback(() => { handleLoadData() }, []))

  const handleLoadData = async () => {
    await Promise.all([loadBusinessHours(), loadBreaks(), loadExceptions()])
  }

  const loadBusinessHours = async () => {
    try {
      const response = await api.get('/schedules/business-hours')
      if (response.success) setBusinessHours(normalizeBusinessHours(response.data))
    } catch (error) { console.error('Error cargando horarios base:', error) }
  }

  const handleBusinessHoursChange = (dayIndex, field, value) => {
    setBusinessHours(prev => prev.map((day, index) => index === dayIndex ? { ...day, [field]: value } : day))
  }

  const handleSaveBusinessHours = async () => {
    try {
      setLoading(true)
      const response = await api.put('/schedules/business-hours', { schedule: businessHours })
      if (response.success) {
        toast.success('Horarios base actualizados')
        setBusinessHours(normalizeBusinessHours(response.data))
      } else {
        toast.error(response.message || 'Error actualizando horarios')
      }
    } catch (error) {
      console.error('Error actualizando horarios:', error)
      toast.error('Error de conexión')
    } finally { setLoading(false) }
  }

  const loadBreaks = async () => {
    try {
      const response = await api.get('/schedules/recurring-breaks')
      if (response.success) setBreaks(response.data)
    } catch (error) { console.error('Error cargando descansos:', error) }
  }

  const handleBreakSubmit = async (e) => {
    e.preventDefault()
    try {
      setLoading(true)
      const response = await api.post('/schedules/recurring-breaks', breakForm)
      if (response.success) {
        toast.success('Descanso creado')
        await loadBreaks()
        setShowBreakForm(false)
        setBreakForm({ name: '', startTime: '', endTime: '', recurrenceType: 'daily', specificDays: [] })
      } else {
        toast.error(response.message || 'Error creando descanso')
      }
    } catch (error) {
      console.error('Error creando descanso:', error)
      toast.error('Error de conexión')
    } finally { setLoading(false) }
  }

  const handleDeleteBreak = async (breakId) => {
    if (!breakId) return
    try {
      const response = await api.delete(`/schedules/recurring-breaks/${breakId}`)
      if (response.success) {
        toast.success('Descanso eliminado')
        await loadBreaks()
      } else {
        toast.error(response.message || 'Error eliminando descanso')
      }
    } catch (error) { console.error('Error eliminando descanso:', error) }
  }

  const loadExceptions = async () => {
    try {
      const response = await api.get('/schedules/exceptions')
      if (response.success) setExceptions(response.data)
    } catch (error) { console.error('Error cargando excepciones:', error) }
  }

  const handleExceptionSubmit = async (e) => {
    e.preventDefault()
    try {
      setLoading(true)
      const response = await api.post('/schedules/exceptions', exceptionForm)
      if (response.success) {
        toast.success('Excepción creada')
        await loadExceptions()
        setShowExceptionForm(false)
        setExceptionForm({ name: '', exceptionType: 'day_off', startDate: '', endDate: '', specialStartTime: '', specialEndTime: '', isRecurringAnnually: false, reason: '' })
      } else {
        toast.error(response.message || 'Error creando excepción')
      }
    } catch (error) {
      console.error('Error creando excepción:', error)
      toast.error('Error de conexión')
    } finally { setLoading(false) }
  }

  const handleDeleteException = async (exceptionId) => {
    if (!exceptionId) return
    try {
      const response = await api.delete(`/schedules/exceptions/${exceptionId}`)
      if (response.success) {
        toast.success('Excepción eliminada')
        await loadExceptions()
      } else {
        toast.error(response.message || 'Error eliminando excepción')
      }
    } catch (error) { console.error('Error eliminando excepción:', error) }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Configuración de Horarios</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Gestiona tus horarios de trabajo, descansos y excepciones</p>
      </div>

      <Tabs defaultValue="business-hours" className="space-y-6">
        <TabsList>
          <TabsTrigger value="business-hours" className="gap-2">
            <CalendarDays className="w-4 h-4" /> Horarios Base
          </TabsTrigger>
          <TabsTrigger value="breaks" className="gap-2">
            <Coffee className="w-4 h-4" /> Descansos
          </TabsTrigger>
          <TabsTrigger value="exceptions" className="gap-2">
            <Ban className="w-4 h-4" /> Excepciones
          </TabsTrigger>
        </TabsList>

        {/* HORARIOS BASE */}
        <TabsContent value="business-hours">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
              <div>
                <CardTitle>Horarios Semanales</CardTitle>
                <CardDescription>Define los días y horas de apertura</CardDescription>
              </div>
              <Button onClick={handleSaveBusinessHours} disabled={loading}>
                {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                Guardar Horarios
              </Button>
            </CardHeader>
            <CardContent className="space-y-3">
              {businessHours.map((day, index) => (
                <div key={day.dayOfWeek} className="flex items-center gap-4 p-3 rounded-lg border border-gray-200 dark:border-gray-700">
                  <div className="w-24 font-medium text-gray-900 dark:text-gray-100 text-sm">{dayNames[day.dayOfWeek]}</div>
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id={`day-${day.dayOfWeek}`}
                      checked={day.isActive || false}
                      onCheckedChange={(checked) => handleBusinessHoursChange(index, 'isActive', !!checked)}
                    />
                    <Label htmlFor={`day-${day.dayOfWeek}`} className="text-sm font-normal cursor-pointer">Abierto</Label>
                  </div>
                  {day.isActive ? (
                    <>
                      <div className="flex items-center gap-2">
                        <Label className="text-sm font-normal text-gray-500">Desde:</Label>
                        <TimeInput12h
                          value={day.startTime || '09:00'}
                          onChange={(val) => handleBusinessHoursChange(index, 'startTime', val)}
                          className="border border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 rounded-lg px-2 py-1 min-w-[120px]"
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <Label className="text-sm font-normal text-gray-500">Hasta:</Label>
                        <TimeInput12h
                          value={day.endTime || '18:00'}
                          onChange={(val) => handleBusinessHoursChange(index, 'endTime', val)}
                          className="border border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 rounded-lg px-2 py-1 min-w-[120px]"
                        />
                      </div>
                    </>
                  ) : (
                    <span className="text-sm text-gray-400 dark:text-gray-500 italic">Cerrado</span>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        {/* DESCANSOS */}
        <TabsContent value="breaks">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
              <div>
                <CardTitle>Descansos Recurrentes</CardTitle>
                <CardDescription>Agrega pausas como almuerzo o descanso</CardDescription>
              </div>
              <Button onClick={() => setShowBreakForm(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Agregar Descanso
              </Button>
            </CardHeader>
            <CardContent className="space-y-3">
              {breaks.length === 0 && (
                <div className="text-center py-8 text-gray-500 dark:text-gray-400 text-sm">No hay descansos configurados</div>
              )}
              {breaks.map((breakItem, index) => (
                <div key={breakItem.id || breakItem._id || `break-${index}`} className="flex items-center justify-between p-4 rounded-lg border border-gray-200 dark:border-gray-700">
                  <div>
                    <h3 className="font-medium text-gray-900 dark:text-gray-100">{breakItem.name}</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {formatTime12h(breakItem.startTime)} - {formatTime12h(breakItem.endTime)}
                    </p>
                    <p className="text-xs text-gray-400 dark:text-gray-500">{breakItem.recurrenceDescription || formatRecurrence(breakItem.recurrenceType, breakItem.specificDays)}</p>
                  </div>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" size="icon" className="text-red-600 dark:text-red-400" aria-label="Eliminar descanso">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>¿Eliminar descanso?</AlertDialogTitle>
                        <AlertDialogDescription>Se eliminará el descanso "{breakItem.name}".</AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={() => handleDeleteBreak(breakItem.id || breakItem._id)} className="bg-red-600 hover:bg-red-700 text-white">Eliminar</AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              ))}
            </CardContent>
          </Card>

          <Dialog open={showBreakForm} onOpenChange={setShowBreakForm}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Nuevo Descanso</DialogTitle>
                <DialogDescription>Define un periodo de descanso recurrente</DialogDescription>
              </DialogHeader>
              <form onSubmit={handleBreakSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label>Nombre del descanso</Label>
                  <Input required value={breakForm.name} onChange={(e) => setBreakForm(prev => ({ ...prev, name: e.target.value }))} placeholder="Ej: Almuerzo, Descanso tarde" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Hora de inicio</Label>
                    <TimeInput12h required value={breakForm.startTime} onChange={(val) => setBreakForm(prev => ({ ...prev, startTime: val }))} className="w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 rounded-lg" aria-label="Hora de inicio del descanso" />
                  </div>
                  <div className="space-y-2">
                    <Label>Hora de fin</Label>
                    <TimeInput12h required value={breakForm.endTime} onChange={(val) => setBreakForm(prev => ({ ...prev, endTime: val }))} className="w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 rounded-lg" aria-label="Hora de fin del descanso" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Recurrencia</Label>
                  <Select value={breakForm.recurrenceType} onValueChange={(val) => setBreakForm(prev => ({ ...prev, recurrenceType: val }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="daily">Todos los días</SelectItem>
                      <SelectItem value="weekly">Semanalmente</SelectItem>
                      <SelectItem value="specific_days">Días específicos</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {breakForm.recurrenceType === 'specific_days' && (
                  <div className="space-y-2">
                    <Label>Selecciona los días</Label>
                    <div className="grid grid-cols-4 gap-2">
                      {dayNames.map((day, idx) => (
                        <div key={idx} className="flex items-center space-x-2">
                          <Checkbox
                            id={`break-day-${idx}`}
                            checked={breakForm.specificDays.includes(idx)}
                            onCheckedChange={(checked) => {
                              setBreakForm(prev => ({
                                ...prev,
                                specificDays: checked
                                  ? [...prev.specificDays, idx]
                                  : prev.specificDays.filter(d => d !== idx)
                              }))
                            }}
                          />
                          <Label htmlFor={`break-day-${idx}`} className="text-sm font-normal cursor-pointer">{day}</Label>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setShowBreakForm(false)}>Cancelar</Button>
                  <Button type="submit" disabled={loading}>
                    {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Guardar Descanso
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </TabsContent>

        {/* EXCEPCIONES */}
        <TabsContent value="exceptions">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
              <div>
                <CardTitle>Excepciones y Días Libres</CardTitle>
                <CardDescription>Días festivos, vacaciones o horarios especiales</CardDescription>
              </div>
              <Button onClick={() => setShowExceptionForm(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Agregar Excepción
              </Button>
            </CardHeader>
            <CardContent className="space-y-3">
              {exceptions.length === 0 && (
                <div className="text-center py-8 text-gray-500 dark:text-gray-400 text-sm">No hay excepciones configuradas</div>
              )}
              {exceptions.map((exception, index) => (
                <div key={exception.id || exception._id || `exception-${index}`} className="flex items-center justify-between p-4 rounded-lg border border-gray-200 dark:border-gray-700">
                  <div>
                    <h3 className="font-medium text-gray-900 dark:text-gray-100">{exception.name}</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {exception.typeDescription || formatExceptionType(exception.exceptionType)} · {new Date(exception.startDate).toLocaleDateString()} - {new Date(exception.endDate).toLocaleDateString()}
                    </p>
                    {(exception.specialStartTime || exception.specialEndTime) && (
                      <p className="text-xs text-blue-600 dark:text-blue-400">
                        Horario especial: {formatTime12h(exception.specialStartTime)} - {formatTime12h(exception.specialEndTime)}
                      </p>
                    )}
                    {exception.reason && <p className="text-xs text-gray-400 dark:text-gray-500">{exception.reason}</p>}
                  </div>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" size="icon" className="text-red-600 dark:text-red-400" aria-label="Eliminar excepción">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>¿Eliminar excepción?</AlertDialogTitle>
                        <AlertDialogDescription>Se eliminará la excepción "{exception.name}".</AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={() => handleDeleteException(exception.id || exception._id)} className="bg-red-600 hover:bg-red-700 text-white">Eliminar</AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              ))}
            </CardContent>
          </Card>

          <Dialog open={showExceptionForm} onOpenChange={setShowExceptionForm}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Nueva Excepción</DialogTitle>
                <DialogDescription>Agrega un día libre, vacación o horario especial</DialogDescription>
              </DialogHeader>
              <form onSubmit={handleExceptionSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label>Nombre de la excepción</Label>
                  <Input required value={exceptionForm.name} onChange={(e) => setExceptionForm(prev => ({ ...prev, name: e.target.value }))} placeholder="Ej: Vacaciones de verano" />
                </div>
                <div className="space-y-2">
                  <Label>Tipo de excepción</Label>
                  <Select value={exceptionForm.exceptionType} onValueChange={(val) => setExceptionForm(prev => ({ ...prev, exceptionType: val }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="day_off">Día libre</SelectItem>
                      <SelectItem value="special_hours">Horario especial</SelectItem>
                      <SelectItem value="vacation">Vacaciones</SelectItem>
                      <SelectItem value="holiday">Día festivo</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Fecha de inicio</Label>
                    <Input type="date" required value={exceptionForm.startDate} onChange={(e) => setExceptionForm(prev => ({ ...prev, startDate: e.target.value }))} />
                  </div>
                  <div className="space-y-2">
                    <Label>Fecha de fin</Label>
                    <Input type="date" required value={exceptionForm.endDate} onChange={(e) => setExceptionForm(prev => ({ ...prev, endDate: e.target.value }))} />
                  </div>
                </div>
                {exceptionForm.exceptionType === 'special_hours' && (
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Hora especial de inicio</Label>
                      <TimeInput12h required value={exceptionForm.specialStartTime} onChange={(val) => setExceptionForm(prev => ({ ...prev, specialStartTime: val }))} className="w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 rounded-lg" aria-label="Hora especial de inicio" />
                    </div>
                    <div className="space-y-2">
                      <Label>Hora especial de fin</Label>
                      <TimeInput12h required value={exceptionForm.specialEndTime} onChange={(val) => setExceptionForm(prev => ({ ...prev, specialEndTime: val }))} className="w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 rounded-lg" aria-label="Hora especial de fin" />
                    </div>
                  </div>
                )}
                <div className="space-y-2">
                  <Label>Razón (opcional)</Label>
                  <Textarea value={exceptionForm.reason} onChange={(e) => setExceptionForm(prev => ({ ...prev, reason: e.target.value }))} rows={3} placeholder="Describe la razón de esta excepción..." />
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox id="exc-recurring" checked={exceptionForm.isRecurringAnnually} onCheckedChange={(checked) => setExceptionForm(prev => ({ ...prev, isRecurringAnnually: !!checked }))} />
                  <Label htmlFor="exc-recurring" className="font-normal cursor-pointer">Se repite anualmente (para días festivos)</Label>
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setShowExceptionForm(false)}>Cancelar</Button>
                  <Button type="submit" disabled={loading}>
                    {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Guardar Excepción
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </TabsContent>
      </Tabs>
    </div>
  )
}

export default SchedulesPage
