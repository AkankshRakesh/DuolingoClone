import { useState } from 'react'
import type { Exercise } from '../../lib/db'
import { cn } from '../../lib/utils'

type Props = {
  exercise: Exercise
  result: 'none' | 'correct' | 'incorrect'
  onAnswerChange: (answer: string | null) => void
}

export function TypeAnswer({ exercise, result, onAnswerChange }: Props) {
  const [value, setValue] = useState('')

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (result !== 'none') return
    setValue(e.target.value)
    onAnswerChange(e.target.value || null)
  }

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-black text-foreground">{exercise.prompt}</h2>
      <input
        type="text"
        value={value}
        onChange={handleChange}
        disabled={result !== 'none'}
        className={cn(
          'w-full px-4 py-3 rounded-xl border-2 bg-background text-lg font-semibold outline-none transition-colors',
          result === 'correct' && 'border-duo-green',
          result === 'incorrect' && 'border-duo-red',
          result === 'none' && 'border-border focus:border-duo-blue'
        )}
        placeholder="Type your answer..."
        autoComplete="off"
      />
    </div>
  )
}
