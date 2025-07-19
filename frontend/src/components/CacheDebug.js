'use client'

import { useState, useEffect } from 'react'
import { getCacheStats, clearCache } from '@/utils/cache'

const CacheDebug = () => {
  const [stats, setStats] = useState(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    // Solo mostrar en desarrollo
    if (process.env.NODE_ENV === 'development') {
      setVisible(true)
    }
  }, [])

  const updateStats = () => {
    setStats(getCacheStats())
  }

  const handleClearCache = () => {
    clearCache()
    updateStats()
  }

  useEffect(() => {
    if (visible) {
      updateStats()
      const interval = setInterval(updateStats, 5000) // Actualizar cada 5 segundos
      return () => clearInterval(interval)
    }
  }, [visible])

  if (!visible) return null

  return (
    <div className="fixed bottom-4 right-4 bg-black bg-opacity-90 text-white p-4 rounded-lg text-xs z-50 max-w-xs">
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-bold">📦 Cache Stats</h3>
        <button
          onClick={() => setVisible(false)}
          className="text-gray-400 hover:text-white"
        >
          ✕
        </button>
      </div>
      
      {stats && (
        <div className="space-y-1">
          <div>Size: {stats.size} entries</div>
          <div className="text-gray-400 text-xs">
            {stats.keys.slice(0, 3).map((key, i) => (
              <div key={i} className="truncate">
                {key}
              </div>
            ))}
            {stats.keys.length > 3 && (
              <div className="text-gray-500">... and {stats.keys.length - 3} more</div>
            )}
          </div>
        </div>
      )}
      
      <div className="flex gap-2 mt-2">
        <button
          onClick={updateStats}
          className="bg-blue-600 px-2 py-1 rounded text-xs hover:bg-blue-700"
        >
          Refresh
        </button>
        <button
          onClick={handleClearCache}
          className="bg-red-600 px-2 py-1 rounded text-xs hover:bg-red-700"
        >
          Clear
        </button>
      </div>
    </div>
  )
}

export default CacheDebug 