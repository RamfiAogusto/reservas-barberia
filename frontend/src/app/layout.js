import './globals.css'
import { Inter } from 'next/font/google'
import { SalonProvider } from '@/utils/SalonContext'
import CacheDebug from '@/components/CacheDebug'

const inter = Inter({ subsets: ['latin'] })

export const metadata = {
  title: 'Sistema de Reservas - Barberías',
  description: 'Sistema completo para gestión de citas y reservas de barberías',
}

export default function RootLayout({ children }) {
  return (
    <html lang="es">
      <body className={inter.className}>
        <SalonProvider>
          {children}
          <CacheDebug />
        </SalonProvider>
      </body>
    </html>
  )
} 