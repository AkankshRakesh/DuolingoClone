'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useApp } from '../lib/store'

export default function AuthRoute({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const { learner, loading } = useApp()

  useEffect(() => {
    if (!loading && learner) {
      router.replace('/learningpath')
    }
  }, [learner, loading, router])

  if (loading || learner) {
    return (
      <div className="min-h-svh flex items-center justify-center bg-background">
        <p className="font-bold text-muted-foreground">
          Loading...
        </p>
      </div>
    )
  }

  return <>{children}</>
}