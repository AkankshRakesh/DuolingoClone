import { initDb, getLearnerById, type Learner } from './db'

const SESSION_KEY = 'duolingo-session-learner-id'

export async function initAuth(): Promise<void> {
  await initDb()
}

export async function getSession(): Promise<Learner | null> {
  if (typeof window === 'undefined') return null
  const id = localStorage.getItem(SESSION_KEY)
  if (!id) return null
  try {
    return await getLearnerById(id)
  } catch {
    return null
  }
}

export function setSession(learnerId: string): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(SESSION_KEY, learnerId)
}

export function clearSession(): void {
  if (typeof window === 'undefined') return
  localStorage.removeItem(SESSION_KEY)
}
