'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, User, Trophy, Settings } from 'lucide-react'
import { cn } from '../lib/utils'

const navItems = [
  { href: '/learningpath', icon: Home, label: 'Learn' },
  { href: '/leaderboard', icon: Trophy, label: 'Leaderboard' },
  { href: '/profile', icon: Settings, label: 'Profile' },
]

export function Nav() {
  const pathname = usePathname()

  return (
    <>
      <aside className="hidden lg:flex fixed left-0 top-14 bottom-0 w-64 flex-col border-r border-border bg-card z-40">
        <nav className="flex flex-col gap-1 p-3">
          {navItems.map(({ href, icon: Icon, label }) => {
            const isActive = pathname === href
            return (
              <Link
                key={href + label}
                href={href}
                className={cn(
                  'flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-base transition-colors',
                  isActive
                    ? 'bg-accent text-accent-foreground border-2 border-accent'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                )}
              >
                <Icon className="size-7" />
                {label}
              </Link>
            )
          })}
        </nav>
      </aside>

      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-card border-t border-border">
        <div className="flex justify-around items-center h-16">
          {navItems.map(({ href, icon: Icon, label }) => {
            const isActive = pathname === href || (href === '/learningpath' && pathname === '/')
            return (
              <Link
                key={href + label}
                href={href}
                className={cn(
                  'flex flex-col items-center gap-1 px-3 py-2 rounded-lg transition-colors',
                  isActive ? 'text-primary' : 'text-muted-foreground'
                )}
              >
                <Icon className="size-6" />
                <span className="text-xs font-bold">{label}</span>
              </Link>
            )
          })}
        </div>
      </nav>
    </>
  )
}
