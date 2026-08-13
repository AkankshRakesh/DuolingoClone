'use client'

import { useEffect, useState } from 'react'
import { getDailyXpLog } from '../lib/db'
import { useApp } from '../lib/store'
import { Flame, Zap, Star, Award, TrendingUp, LogOut } from 'lucide-react'
import { cn } from '../lib/utils'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

export default function ProfilePage() {
  const { learner, skillProgress, logout } = useApp()
  const router = useRouter()
  const [dailyXp, setDailyXp] = useState<{ log_date: string; xp_earned: number }[]>([])

  useEffect(() => {
    if (learner) {
      getDailyXpLog(learner.id).then(setDailyXp)
    } else {
      setDailyXp([])
    }
  }, [learner])

  if (!learner) return null

  const completedSkills = Object.values(skillProgress).filter((p) => p.is_completed).length
  const totalCrowns = Object.values(skillProgress).reduce((sum, p) => sum + p.crowns_earned, 0)
  const maxDayXp = Math.max(...dailyXp.map((d) => d.xp_earned), 1)

  const achievements = [
    { name: 'First Steps', desc: 'Complete your first lesson', icon: '🎯', unlocked: completedSkills >= 0 },
    { name: 'On Fire', desc: 'Reach a 3-day streak', icon: '🔥', unlocked: learner.streak_days >= 3 },
    { name: 'Sharp Shooter', desc: 'Earn 100 XP', icon: '⚡', unlocked: learner.total_xp >= 100 },
    { name: 'Crown Collector', desc: 'Earn 3 crowns', icon: '👑', unlocked: totalCrowns >= 3 },
    { name: 'Polyglot', desc: 'Complete 5 skills', icon: '🌟', unlocked: completedSkills >= 5 },
    { name: 'Daily Goal', desc: 'Hit your daily XP goal', icon: '🏆', unlocked: learner.daily_xp_earned >= learner.daily_xp_goal },
  ]

  const handleLogout = () => {
    logout()
    toast.success('Logged out successfully')
    router.push('/auth')
  }

  return (
    <div className="space-y-6 pb-8">
      <div className="flex items-center gap-4">
        <div className="size-20 rounded-full bg-duo-green flex items-center justify-center text-white text-3xl font-black shadow-[0_4px_0_var(--duo-green-dark)]">
          {learner.display_name.charAt(0).toUpperCase()}
        </div>
        <div className="flex-1">
          <h1 className="text-2xl font-black">{learner.display_name}</h1>
          <p className="text-muted-foreground text-sm">@{learner.username}</p>
        </div>
        <button
          onClick={handleLogout}
          className="p-2 rounded-lg border-2 border-border hover:border-duo-red hover:text-duo-red transition-colors"
          title="Log out"
        >
          <LogOut className="size-5" />
        </button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard icon={<Flame className="size-6 text-duo-orange fill-duo-orange" />} value={learner.streak_days} label="Day Streak" />
        <StatCard icon={<Zap className="size-6 text-duo-yellow fill-duo-yellow" />} value={learner.total_xp} label="Total XP" />
        <StatCard icon={<Star className="size-6 text-duo-blue fill-duo-blue" />} value={totalCrowns} label="Crowns" />
        <StatCard icon={<Award className="size-6 text-duo-purple" />} value={completedSkills} label="Skills Done" />
      </div>

      <div className="bg-card border-2 border-border rounded-2xl p-4">
        <h3 className="font-black text-lg mb-4 flex items-center gap-2">
          <TrendingUp className="size-5 text-duo-green" />
          XP This Week
        </h3>
        <div className="flex items-end justify-between gap-2 h-32">
          {dailyXp.length === 0 ? (
            <p className="text-muted-foreground text-sm">No data yet</p>
          ) : (
            dailyXp.map((day, i) => {
              const date = new Date(day.log_date)
              const dayName = date.toLocaleDateString('en', { weekday: 'short' })
              const height = (day.xp_earned / maxDayXp) * 100
              return (
                <div key={i} className="flex flex-col items-center gap-1 flex-1">
                  <div className="w-full flex-1 flex items-end">
                    <div
                      className="w-full bg-duo-green rounded-t-lg transition-all"
                      style={{ height: `${height}%`, minHeight: '4px' }}
                    />
                  </div>
                  <span className="text-xs font-bold text-muted-foreground">{dayName}</span>
                </div>
              )
            })
          )}
        </div>
      </div>

      <div className="bg-card border-2 border-border rounded-2xl p-4">
        <h3 className="font-black text-lg mb-2">Daily Goal</h3>
        <div className="flex items-center gap-3">
          <div className="flex-1 h-4 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full xp-progress-bar"
              style={{ width: `${Math.min((learner.daily_xp_earned / learner.daily_xp_goal) * 100, 100)}%` }}
            />
          </div>
          <span className="font-bold text-sm whitespace-nowrap">
            {learner.daily_xp_earned} / {learner.daily_xp_goal} XP
          </span>
        </div>
      </div>

      <div>
        <h3 className="font-black text-lg mb-3">Achievements</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {achievements.map((a) => (
            <div
              key={a.name}
              className={cn(
                'border-2 rounded-2xl p-3 text-center transition-all',
                a.unlocked
                  ? 'border-duo-yellow bg-duo-yellow/10'
                  : 'border-border opacity-50 grayscale'
              )}
            >
              <div className="text-3xl mb-1">{a.icon}</div>
              <p className="font-bold text-sm">{a.name}</p>
              <p className="text-xs text-muted-foreground">{a.desc}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-card border-2 border-border rounded-2xl p-4">
        <h3 className="font-black text-lg mb-3">Settings</h3>
        <div className="space-y-3">
          <SettingRow label="Account" value="Manage your account" />
          <SettingRow label="Notifications" value="Coming soon" />
          <SettingRow label="Privacy" value="Coming soon" />
          <SettingRow label="Sound Effects" value="On" />
        </div>
      </div>
    </div>
  )
}

function StatCard({ icon, value, label }: { icon: React.ReactNode; value: number; label: string }) {
  return (
    <div className="bg-card border-2 border-border rounded-2xl p-3 text-center">
      <div className="flex justify-center mb-1">{icon}</div>
      <p className="text-2xl font-black">{value}</p>
      <p className="text-xs font-bold text-muted-foreground uppercase">{label}</p>
    </div>
  )
}

function SettingRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-border last:border-0">
      <span className="font-bold">{label}</span>
      <span className="text-sm text-muted-foreground">{value}</span>
    </div>
  )
}
