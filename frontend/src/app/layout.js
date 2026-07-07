import './globals.css'
import { Inter } from 'next/font/google'
import { SalonProvider } from '@/utils/SalonContext'
import { SocketProvider } from '@/contexts/SocketContext'
import { ThemeProvider } from '@/contexts/ThemeContext'
import { Toaster } from '@/components/ui/sonner'

const inter = Inter({ subsets: ['latin'] })

export const metadata = {
  title: 'Sistema de Reservas - Barberías',
  description: 'Sistema completo para gestión de citas y reservas de barberías',
}

// Aplica la clase `dark` antes de la hidratación para evitar el flash
// de tema claro (FOUC). Lee localStorage y cae a prefers-color-scheme.
const themeInitScript = `
(function () {
  try {
    var stored = localStorage.getItem('dashboard-theme');
    var prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    if (stored === 'dark' || (!stored && prefersDark)) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  } catch (e) {}
})();
`

export default function RootLayout({ children }) {
  return (
    <html lang="es" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body className={inter.className}>
        <ThemeProvider>
          <SocketProvider>
            <SalonProvider>
              {children}
            </SalonProvider>
            <Toaster />
          </SocketProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
