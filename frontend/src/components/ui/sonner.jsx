'use client'

import { Toaster as SonnerToaster } from 'sonner'

/**
 * Sonner Toaster wrapper (shadcn/ui style)
 * Posicionado arriba a la derecha para notificaciones de tiempo real.
 */
export function Toaster({ ...props }) {
  return (
    <SonnerToaster
      position="top-right"
      expand={false}
      richColors
      closeButton
      duration={5000}
      toastOptions={{
        style: {
          fontFamily: 'Inter, sans-serif',
        },
        classNames: {
          toast: 'group border shadow-lg',
          title: 'text-sm font-semibold',
          description: 'text-sm opacity-90',
          actionButton: 'bg-blue-600 text-white',
          cancelButton: 'bg-gray-100 text-gray-800',
          closeButton: 'left-auto right-2',
        },
      }}
      {...props}
    />
  )
}
