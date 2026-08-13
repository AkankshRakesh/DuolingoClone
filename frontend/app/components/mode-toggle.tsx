import { Moon, Sun } from 'lucide-react'

type ThemeMode = 'light' | 'dark' | 'system'

function resolveTheme(): ThemeMode {
  const stored = typeof window !== 'undefined' ? window.localStorage.getItem('theme') : null
  if (stored === 'light' || stored === 'dark' || stored === 'system') return stored
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

export function ModeToggle() {
  const toggleTheme = () => {
    const root = document.documentElement
    const nextMode = resolveTheme() === 'dark' ? 'light' : 'dark'

    root.classList.remove('light', 'dark')
    root.classList.add(nextMode)
    window.localStorage.setItem('theme', nextMode)
  }

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-input bg-background text-foreground shadow-sm transition-colors hover:bg-accent hover:text-accent-foreground"
      aria-label="Toggle theme"
    >
      <Sun className="h-[1.2rem] w-[1.2rem] scale-100 rotate-0 transition-all dark:scale-0 dark:-rotate-90" />
      <Moon className="absolute h-[1.2rem] w-[1.2rem] scale-0 rotate-90 transition-all dark:scale-100 dark:rotate-0" />
      <span className="sr-only">Toggle theme</span>
    </button>
  )
}
