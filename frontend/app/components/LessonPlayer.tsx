'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { type Exercise, getExercises, getLessonSkillId, getSkillById, getSkillProgress, completeLesson, updateSkillProgress, getLessonsBySkill, getCompletedLessonIds } from '../lib/db'
import { useApp } from '../lib/store'
import { MultipleChoice } from '../components/exercises/MultipleChoice'
import { Translate } from '../components/exercises/Translate'
import { MatchPairs } from '../components/exercises/MatchPairs'
import { FillBlank } from '../components/exercises/FillBlank'
import { TypeAnswer } from '../components/exercises/TypeAnswer'
import { DuoMascot } from '../components/DuoMascot'
import { Confetti } from '../components/Confetti'
import { Heart, X, Check } from 'lucide-react'
import { cn } from '../lib/utils'

export function LessonPlayer() {
  const params = useParams<{ lessonId: string }>()
  const lessonId = params?.lessonId
  const router = useRouter()
  const { learner, awardXP, loseHeart, refreshProgress, refillHearts } = useApp()

  const [exercises, setExercises] = useState<Exercise[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [answer, setAnswer] = useState<string | null>(null)
  const [result, setResult] = useState<'none' | 'correct' | 'incorrect'>('none')
  const [loading, setLoading] = useState(true)
  const [lessonComplete, setLessonComplete] = useState(false)
  const [outOfHearts, setOutOfHearts] = useState(false)
  const [xpEarned, setXpEarned] = useState(0)
  const [correctCount, setCorrectCount] = useState(0)
  const [wrongCount, setWrongCount] = useState(0)

  useEffect(() => {
    if (!lessonId) {
      setLoading(false)
      return
    }

    let cancelled = false

    const loadExercises = async () => {
      try {
        const data = await getExercises(lessonId)
        if (!cancelled && data.length > 0) {
          setExercises(data)
        }
      } catch (error) {
        console.error('Failed to load lesson exercises:', error)
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    loadExercises()

    return () => {
      cancelled = true
    }
  }, [lessonId])

  const currentExercise = exercises[currentIndex]
  const progress = exercises.length > 0 ? ((currentIndex + (result !== 'none' ? 1 : 0)) / exercises.length) * 100 : 0

  const handleCheck = useCallback(() => {
    if (!answer || !currentExercise) return

    let isCorrect = false
    if (currentExercise.type === 'match_pairs') {
      isCorrect = answer === currentExercise.correct_answer
    } else if (currentExercise.type === 'type_answer') {
      isCorrect = answer.trim().toLowerCase() === currentExercise.correct_answer.trim().toLowerCase()
    } else {
      isCorrect = answer.trim() === currentExercise.correct_answer.trim()
    }

    if (isCorrect) {
      setResult('correct')
      setCorrectCount((c) => c + 1)
    } else {
      setResult('incorrect')
      setWrongCount((w) => w + 1)
      const hasHearts = loseHeart()
      if (!hasHearts) {
        setOutOfHearts(true)
      }
    }
  }, [answer, currentExercise, loseHeart])

  const handleContinue = useCallback(async () => {
    if (currentIndex + 1 < exercises.length) {
      setCurrentIndex((i) => i + 1)
      setAnswer(null)
      setResult('none')
    } else {
      const baseXp = 10
      const bonusXp = wrongCount === 0 ? 5 : 0
      const totalXp = baseXp + bonusXp
      setXpEarned(totalXp)
      setLessonComplete(true)

      if (lessonId && learner) {
        awardXP(totalXp)
        await completeLesson(learner.id, lessonId, totalXp, learner.hearts)

        const skillId = await getLessonSkillId(lessonId)
        if (skillId) {
          const skill = await getSkillById(skillId)
          const progMap = await getSkillProgress(learner.id)
          const prog = progMap[skillId]
          if (prog && skill) {
            const lessonsMap = await getLessonsBySkill()
            const lessons = lessonsMap[skillId] ?? []
            // Count completed lessons for this skill
            const completedSet = await getCompletedLessonIds(learner.id)
            const completedCount = lessons.filter((l) => completedSet.has(l.id)).length
            const isComplete = completedCount >= skill.total_lessons
            await updateSkillProgress(learner.id, skillId, completedCount, isComplete, isComplete ? prog.crowns_earned + 1 : prog.crowns_earned)
            await refreshProgress()
          }
        }
      }
    }
  }, [currentIndex, exercises.length, awardXP, lessonId, learner, refreshProgress, wrongCount, router])

  if (loading) {
    return (
      <div className="min-h-svh flex items-center justify-center bg-background">
        <div className="text-center">
          <img src="/loading.gif" alt="Duo Mascot Loading" className="mx-auto w-36 " />
          <p className="mt-4 font-bold text-muted-foreground">Loading lesson...</p>
        </div>
      </div>
    )
  }

  if (outOfHearts) {
    return (
      <div className="min-h-svh flex items-center justify-center bg-background p-4">
        <div className="text-center max-w-sm">
          <div className="relative inline-block">
            <Heart className="w-24 h-24 text-duo-red fill-duo-red mx-auto" />
            <X className="w-12 h-12 text-white absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" strokeWidth={4} />
          </div>
          <h1 className="text-3xl font-black mt-6 text-foreground">You&rsquo;re out of hearts!</h1>
          <p className="text-muted-foreground mt-2">You ran out of hearts. Refill them to keep learning.</p>
          <div className="flex flex-col gap-3 mt-8">
            <button
              className="duo-btn py-3 px-8 bg-duo-blue text-white shadow-[0_4px_0_oklch(0.45_0.17_240)]"
              onClick={() => {
                refillHearts()
                setOutOfHearts(false)
                router.push('/')
              }}
            >
              Refill Hearts (350 Gems)
            </button>
            <button
              className="duo-btn duo-btn-primary py-3 px-8"
              onClick={() => router.push('/')}
            >
              Back to Home
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (lessonComplete) {
    return (
      <div className="min-h-svh flex items-center justify-center bg-background p-4">
        <Confetti />
        <div className="text-center max-w-sm">
          <img src="/yay.gif" alt="Duo Mascot Ringing Bell" className="mx-auto w-36 h-36" />
          <h1 className="text-4xl font-black mt-4 text-duo-yellow">Lesson Complete!</h1>
          <div className="grid grid-cols-3 gap-4 mt-8">
            <div className="bg-card border-2 border-border rounded-2xl p-4">
              <p className="text-xs font-bold text-muted-foreground uppercase">XP Earned</p>
              <p className="text-3xl font-black text-duo-yellow mt-1">+{xpEarned}</p>
            </div>
            <div className="bg-card border-2 border-border rounded-2xl p-4">
              <p className="text-xs font-bold text-muted-foreground uppercase">Correct</p>
              <p className="text-3xl font-black text-duo-green mt-1">{correctCount}</p>
            </div>
            <div className="bg-card border-2 border-border rounded-2xl p-4">
              <p className="text-xs font-bold text-muted-foreground uppercase">Mistakes</p>
              <p className="text-3xl font-black text-duo-red mt-1">{wrongCount}</p>
            </div>
          </div>
          <button
            className="duo-btn duo-btn-primary py-3 px-12 mt-8"
            onClick={() => router.push('/')}
          >
            Continue
          </button>
        </div>
      </div>
    )
  }

  if (!currentExercise) {
    return (
      <div className="min-h-svh flex items-center justify-center bg-background">
        <p className="font-bold text-muted-foreground">No exercises found.</p>
      </div>
    )
  }

  return (
    /*
     * IMPORTANT:
     * This component is intentionally NOT `fixed` and does NOT use `inset-0`.
     * It fills the content area supplied by the dashboard/app layout.
     * That means the sidebar + top navbar remain outside this lesson window.
     *
     * The parent layout should give this area a bounded height and use
     * `min-h-0` on its flex/grid ancestors.
     */
    <div className="relative flex h-full min-h-0 w-full min-w-0 flex-col overflow-hidden bg-background">
      {/* Top bar — fixed within this lesson window because the middle is the only scroller */}
      <div className="relative z-20 shrink-0 border-b border-border bg-background px-4 py-3">
        <div className="mx-auto flex w-full max-w-2xl items-center gap-4">
          <button
            onClick={() => router.push('/')}
            className="shrink-0 text-muted-foreground hover:text-foreground"
            aria-label="Exit lesson"
          >
            <X className="size-6" />
          </button>

          <div className="h-3 min-w-0 flex-1 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-duo-green transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>

          <div className="flex shrink-0 items-center gap-1">
            <Heart className="size-5 fill-duo-red text-duo-red" />
            <span className="text-sm font-black text-duo-red">
              {learner?.hearts ?? 5}
            </span>
          </div>
        </div>
      </div>

      {/* ONLY this area scrolls */}
      <main className="min-h-0 min-w-0 flex-1 overflow-y-auto overflow-x-hidden">
        <div className="mx-auto w-full max-w-2xl px-4 py-8">
          {currentExercise.type === 'multiple_choice' && (
            <MultipleChoice exercise={currentExercise} result={result} onAnswerChange={setAnswer} />
          )}
          {currentExercise.type === 'translate' && (
            <Translate exercise={currentExercise} result={result} onAnswerChange={setAnswer} />
          )}
          {currentExercise.type === 'match_pairs' && (
            <MatchPairs exercise={currentExercise} result={result} onAnswerChange={setAnswer} />
          )}
          {currentExercise.type === 'fill_blank' && (
            <FillBlank exercise={currentExercise} result={result} onAnswerChange={setAnswer} />
          )}
          {currentExercise.type === 'type_answer' && (
            <TypeAnswer exercise={currentExercise} result={result} onAnswerChange={setAnswer} />
          )}
        </div>
      </main>

      {/* Bottom action — fixed within this lesson window */}
      {result !== 'none' && (
        <div
          className={cn(
            'relative z-20 shrink-0 border-t',
            result === 'correct'
              ? 'border-duo-green bg-duo-green text-white'
              : 'border-duo-red bg-duo-red text-white'
          )}
        >
          <div className="mx-auto flex w-full max-w-2xl items-center justify-between gap-4 px-4 py-4">
            <div className="flex min-w-0 items-center gap-3">
              {result === 'correct' ? (
                <Check className="size-8 shrink-0" strokeWidth={3} />
              ) : (
                <X className="size-8 shrink-0" strokeWidth={3} />
              )}
              <div className="min-w-0">
                <p className="text-lg font-black">
                  {result === 'correct' ? 'Correct!' : 'Incorrect'}
                </p>
                {result === 'incorrect' && currentExercise.type !== 'match_pairs' && (
                  <p className="text-sm opacity-90">
                    Correct answer:{' '}
                    <span className="font-bold">{currentExercise.correct_answer}</span>
                  </p>
                )}
                {result === 'correct' && currentExercise.explanation && (
                  <p className="text-sm opacity-90">{currentExercise.explanation}</p>
                )}
              </div>
            </div>

            <button
              className="duo-btn shrink-0 bg-white px-8 py-3 text-secondary cursor-pointer shadow-[0_3px_0_oklch(0.8_0_0)]"
              onClick={handleContinue}
            >
              Continue
            </button>
          </div>
        </div>
      )}

      {result === 'none' && (
        <div className="relative z-20 shrink-0 border-t border-border bg-background p-4">
          <div className="mx-auto max-w-2xl">
            <button
              className={cn(
                'duo-btn w-full py-4 cursor-pointer',
                answer
                  ? 'duo-btn-primary'
                  : 'bg-muted text-muted-foreground shadow-[0_3px_0_oklch(0.85_0_0)]'
              )}
              onClick={handleCheck}
              disabled={!answer}
            >
              Check
            </button>
          </div>
        </div>
      )}
    </div>
  )
}