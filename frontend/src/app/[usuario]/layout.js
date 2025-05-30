export const metadata = {
  title: 'Perfil de Salón - ReservasBarbería',
  description: 'Descubre servicios y reserva tu cita en línea',
}

const SalonLayout = ({ children }) => {
  return (
    <div className="min-h-screen bg-gray-50">
      {children}
    </div>
  )
}

export default SalonLayout 