import { useApp } from '../lib/store'
import { Flame, Heart, Zap, Gem } from 'lucide-react'
import { usePathname } from 'next/navigation'
import { cn } from '../lib/utils'

export function TopBar() {
  const { learner } = useApp()
  const pathname = usePathname()
  const isLesson = pathname.startsWith('/lesson')

  if (!learner) return null

  const dailyProgress = Math.min((learner.daily_xp_earned / learner.daily_xp_goal) * 100, 100)

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-background border-b border-border">
      <div className="max-w-2xl mx-auto px-4 h-14 flex items-center justify-between gap-4">
        {/* Logo */}
        <div className="flex items-center gap-2">
          {/* <DuoLogo className="size-8" /> */}
          <img
            src={isLesson ? '/work.gif' : '/roll.gif'}
            alt="Waving Duo Mascot"
            className={isLesson ? 'w-24 h-16' : 'size-24'}
          />
          {/* <span className="font-black text-xl text-primary hidden sm:block">Duolingo</span> */}
        </div>

        {/* Daily XP Progress */}
        <div className="flex-1 max-w-[140px] hidden sm:block">
          <div className="flex items-center gap-1.5 mb-1">
            <Zap className="size-3 text-duo-yellow fill-duo-yellow" />
            <span className="text-xs font-bold text-muted-foreground">
              {learner.daily_xp_earned}/{learner.daily_xp_goal} XP
            </span>
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full xp-progress-bar"
              style={{ width: `${dailyProgress}%` }}
            />
          </div>
        </div>

        {/* Stats */}
        <div className="flex items-center gap-4">
          {/* Streak */}
          <div className="flex items-center gap-1">
            <Flame className={cn(
              "size-5",
              learner.streak_days > 0 ? "text-duo-orange fill-duo-orange" : "text-muted-foreground"
            )} />
            <span className={cn(
              "font-black text-sm",
              learner.streak_days > 0 ? "text-duo-orange" : "text-muted-foreground"
            )}>
              {learner.streak_days}
            </span>
          </div>

          {/* Hearts */}
          <div className="flex items-center gap-1">
            <Heart className={cn(
              "size-5",
              learner.hearts > 0 ? "text-duo-red fill-duo-red heart-icon" : "text-muted-foreground"
            )} />
            <span className={cn(
              "font-black text-sm",
              learner.hearts > 0 ? "text-duo-red" : "text-muted-foreground"
            )}>
              {learner.hearts}
            </span>
          </div>

          {/* Gems */}
          <div className="flex items-center gap-1">
            <Gem className="size-5 text-duo-blue fill-duo-blue" />
            <span className="font-black text-sm text-duo-blue">{learner.gems}</span>
          </div>
        </div>
      </div>
    </header>
  )
}

function DuoLogo({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="20" cy="20" r="20" fill="#58CC02" />
      <circle cx="20" cy="20" r="15" fill="#7AE800" />
      {/* Duo owl eyes */}
      <circle cx="14" cy="18" r="5" fill="white" />
      <circle cx="26" cy="18" r="5" fill="white" />
      <circle cx="15" cy="18" r="3" fill="#4B4B4B" />
      <circle cx="27" cy="18" r="3" fill="#4B4B4B" />
      <circle cx="16" cy="17" r="1" fill="white" />
      <circle cx="28" cy="17" r="1" fill="white" />
      {/* Beak */}
      <path d="M17 24 L20 27 L23 24" fill="#FFD900" stroke="#FFD900" strokeLinejoin="round" />
      {/* Eyebrows */}
      <path d="M10 13 Q14 11 18 13" stroke="#4B4B4B" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M22 13 Q26 11 30 13" stroke="#4B4B4B" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  )
}
