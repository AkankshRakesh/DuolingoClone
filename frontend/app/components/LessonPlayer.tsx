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
          <DuoMascot className="w-24 h-28 mx-auto animate-float" expression="happy" />
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
          <h1 className="text-3xl font-black mt-6 text-foreground">You're out of hearts!</h1>
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
          <DuoMascot className="w-32 h-36 mx-auto animate-bounce-in" expression="excited" />
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
    <div className="min-h-svh bg-background flex flex-col">
      {/* Top bar with progress and hearts */}
      <div className="px-4 py-3 flex items-center gap-4 max-w-2xl mx-auto w-full">
        <button onClick={() => router.push('/')} className="text-muted-foreground hover:text-foreground shrink-0">
          <X className="size-6" />
        </button>
        <div className="flex-1 h-3 bg-muted rounded-full overflow-hidden">
          <div
            className="h-full bg-duo-green rounded-full transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <Heart className="size-5 text-duo-red fill-duo-red" />
          <span className="font-black text-sm text-duo-red">{learner?.hearts ?? 5}</span>
        </div>
      </div>

      {/* Exercise area */}
      <div className="flex-1 px-4 py-8 max-w-2xl mx-auto w-full">
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

      {/* Feedback bar */}
      {result !== 'none' && (
        <div
          className={cn(
            'feedback-bar',
            result === 'correct' ? 'bg-duo-green text-white' : 'bg-duo-red text-white'
          )}
        >
          <div className="max-w-2xl mx-auto flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              {result === 'correct' ? (
                <Check className="size-8" strokeWidth={3} />
              ) : (
                <X className="size-8" strokeWidth={3} />
              )}
              <div>
                <p className="font-black text-lg">
                  {result === 'correct' ? 'Correct!' : 'Incorrect'}
                </p>
                {result === 'incorrect' && currentExercise.type !== 'match_pairs' && (
                  <p className="text-sm opacity-90">
                    Correct answer: <span className="font-bold">{currentExercise.correct_answer}</span>
                  </p>
                )}
                {result === 'correct' && currentExercise.explanation && (
                  <p className="text-sm opacity-90">{currentExercise.explanation}</p>
                )}
              </div>
            </div>
            <button
              className="duo-btn py-3 px-8 bg-white text-secondary cursor-pointer shadow-[0_3px_0_oklch(0.8_0_0)]"
              onClick={handleContinue}
            >
              Continue
            </button>
          </div>
        </div>
      )}

      {/* Check button */}
      {result === 'none' && (
        <div className="border-t border-border bg-background p-4">
          <div className="max-w-2xl mx-auto">
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