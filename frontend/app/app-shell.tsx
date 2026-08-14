'use client'

import { TopBar } from './components/TopBar'
import { Nav } from './components/Nav'

export function AppShell({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <>
      <TopBar />
      <Nav />

      <main className="pt-14 pb-20 lg:pb-0 lg:pl-64 min-h-svh">
        <div className="max-w-2xl mx-auto px-4 py-6">
          {children}
        </div>
      </main>
    </>
  )
}