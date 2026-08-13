import { useState } from 'react'
import type { Exercise } from '../../lib/db'
import { cn } from '../../lib/utils'

type Props = {
  exercise: Exercise
  result: 'none' | 'correct' | 'incorrect'
  onAnswerChange: (answer: string | null) => void
}

export function FillBlank({ exercise, result, onAnswerChange }: Props) {
  const [selected, setSelected] = useState<string | null>(null)
  const options = (exercise.options as string[]) ?? []

  const handleSelect = (option: string) => {
    if (result !== 'none') return
    setSelected(option)
    onAnswerChange(option)
  }

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-black text-foreground">{exercise.prompt}</h2>
      <div className="grid grid-cols-2 gap-3">
        {options.map((option, i) => (
          <button
            key={i}
            className={cn(
              'option-btn text-center',
              selected === option && result === 'none' && 'selected',
              result !== 'none' && option === exercise.correct_answer && 'correct',
              result === 'incorrect' && selected === option && option !== exercise.correct_answer && 'incorrect'
            )}
            onClick={() => handleSelect(option)}
            disabled={result !== 'none'}
          >
            {option}
          </button>
        ))}
      </div>
    </div>
  )
}
