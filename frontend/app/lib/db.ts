export type Language = {
  id: string
  code: string
  name: string
  flag_emoji: string
}

export type Unit = {
  id: string
  language_id: string
  title: string
  description: string
  color: string
  sort_order: number
  skills?: Skill[]
}

export type Skill = {
  id: string
  unit_id: string
  title: string
  description: string
  icon: string
  sort_order: number
  required_crowns: number
  total_lessons: number
}

export type Lesson = {
  id: string
  skill_id: string
  title: string
  sort_order: number
  xp_reward: number
  completed?: boolean
}

export type Exercise = {
  id: string
  lesson_id: string
  type: 'multiple_choice' | 'translate' | 'match_pairs' | 'fill_blank' | 'type_answer'
  prompt: string
  prompt_translation: string | null
  options: string[] | { spanish: string; english: string }[] | null
  correct_answer: string
  explanation: string | null
  sort_order: number
}

export type SkillProgress = {
  id: string
  user_id: string
  skill_id: string
  crowns_earned: number
  is_unlocked: number
  is_completed: number
  lessons_completed: number
}

export type Learner = {
  id: string
  username: string
  display_name: string
  avatar_url: string | null
  total_xp: number
  streak_days: number
  hearts: number
  max_hearts: number
  gems: number
  daily_xp_goal: number
  daily_xp_earned: number
  last_activity_date: string | null
}

export type LeaderboardEntry = {
  id: string
  user_id: string | null
  display_name: string
  username: string
  avatar_color: string
  weekly_xp: number
  is_current_user: number
  is_bot: number
}

export type User = {
  id: string
  username: string
  email: string
  password_hash: string
  display_name: string
  created_at: string
}

type AuthResult =
  | { ok: true; learner: Learner }
  | { ok: false; error: string }

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:8001'

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...init?.headers,
    },
  })

  if (!response.ok) {
    throw new Error(`API request failed: ${response.status} ${response.statusText}`)
  }

  return response.json() as Promise<T>
}

export async function initDb(): Promise<void> {
  await request<{ ok: boolean }>('/health')
}

export async function signup(
  username: string,
  email: string,
  password: string,
  displayName: string
): Promise<AuthResult> {
  return request<AuthResult>('/auth/signup', {
    method: 'POST',
    body: JSON.stringify({
      username,
      email,
      password,
      display_name: displayName,
    }),
  })
}

export async function login(username: string, password: string): Promise<AuthResult> {
  return request<AuthResult>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ username, password }),
  })
}

export async function getLearnerById(learnerId: string): Promise<Learner | null> {
  return request<Learner | null>(`/learners/${learnerId}`)
}

export async function updateLearner(
  learnerId: string,
  updates: Partial<Learner>
): Promise<Learner | null> {
  return request<Learner | null>(`/learners/${learnerId}`, {
    method: 'PATCH',
    body: JSON.stringify(updates),
  })
}

export async function getUnits(): Promise<Unit[]> {
  return request<Unit[]>('/units')
}

export async function getLessonsBySkill(): Promise<Record<string, Lesson[]>> {
  return request<Record<string, Lesson[]>>('/lessons/by-skill')
}

export async function getExercises(lessonId: string): Promise<Exercise[]> {
  return request<Exercise[]>(`/lessons/${lessonId}/exercises`)
}

export async function getSkillProgress(learnerId: string): Promise<Record<string, SkillProgress>> {
  return request<Record<string, SkillProgress>>(`/learners/${learnerId}/progress`)
}

export async function getCompletedLessonIds(learnerId: string): Promise<Set<string>> {
  const lessonIds = await request<string[]>(`/learners/${learnerId}/completed-lessons`)
  return new Set(lessonIds)
}

export async function completeLesson(
  learnerId: string,
  lessonId: string,
  xpEarned: number,
  heartsRemaining: number
): Promise<void> {
  await request<{ ok: boolean }>(`/learners/${learnerId}/lesson-completions`, {
    method: 'POST',
    body: JSON.stringify({
      lesson_id: lessonId,
      xp_earned: xpEarned,
      hearts_remaining: heartsRemaining,
    }),
  })
}

export async function updateSkillProgress(
  learnerId: string,
  skillId: string,
  lessonsCompleted: number,
  isCompleted: boolean,
  crownsEarned: number
): Promise<void> {
  await request<{ ok: boolean }>(`/learners/${learnerId}/skill-progress/${skillId}`, {
    method: 'PATCH',
    body: JSON.stringify({
      lessons_completed: lessonsCompleted,
      is_completed: isCompleted,
      crowns_earned: crownsEarned,
    }),
  })
}

export async function getDailyXpLog(
  learnerId: string
): Promise<{ log_date: string; xp_earned: number }[]> {
  return request<{ log_date: string; xp_earned: number }[]>(`/learners/${learnerId}/daily-xp`)
}

export async function upsertDailyXp(
  learnerId: string,
  date: string,
  xpEarned: number
): Promise<void> {
  await request<{ ok: boolean }>(`/learners/${learnerId}/daily-xp`, {
    method: 'POST',
    body: JSON.stringify({
      date,
      xp_earned: xpEarned,
    }),
  })
}

export async function getLeaderboard(learnerId: string): Promise<LeaderboardEntry[]> {
  return request<LeaderboardEntry[]>(`/learners/${learnerId}/leaderboard`)
}

export async function updateLeaderboardXp(learnerId: string, amount: number): Promise<void> {
  await request<{ ok: boolean }>(`/learners/${learnerId}/leaderboard-xp`, {
    method: 'POST',
    body: JSON.stringify({ amount }),
  })
}

export async function getLessonSkillId(lessonId: string): Promise<string | null> {
  const response = await request<{ skill_id: string | null }>(`/lessons/${lessonId}/skill-id`)
  return response.skill_id
}

export async function getSkillById(skillId: string): Promise<Skill | null> {
  return request<Skill | null>(`/skills/${skillId}`)
}
