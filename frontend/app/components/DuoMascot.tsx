import { cn } from '../lib/utils'

type Props = {
  className?: string
  expression?: 'happy' | 'sad' | 'excited' | 'thinking'
}

export function DuoMascot({ className, expression = 'happy' }: Props) {
  return (
    <svg className={cn(className)} viewBox="0 0 120 140" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Body */}
      <ellipse cx="60" cy="95" rx="42" ry="40" fill="#58CC02" />
      <ellipse cx="60" cy="95" rx="36" ry="34" fill="#7AE800" />
      {/* Belly */}
      <ellipse cx="60" cy="105" rx="24" ry="22" fill="#89E000" />
      {/* Head */}
      <ellipse cx="60" cy="48" rx="38" ry="36" fill="#58CC02" />
      <ellipse cx="60" cy="48" rx="32" ry="30" fill="#7AE800" />
      {/* Eye whites */}
      <ellipse cx="46" cy="44" rx="12" ry="14" fill="white" />
      <ellipse cx="74" cy="44" rx="12" ry="14" fill="white" />
      {/* Pupils */}
      {expression === 'sad' ? (
        <>
          <ellipse cx="46" cy="48" rx="6" ry="5" fill="#4B4B4B" />
          <ellipse cx="74" cy="48" rx="6" ry="5" fill="#4B4B4B" />
        </>
      ) : (
        <>
          <ellipse cx="46" cy="44" rx="6" ry="7" fill="#4B4B4B" />
          <ellipse cx="74" cy="44" rx="6" ry="7" fill="#4B4B4B" />
        </>
      )}
      {/* Eye highlights */}
      <circle cx="48" cy="41" r="2.5" fill="white" />
      <circle cx="76" cy="41" r="2.5" fill="white" />
      {/* Beak */}
      <path d="M52 58 L60 66 L68 58 L64 62 L60 60 L56 62 Z" fill="#FFD900" stroke="#E5A700" strokeWidth="1" strokeLinejoin="round" />
      {/* Eyebrows */}
      {expression === 'sad' ? (
        <>
          <path d="M36 30 Q46 34 56 32" stroke="#3B7A00" strokeWidth="3" strokeLinecap="round" />
          <path d="M64 32 Q74 34 84 30" stroke="#3B7A00" strokeWidth="3" strokeLinecap="round" />
        </>
      ) : (
        <>
          <path d="M36 28 Q46 26 56 28" stroke="#3B7A00" strokeWidth="3" strokeLinecap="round" />
          <path d="M64 28 Q74 26 84 28" stroke="#3B7A00" strokeWidth="3" strokeLinecap="round" />
        </>
      )}
      {/* Feet */}
      <ellipse cx="45" cy="133" rx="10" ry="6" fill="#FF9600" />
      <ellipse cx="75" cy="133" rx="10" ry="6" fill="#FF9600" />
    </svg>
  )
}
