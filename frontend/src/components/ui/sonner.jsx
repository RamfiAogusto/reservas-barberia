'use client'

import { Toaster as SonnerToaster } from 'sonner'

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
          toast: 'group border shadow-lg rounded-xl',
          title: 'text-sm font-semibold',
          description: 'text-sm opacity-90',
          actionButton: 'bg-primary-600 hover:bg-primary-700 text-white rounded-lg',
          cancelButton: 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300 rounded-lg',
          closeButton: 'left-auto right-2',
          success: 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200',
          error: 'bg-red-50 dark:bg-red-950/40 border-red-200 dark:border-red-800 text-red-800 dark:text-red-200',
          warning: 'bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-200',
          info: 'bg-blue-50 dark:bg-blue-950/40 border-blue-200 dark:border-blue-800 text-blue-800 dark:text-blue-200',
        },
      }}
      {...props}
    />
  )
}
