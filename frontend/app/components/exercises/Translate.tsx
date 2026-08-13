import { useState } from 'react'
import type { Exercise } from '../../lib/db'
import { cn } from '../../lib/utils'

type Props = {
  exercise: Exercise
  result: 'none' | 'correct' | 'incorrect'
  onAnswerChange: (answer: string | null) => void
}

export function Translate({ exercise, result, onAnswerChange }: Props) {
  const [selectedWords, setSelectedWords] = useState<{ word: string; index: number }[]>([])
  const options = (exercise.options as string[]) ?? []
  const usedIndices = new Set(selectedWords.map((w) => w.index))

  const addWord = (word: string, index: number) => {
    if (result !== 'none' || usedIndices.has(index)) return
    const newWords = [...selectedWords, { word, index }]
    setSelectedWords(newWords)
    onAnswerChange(newWords.map((w) => w.word).join(' '))
  }

  const removeWord = (position: number) => {
    if (result !== 'none') return
    const newWords = selectedWords.filter((_, i) => i !== position)
    setSelectedWords(newWords)
    onAnswerChange(newWords.length > 0 ? newWords.map((w) => w.word).join(' ') : null)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="size-12 rounded-full bg-duo-blue flex items-center justify-center text-2xl shrink-0">
          🇪🇸
        </div>
        <h2 className="text-2xl font-black text-foreground">{exercise.prompt}</h2>
      </div>

      {/* Answer area */}
      <div className="min-h-[60px] border-b-2 border-border pb-3 flex flex-wrap gap-2 items-start">
        {selectedWords.length === 0 && (
          <span className="text-muted-foreground text-sm pt-2">Tap words below to build your answer</span>
        )}
        {selectedWords.map((item, i) => (
          <button
            key={i}
            className={cn(
              'word-token',
              result === 'correct' && 'correct',
              result === 'incorrect' && 'incorrect'
            )}
            onClick={() => removeWord(i)}
            disabled={result !== 'none'}
          >
            {item.word}
          </button>
        ))}
      </div>

      {/* Word bank */}
      <div className="flex flex-wrap gap-2 pt-2">
        {options.map((word, i) => (
          <button
            key={i}
            className={cn('word-token', usedIndices.has(i) && 'used')}
            onClick={() => addWord(word, i)}
            disabled={result !== 'none' || usedIndices.has(i)}
          >
            {word}
          </button>
        ))}
      </div>
    </div>
  )
}
