'use client'

import { useEffect, useState } from 'react'
import { getLeaderboard, type LeaderboardEntry } from '../lib/db'
import { useApp } from '../lib/store'
import { DuoMascot } from '../components/DuoMascot'
import { cn } from '../lib/utils'

export default function LeaderboardPage() {
  const { learner } = useApp()
  const [entries, setEntries] = useState<LeaderboardEntry[]>([])

  useEffect(() => {
    if (learner) {
      getLeaderboard(learner.id).then(setEntries)
    } else {
      setEntries([])
    }
  }, [learner])

  const podium = entries.slice(0, 3)
  const rest = entries.slice(3)

  return (
    <div className="space-y-6 pb-8">
      <div className="text-center">
        <DuoMascot className="w-24 h-28 mx-auto animate-float" expression="happy" />
        <h1 className="text-3xl font-black mt-2">Leaderboard</h1>
        <p className="text-muted-foreground">Top learners this week</p>
      </div>

      {podium.length >= 3 && (
        <div className="flex items-end justify-center gap-2 sm:gap-4">
          <PodiumEntry entry={podium[1]} place={2} height="h-24" />
          <PodiumEntry entry={podium[0]} place={1} height="h-32" />
          <PodiumEntry entry={podium[2]} place={3} height="h-20" />
        </div>
      )}

      <div className="space-y-2">
        {rest.map((entry, i) => (
          <div
            key={entry.id}
            className={cn(
              'flex items-center gap-3 p-3 rounded-xl border-2',
              entry.is_current_user
                ? 'border-duo-blue bg-duo-blue/10'
                : 'border-border bg-card'
            )}
          >
            <span className="font-black text-lg text-muted-foreground w-6 text-center">{i + 4}</span>
            <div
              className="size-10 rounded-full flex items-center justify-center text-white font-bold shrink-0"
              style={{ backgroundColor: entry.avatar_color }}
            >
              {entry.display_name.charAt(0)}
            </div>
            <div className="flex-1">
              <p className="font-bold">
                {entry.display_name}
                {entry.is_current_user && <span className="text-duo-blue ml-2">(You)</span>}
              </p>
            </div>
            <span className="font-black text-duo-yellow">{entry.weekly_xp} XP</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function PodiumEntry({ entry, place, height }: { entry: LeaderboardEntry; place: number; height: string }) {
  const colors = ['from-duo-yellow to-duo-orange', 'from-gray-400 to-gray-500', 'from-orange-600 to-orange-700']

  return (
    <div className="flex flex-col items-center gap-2 flex-1 max-w-[120px]">
      <div
        className="size-16 rounded-full flex items-center justify-center text-white text-2xl font-black shrink-0"
        style={{ backgroundColor: entry.avatar_color }}
      >
        {entry.display_name.charAt(0)}
      </div>
      <p className="font-bold text-sm text-center truncate max-w-full">{entry.display_name}</p>
      <p className="font-black text-duo-yellow text-sm">{entry.weekly_xp} XP</p>
      <div className={cn('w-full rounded-t-xl bg-gradient-to-b flex items-center justify-center', colors[place - 1], height)}>
        <span className="text-2xl font-black text-white">{place}</span>
      </div>
    </div>
  )
}
