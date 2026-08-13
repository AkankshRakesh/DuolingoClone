'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { type Unit, type Skill, type Lesson, getUnits, getLessonsBySkill, getCompletedLessonIds } from '../../lib/db'
import { useApp } from '../../lib/store'
import { DuoMascot } from '../../components/DuoMascot'
import { Lock, Crown, Check } from 'lucide-react'
import { cn } from '../../lib/utils'
import { toast } from 'sonner'

export default function LearningPathPage() {
  const router = useRouter()
  const { learner, skillProgress, loading, refillHearts } = useApp()
  const [units, setUnits] = useState<Unit[]>([])
  const [lessonsBySkill, setLessonsBySkill] = useState<Record<string, Lesson[]>>({})
  const [selectedSkill, setSelectedSkill] = useState<Skill | null>(null)
  const [showPopup, setShowPopup] = useState(false)

  useEffect(() => {
    if (loading) return

    async function loadData() {
      const unitsData = await getUnits()
      const lessonsMap = await getLessonsBySkill()

      if (learner) {
        const completed = await getCompletedLessonIds(learner.id)

        const updatedMap: Record<string, Lesson[]> = {}
        Object.entries(lessonsMap).forEach(([skillId, lessons]) => {
          updatedMap[skillId] = lessons.map((l) => ({ ...l, completed: completed.has(l.id) }))
        })

        setLessonsBySkill(updatedMap)
      } else {
        setLessonsBySkill(lessonsMap)
      }

      setUnits(unitsData)
    }

    void loadData()
  }, [learner, loading])

  const handleSkillClick = (skill: Skill) => {
    const progress = skillProgress[skill.id]
    if (!progress?.is_unlocked) {
      toast.error('Complete previous skills to unlock this one!', { description: skill.title })
      return
    }
    setSelectedSkill(skill)
    setShowPopup(true)
  }

  const handleStartLesson = (lessonId: string) => {
    router.push(`/lesson/${lessonId}`)
  }

  const handleRefillHearts = async () => {
    if (!learner) return
    if (learner.gems >= 350) {
      await refillHearts()
      toast.success('Hearts refilled!', { description: 'You spent 350 gems' })
    } else {
      toast.error('Not enough gems!', { description: 'You need 350 gems to refill hearts' })
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <DuoMascot className="w-20 h-24 animate-float" />
      </div>
    )
  }

  return (
    <div className="space-y-8 pb-8">
      {learner && learner.hearts === 0 && (
        <div className="bg-duo-red/10 border-2 border-duo-red rounded-2xl p-4 flex items-center gap-4">
          <DuoMascot className="w-16 h-20 shrink-0" expression="sad" />
          <div className="flex-1">
            <h3 className="font-black text-duo-red">You&apos;re out of hearts!</h3>
            <p className="text-sm text-muted-foreground">Refill with gems or practice to earn more.</p>
          </div>
          <button className="duo-btn duo-btn-primary py-2 px-4 text-xs" onClick={handleRefillHearts}>
            Refill (350 Gems)
          </button>
        </div>
      )}

      {units.map((unit, unitIdx) => (
        <div key={unit.id}>
          <div className="rounded-2xl p-4 mb-6 text-white" style={{ backgroundColor: unit.color }}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold uppercase opacity-80">Section {unitIdx + 1}</p>
                <h2 className="text-xl font-black">{unit.title}</h2>
                <p className="text-sm opacity-90">{unit.description}</p>
              </div>
              <button
                className="bg-white/20 hover:bg-white/30 rounded-xl px-4 py-2 font-bold text-sm transition-colors"
                onClick={() => toast('Guidebook coming soon!', { description: 'Stay tuned!' })}
              >
                Guidebook
              </button>
            </div>
          </div>

          <div className="relative flex flex-col items-center gap-6 py-4">
            {unit.skills?.map((skill, skillIdx) => {
              const progress = skillProgress[skill.id]
              const isUnlocked = Boolean(progress?.is_unlocked)
              const isCompleted = Boolean(progress?.is_completed)
              const crowns = progress?.crowns_earned ?? 0
              const lessons = lessonsBySkill[skill.id] ?? []
              const completedLessonCount = lessons.filter((l) => l.completed).length
              const offset = Math.sin(skillIdx * 0.8) * 80

              return (
                <div key={skill.id} className="skill-node flex flex-col items-center" style={{ transform: `translateX(${offset}px)` }}>
                  <button
                    onClick={() => handleSkillClick(skill)}
                    className={cn(
                      'relative size-20 cursor-pointer rounded-full flex items-center justify-center text-4xl transition-transform',
                      isCompleted
                        ? 'bg-duo-green shadow-[0_6px_0_var(--duo-green-dark)]'
                        : isUnlocked
                        ? 'bg-duo-green shadow-[0_6px_0_var(--duo-green-dark)] animate-pulse'
                        : 'bg-muted shadow-[0_6px_0_var(--border)]'
                    )}
                    disabled={!isUnlocked}
                  >
                    {isUnlocked ? <span>{skill.icon}</span> : <Lock className="size-8 text-muted-foreground" />}
                    {crowns > 0 && (
                      <div className="absolute -top-2 -right-2 bg-duo-yellow rounded-full size-7 flex items-center justify-center shadow-md">
                        <Crown className="size-4 text-white fill-white" />
                      </div>
                    )}
                  </button>
                    
                  <div className="mt-2 text-center">
                    <p className={cn('font-bold text-sm', isUnlocked ? 'text-foreground' : 'text-muted-foreground')}>
                      {skill.title}
                    </p>
                    {isUnlocked && !isCompleted && (
                      <p className="text-xs text-muted-foreground">
                        {completedLessonCount}/{skill.total_lessons} lessons
                      </p>
                    )}
                    {isCompleted && (
                      <p className="text-xs text-duo-green font-bold flex items-center justify-center gap-1">
                        <Check className="size-3" /> Complete
                      </p>
                    )}
                  </div>

                  {isUnlocked && !isCompleted && completedLessonCount > 0 && (
                    <div className="absolute -top-1 -left-1 size-22 pointer-events-none">
                      <svg className="size-22 -rotate-90" viewBox="0 0 88 88">
                        <circle cx="44" cy="44" r="40" fill="none" stroke="var(--muted)" strokeWidth="4" />
                        <circle
                          cx="44"
                          cy="44"
                          r="40"
                          fill="none"
                          stroke="var(--duo-yellow)"
                          strokeWidth="4"
                          strokeDasharray={`${(completedLessonCount / skill.total_lessons) * 251} 251`}
                          strokeLinecap="round"
                        />
                      </svg>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      ))}

      {showPopup && selectedSkill && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-4" onClick={() => setShowPopup(false)}>
          <div className="bg-card rounded-t-3xl sm:rounded-3xl p-6 max-w-sm w-full shadow-xl animate-bounce-in" onClick={(e) => e.stopPropagation()}>
            <div className="text-center">
              <div className="size-20 rounded-full bg-duo-green mx-auto flex items-center justify-center text-4xl shadow-[0_6px_0_var(--duo-green-dark)]">
                {selectedSkill.icon}
              </div>
              <h3 className="text-2xl font-black mt-4">{selectedSkill.title}</h3>
              <p className="text-muted-foreground text-sm mt-1">{selectedSkill.description}</p>
            </div>

            <div className="mt-6 space-y-2">
              {(lessonsBySkill[selectedSkill.id] ?? []).map((lesson, i) => (
                <button
                  key={lesson.id}
                  onClick={() => handleStartLesson(lesson.id)}
                  className={cn(
                    'w-full flex items-center gap-3 p-3 rounded-xl border-2 transition-colors text-left',
                    lesson.completed ? 'border-duo-green bg-duo-green/10' : 'border-border hover:border-duo-blue'
                  )}
                >
                  <div className={cn('size-10 rounded-full flex items-center justify-center font-bold shrink-0', lesson.completed ? 'bg-duo-green text-white' : 'bg-muted text-muted-foreground')}>
                    {lesson.completed ? <Check className="size-5" /> : i + 1}
                  </div>
                  <div className="flex-1">
                    <p className="font-bold">{lesson.title}</p>
                    <p className="text-xs text-muted-foreground">+{lesson.xp_reward} XP</p>
                  </div>
                </button>
              ))}
            </div>

            <button className="mt-4 w-full text-muted-foreground font-bold text-sm hover:text-foreground" onClick={() => setShowPopup(false)}>
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
