'use client'

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'
import {
  type Learner, type SkillProgress,
  getLearnerById, updateLearner as dbUpdateLearner,
  getSkillProgress, upsertDailyXp, updateLeaderboardXp,
} from './db'
import { initAuth, getSession, setSession, clearSession } from './auth'

type AppState = {
  learner: Learner | null
  skillProgress: Record<string, SkillProgress>
  loading: boolean
  refreshLearner: () => Promise<void>
  refreshProgress: () => Promise<void>
  updateLearner: (updates: Partial<Learner>) => Promise<void>
  awardXP: (amount: number) => Promise<void>
  loseHeart: () => Promise<boolean>
  refillHearts: () => Promise<void>
  login: (learnerId: string) => Promise<void>
  logout: () => void
}

const AppContext = createContext<AppState | null>(null)

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [learner, setLearner] = useState<Learner | null>(null)
  const [skillProgress, setSkillProgress] = useState<Record<string, SkillProgress>>({})
  const [loading, setLoading] = useState(true)

  const refreshLearner = useCallback(async () => {
    const session = await getSession()
    if (session) {
      const today = new Date().toISOString().split('T')[0]
      let streakDays = session.streak_days
      if (session.last_activity_date) {
        const last = new Date(session.last_activity_date)
        const now = new Date(today)
        const diffDays = Math.floor((now.getTime() - last.getTime()) / (1000 * 60 * 60 * 24))
        if (diffDays > 1) {
          streakDays = 0
          const updated = await dbUpdateLearner(session.id, { streak_days: 0 })
          if (updated) {
            setLearner(updated)
            return
          }
        }
      }
      setLearner({ ...session, streak_days: streakDays })
    } else {
      setLearner(null)
    }
  }, [])

  const refreshProgress = useCallback(async () => {
    const session = await getSession()
    if (session) {
      setSkillProgress(await getSkillProgress(session.id))
    } else {
      setSkillProgress({})
    }
  }, [])

  const updateLearner = useCallback(async (updates: Partial<Learner>) => {
    if (!learner) return
    const updated = await dbUpdateLearner(learner.id, updates)
    if (updated) setLearner(updated)
  }, [learner])

  const awardXP = useCallback(async (amount: number) => {
    if (!learner) return
    const today = new Date().toISOString().split('T')[0]
    const newTotalXP = learner.total_xp + amount
    const newDailyXP = learner.daily_xp_earned + amount
    const lastActivity = learner.last_activity_date
    let newStreak = learner.streak_days

    if (lastActivity !== today) {
      const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0]
      if (lastActivity === yesterday) {
        newStreak = learner.streak_days + 1
      } else {
        newStreak = 1
      }
    }

    await upsertDailyXp(learner.id, today, newDailyXP)
    await updateLeaderboardXp(learner.id, amount)

    const updated = await dbUpdateLearner(learner.id, {
      total_xp: newTotalXP,
      daily_xp_earned: newDailyXP,
      streak_days: newStreak,
      last_activity_date: today,
    })
    if (updated) setLearner(updated)
  }, [learner])

  const loseHeart = useCallback(async (): Promise<boolean> => {
    if (!learner) return true
    if (learner.hearts <= 0) return false
    const newHearts = learner.hearts - 1
    const updated = await dbUpdateLearner(learner.id, { hearts: newHearts })
    if (updated) setLearner(updated)
    return newHearts > 0
  }, [learner])

  const refillHearts = useCallback(async () => {
    if (!learner) return
    const updated = await dbUpdateLearner(learner.id, {
      hearts: learner.max_hearts,
      gems: learner.gems - 350,
    })
    if (updated) setLearner(updated)
  }, [learner])

  const login = useCallback(async (learnerId: string) => {
    setSession(learnerId)
    const l = await getLearnerById(learnerId)
    if (l) setLearner(l)
    setSkillProgress(await getSkillProgress(learnerId))
  }, [])

  const logout = useCallback(() => {
    clearSession()
    setLearner(null)
    setSkillProgress({})
  }, [])

  useEffect(() => {
    initAuth().then(async () => {
      await refreshLearner()
      await refreshProgress()
      setLoading(false)
    })
  }, [refreshLearner, refreshProgress])

  return (
    <AppContext.Provider value={{
      learner, skillProgress, loading,
      refreshLearner, refreshProgress,
      updateLearner, awardXP, loseHeart, refillHearts,
      login, logout,
    }}>
      {children}
    </AppContext.Provider>
  )
}

export function useApp() {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp must be used within AppProvider')
  return ctx
}
