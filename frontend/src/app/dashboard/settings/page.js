'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import api from '@/utils/api'

const SettingsPage = () => {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [formData, setFormData] = useState({
    requiresDeposit: false,
    depositAmount: ''
  })

  useEffect(() => {
    handleLoadProfile()
  }, [])

  const handleLoadProfile = async () => {
    try {
      setLoading(true)
      const response = await api.get('/users/profile')
      if (response.success && response.data) {
        setFormData({
          requiresDeposit: response.data.requiresDeposit ?? false,
          depositAmount: response.data.depositAmount ? String(response.data.depositAmount) : ''
        })
      }
    } catch (err) {
      console.error('Error cargando perfil:', err)
      setError('Error al cargar la configuración')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setMessage('')
    setError('')

    if (formData.requiresDeposit && (!formData.depositAmount || parseFloat(formData.depositAmount) <= 0)) {
      setError('Ingresa el monto del depósito cuando está activado')
      return
    }

    try {
      setSaving(true)
      const response = await api.put('/users/profile', {
        requiresDeposit: formData.requiresDeposit,
        depositAmount: formData.requiresDeposit ? parseFloat(formData.depositAmount) || 0 : 0
      })
      if (response.success) {
        setMessage('Configuración guardada correctamente')
      } else {
        setError(response.message || 'Error al guardar')
      }
    } catch (err) {
      console.error('Error guardando:', err)
      setError('Error al guardar la configuración')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-2 border-blue-600 border-t-transparent"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <button
            onClick={() => router.push('/dashboard')}
            className="text-blue-600 hover:text-blue-800 mb-4"
          >
            ← Volver al Dashboard
          </button>
          <h1 className="text-2xl font-bold text-gray-900">Configuración</h1>
          <p className="text-gray-600">Configura las opciones de tu negocio</p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8">
        {message && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg text-green-800">
            {message}
          </div>
        )}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-800">
            {error}
          </div>
        )}

        <div className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Depósito para reservas</h2>
          <p className="text-gray-600 mb-6">
            El depósito es un monto que el cliente paga para confirmar su reserva. El precio completo del servicio se paga cuando el cliente recibe el servicio. Aplica a todas las reservas.
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="requiresDeposit"
                checked={formData.requiresDeposit}
                onChange={(e) => setFormData(prev => ({ ...prev, requiresDeposit: e.target.checked }))}
                className="rounded border-gray-300"
              />
              <label htmlFor="requiresDeposit" className="text-gray-700 font-medium">
                Requerir depósito para confirmar reservas
              </label>
            </div>

            {formData.requiresDeposit && (
              <div>
                <label htmlFor="depositAmount" className="block text-sm font-medium text-gray-700 mb-1">
                  Monto del depósito
                </label>
                <input
                  type="number"
                  id="depositAmount"
                  min="0"
                  step="0.01"
                  value={formData.depositAmount}
                  onChange={(e) => setFormData(prev => ({ ...prev, depositAmount: e.target.value }))}
                  className="w-full max-w-xs border border-gray-300 rounded-lg px-3 py-2"
                  placeholder="Ej: 150"
                />
                <p className="mt-1 text-sm text-gray-500">
                  Monto que el cliente paga para asegurar su cita. El precio del servicio se paga completo al llegar.
                </p>
              </div>
            )}

            <div className="pt-4">
              <button
                type="submit"
                disabled={saving}
                className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {saving ? 'Guardando...' : 'Guardar configuración'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

export default SettingsPage
