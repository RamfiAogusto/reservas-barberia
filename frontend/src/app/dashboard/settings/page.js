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
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-2 border-blue-600 dark:border-blue-400 border-t-transparent"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="bg-white dark:bg-gray-800 shadow-sm border-b dark:border-gray-700">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <button
            onClick={() => router.push('/dashboard')}
            className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 mb-4"
          >
            ← Volver al Dashboard
          </button>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Configuración</h1>
          <p className="text-gray-600 dark:text-gray-300">Configura las opciones de tu negocio</p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8">
        {message && (
          <div className="mb-6 p-4 bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800 rounded-lg text-green-800 dark:text-green-200">
            {message}
          </div>
        )}
        {error && (
          <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg text-red-800 dark:text-red-200">
            {error}
          </div>
        )}

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 border border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Depósito para reservas</h2>
          <p className="text-gray-600 dark:text-gray-300 mb-6">
            El depósito es un monto que el cliente paga para confirmar su reserva. El precio completo del servicio se paga cuando el cliente recibe el servicio. Aplica a todas las reservas.
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="requiresDeposit"
                checked={formData.requiresDeposit}
                onChange={(e) => setFormData(prev => ({ ...prev, requiresDeposit: e.target.checked }))}
                className="rounded border-gray-300 dark:border-gray-600 dark:bg-gray-700"
              />
              <label htmlFor="requiresDeposit" className="text-gray-700 dark:text-gray-300 font-medium">
                Requerir depósito para confirmar reservas
              </label>
            </div>

            {formData.requiresDeposit && (
              <div>
                <label htmlFor="depositAmount" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Monto del depósito
                </label>
                <input
                  type="number"
                  id="depositAmount"
                  min="0"
                  step="0.01"
                  value={formData.depositAmount}
                  onChange={(e) => setFormData(prev => ({ ...prev, depositAmount: e.target.value }))}
                  className="w-full max-w-xs border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-lg px-3 py-2"
                  placeholder="Ej: 150"
                />
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  Monto que el cliente paga para asegurar su cita. El precio del servicio se paga completo al llegar.
                </p>
              </div>
            )}

            <div className="pt-4">
              <button
                type="submit"
                disabled={saving}
                className="bg-blue-600 dark:bg-blue-700 text-white px-6 py-2 rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 disabled:opacity-50"
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
