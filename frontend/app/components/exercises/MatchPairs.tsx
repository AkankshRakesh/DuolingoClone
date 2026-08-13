import { useState } from 'react'
import type { Exercise } from '../../lib/db'
import { cn } from '../../lib/utils'

type Props = {
  exercise: Exercise
  result: 'none' | 'correct' | 'incorrect'
  onAnswerChange: (answer: string | null) => void
}

type Pair = { spanish: string; english: string }

export function MatchPairs({ exercise, result, onAnswerChange }: Props) {
  const pairs = (exercise.options as Pair[]) ?? []
  const correctMap = new Map(pairs.map((p) => [p.spanish, p.english]))
  const reverseMap = new Map(pairs.map((p) => [p.english, p.spanish]))

  const [matched, setMatched] = useState<Set<string>>(new Set())
  const [selectedLeft, setSelectedLeft] = useState<string | null>(null)
  const [selectedRight, setSelectedRight] = useState<string | null>(null)
  const [wrongPair, setWrongPair] = useState<{ left: string; right: string } | null>(null)

  const leftItems = pairs.map((p) => p.spanish)
  const rightItems = [...pairs.map((p) => p.english)].reverse()

  const handleLeftClick = (word: string) => {
    if (result !== 'none' || matched.has(word)) return
    setSelectedLeft(word)
    if (selectedRight) {
      checkMatch(word, selectedRight)
    }
  }

  const handleRightClick = (word: string) => {
    if (result !== 'none' || matched.has(reverseMap.get(word) ?? '')) return
    setSelectedRight(word)
    if (selectedLeft) {
      checkMatch(selectedLeft, word)
    }
  }

  const checkMatch = (left: string, right: string) => {
    const expected = correctMap.get(left)
    if (expected === right) {
      const newMatched = new Set(matched)
      newMatched.add(left)
      setMatched(newMatched)
      setSelectedLeft(null)
      setSelectedRight(null)

      if (newMatched.size === pairs.length) {
        const answerStr = pairs.map((p) => `${p.spanish}=${p.english}`).join('|')
        onAnswerChange(answerStr)
      }
    } else {
      setWrongPair({ left, right })
      setTimeout(() => {
        setWrongPair(null)
        setSelectedLeft(null)
        setSelectedRight(null)
      }, 600)
    }
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-black text-foreground">{exercise.prompt}</h2>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-3">
          {leftItems.map((word) => (
            <button
              key={word}
              className={cn(
                'option-btn text-center',
                matched.has(word) && 'correct opacity-50',
                selectedLeft === word && !matched.has(word) && 'selected',
                wrongPair?.left === word && 'incorrect animate-shake'
              )}
              onClick={() => handleLeftClick(word)}
              disabled={result !== 'none' || matched.has(word)}
            >
              {word}
            </button>
          ))}
        </div>
        <div className="space-y-3">
          {rightItems.map((word) => (
            <button
              key={word}
              className={cn(
                'option-btn text-center',
                matched.has(reverseMap.get(word) ?? '') && 'correct opacity-50',
                selectedRight === word && !matched.has(reverseMap.get(word) ?? '') && 'selected',
                wrongPair?.right === word && 'incorrect animate-shake'
              )}
              onClick={() => handleRightClick(word)}
              disabled={result !== 'none' || matched.has(reverseMap.get(word) ?? '')}
            >
              {word}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
