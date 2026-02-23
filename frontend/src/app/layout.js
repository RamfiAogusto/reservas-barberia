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

// Inline script to set dark class on <html> BEFORE React hydrates (prevents flash)
const themeScript = `
  try {
    var s = localStorage.getItem('dashboard-theme');
    var d = s === 'dark' || (!s && window.matchMedia('(prefers-color-scheme: dark)').matches);
    if (d) document.documentElement.classList.add('dark');
  } catch(e) {}
`

export default function RootLayout({ children }) {
  return (
    <html lang="es" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
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