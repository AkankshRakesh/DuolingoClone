import { useEffect, useState } from 'react'

type Piece = {
  id: number
  left: number
  delay: number
  duration: number
  color: string
  rotation: number
}

const colors = ['#58CC02', '#1CB0F6', '#FF9600', '#FF4B4B', '#CE82FF', '#FFD900']

export function Confetti({ count = 50 }: { count?: number }) {
  const [pieces, setPieces] = useState<Piece[]>([])

  useEffect(() => {
    const newPieces: Piece[] = Array.from({ length: count }, (_, i) => ({
      id: i,
      left: Math.random() * 100,
      delay: Math.random() * 0.5,
      duration: 2 + Math.random() * 2,
      color: colors[Math.floor(Math.random() * colors.length)],
      rotation: Math.random() * 360,
    }))
    setPieces(newPieces)
    const timer = setTimeout(() => setPieces([]), 5000)
    return () => clearTimeout(timer)
  }, [count])

  if (pieces.length === 0) return null

  return (
    <div className="fixed inset-0 pointer-events-none z-[9999]">
      {pieces.map((p) => (
        <div
          key={p.id}
          className="confetti-piece"
          style={{
            left: `${p.left}%`,
            backgroundColor: p.color,
            animationDelay: `${p.delay}s`,
            animationDuration: `${p.duration}s`,
            transform: `rotate(${p.rotation}deg)`,
          }}
        />
      ))}
    </div>
  )
}
