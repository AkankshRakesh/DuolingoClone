'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useApp } from '../../lib/store'
import { signup, login } from '../../lib/db'
import { initDb } from '../../lib/db'
import { DuoMascot } from '../../components/DuoMascot'
import { toast } from 'sonner'
import { cn } from '../../lib/utils'
import AuthRoute from '../../components/AuthRoute'

export default function AuthPage() {
  const router = useRouter()
  const { login: setSession, loading: appLoading } = useApp()
  const [mode, setMode] = useState<'login' | 'signup'>('login')
  const [loading, setLoading] = useState(false)

  const [email, setEmail] = useState('')
  const [username, setUsername] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [password, setPassword] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (appLoading) return

    setLoading(true)

    try {
      await initDb()

      if (mode === 'signup') {
        if (!username.trim() || !email.trim() || !password.trim() || !displayName.trim()) {
          toast.error('Please fill in all fields')
          return
        }
        const result = await signup(username.trim(), email.trim(), password, displayName.trim())
        if (result.ok) {
          await setSession(result.learner.id)
          toast.success('Welcome to Duolingo!', { description: 'Your account is ready' })
          router.push('/learningpath')
        } else {
          toast.error(result.error)
        }
      } else {
        if (!username.trim() || !password.trim()) {
          toast.error('Please enter your username and password')
          return
        }
        const result = await login(username.trim(), password)
        if (result.ok) {
          await setSession(result.learner.id)
          toast.success('Welcome back!')
          router.push('/learningpath')
        } else {
          toast.error(result.error)
        }
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthRoute>
    <div className="min-h-svh flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <DuoMascot className="w-24 h-28 mx-auto animate-float" expression="happy" />
          <h1 className="text-3xl font-black text-primary mt-4">duolingo</h1>
        </div>

        <div className="flex gap-2 mb-6 p-1 bg-muted rounded-xl">
          <button
            className={cn(
              'flex-1 py-2.5 rounded-lg font-bold text-sm transition-all',
              mode === 'login' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground'
            )}
            onClick={() => setMode('login')}
          >
            Log In
          </button>
          <button
            className={cn(
              'flex-1 py-2.5 rounded-lg font-bold text-sm transition-all',
              mode === 'signup' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground'
            )}
            onClick={() => setMode('signup')}
          >
            Sign Up
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === 'signup' && (
            <div>
              <label className="block text-xs font-bold text-muted-foreground uppercase mb-1.5">Display Name</label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border-2 border-border bg-background text-base font-semibold outline-none transition-colors focus:border-duo-blue"
                placeholder="Your name"
                autoComplete="off"
              />
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-muted-foreground uppercase mb-1.5">Username</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border-2 border-border bg-background text-base font-semibold outline-none transition-colors focus:border-duo-blue"
              placeholder="username"
              autoComplete="off"
            />
          </div>

          {mode === 'signup' && (
            <div>
              <label className="block text-xs font-bold text-muted-foreground uppercase mb-1.5">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border-2 border-border bg-background text-base font-semibold outline-none transition-colors focus:border-duo-blue"
                placeholder="you@example.com"
                autoComplete="off"
              />
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-muted-foreground uppercase mb-1.5">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border-2 border-border bg-background text-base font-semibold outline-none transition-colors focus:border-duo-blue"
              placeholder="••••••••"
              autoComplete="off"
            />
          </div>

          <button
            type="submit"
            disabled={loading || appLoading}
            className="duo-btn duo-btn-primary w-full py-4 mt-2"
          >
            {mode === 'login' ? 'Log In' : 'Create Account'}
          </button>
        </form>

        <p className="text-center text-xs text-muted-foreground mt-6">
          {mode === 'login' ? "Don't have an account? " : 'Already have an account? '}
          <button
            className="font-bold text-duo-blue hover:underline"
            onClick={() => setMode(mode === 'login' ? 'signup' : 'login')}
          >
            {mode === 'login' ? 'Sign up' : 'Log in'}
          </button>
        </p>
      </div>
    </div>
    </AuthRoute>
  )
}
