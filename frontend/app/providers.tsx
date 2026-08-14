'use client'

import { Toaster } from 'sonner'
import { AppProvider } from './lib/store'
import { ThemeProvider } from './components/theme-provider'

export function Providers({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <ThemeProvider>
      <AppProvider>
        {children}
        <Toaster />
      </AppProvider>
    </ThemeProvider>
  )
}