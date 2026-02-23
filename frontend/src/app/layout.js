import './globals.css'
import { Inter } from 'next/font/google'
import { SalonProvider } from '@/utils/SalonContext'
import { SocketProvider } from '@/contexts/SocketContext'
import { Toaster } from '@/components/ui/sonner'

const inter = Inter({ subsets: ['latin'] })

export const metadata = {
  title: 'Sistema de Reservas - Barberías',
  description: 'Sistema completo para gestión de citas y reservas de barberías',
}

export default function RootLayout({ children }) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body className={inter.className}>
        <SocketProvider>
          <SalonProvider>
            {children}
          </SalonProvider>
          <Toaster />
        </SocketProvider>
      </body>
    </html>
  )
} 