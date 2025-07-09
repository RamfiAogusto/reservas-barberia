"use client"

export default function Home() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">
          🚀 ReservaBarber
        </h1>
        <p className="text-gray-600 mb-8">
          Sistema funcionando correctamente
        </p>
        <div className="space-y-4">
          <a 
            href="/login" 
            className="block bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Iniciar Sesión
          </a>
          <a 
            href="/register" 
            className="block bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition-colors"
          >
            Registrarse
          </a>
        </div>
      </div>
    </div>
  )
} 