'use client'

import { useSalonContext } from '@/utils/SalonContext'

const SalonDebug = ({ username }) => {
  const { salonData, loadingStates, errorStates, getSalonData } = useSalonContext()
  
  const salon = salonData.get(username)
  const loading = loadingStates.get(username)
  const error = errorStates.get(username)

  return (
    <div className="fixed top-4 left-4 bg-black bg-opacity-90 text-white p-4 rounded-lg text-xs z-50 max-w-xs">
      <h3 className="font-bold mb-2">🔍 Salon Context Debug</h3>
      <div className="space-y-1">
        <div>Username: {username}</div>
        <div>Loading: {loading ? 'Yes' : 'No'}</div>
        <div>Has Data: {salon ? 'Yes' : 'No'}</div>
        <div>Error: {error || 'None'}</div>
        <div>Data Keys: {Array.from(salonData.keys()).join(', ')}</div>
      </div>
      <button
        onClick={() => getSalonData(username)}
        className="bg-blue-600 px-2 py-1 rounded text-xs hover:bg-blue-700 mt-2"
      >
        Load Data
      </button>
    </div>
  )
}

export default SalonDebug 