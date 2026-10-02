import { MILESTONE_DEFS } from '../lib/milestoneService'

export default function StreakWidget({ streakInfo, achievedMilestones = [], onLogWorkoutClick }) {
  const { currentStreak = 0, longestStreak = 0, isLoggedToday = false, nextMilestone = 3, progressPercent = 0 } = streakInfo || {}

  const achievedSet = new Set(achievedMilestones || [])
  const earnedBadges = MILESTONE_DEFS.filter((m) => achievedSet.has(m.id) || currentStreak >= m.days)

  return (
    <div className="relative overflow-hidden rounded-2xl border border-orange-200/60 bg-gradient-to-br from-amber-500/5 via-orange-500/5 to-white p-6 shadow-sm transition hover:shadow-md dark:border-orange-950/40 dark:from-amber-950/20 dark:via-orange-950/20 dark:to-slate-900/80">
      
      {/* Background ambient fire glow */}
      <div className="pointer-events-none absolute -top-10 -right-10 h-32 w-32 rounded-full bg-amber-500/10 blur-2xl" />

      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          
          {/* Animated Fire Flame Box */}
          <div className="relative flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-500/20 via-orange-500/20 to-red-500/20 text-3xl shadow-inner border border-amber-500/30">
            {/* Pulsing Flame Ring */}
            <span className="absolute inset-0 rounded-2xl bg-amber-500/20 animate-ping opacity-30" />
            
            {/* Animated Fire Icon */}
            <span className="animate-bounce text-3xl select-none" style={{ animationDuration: '2s' }}>
              🔥
            </span>
          </div>

          <div>
            <div className="flex items-center gap-2">
              <span className="text-3xl font-black bg-gradient-to-r from-amber-500 via-orange-500 to-red-500 bg-clip-text text-transparent">
                {currentStreak} Day{currentStreak === 1 ? '' : 's'}
              </span>
              <span className="rounded-full border border-amber-500/30 bg-amber-500/10 px-2.5 py-0.5 text-xs font-bold text-amber-700 dark:text-amber-300">
                🔥 Current Streak
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Personal Best: <strong className="font-bold text-slate-700 dark:text-slate-200">{longestStreak} day{longestStreak === 1 ? '' : 's'}</strong>
            </p>
          </div>
        </div>

        {/* Today's status badge */}
        <div>
          {isLoggedToday ? (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3.5 py-1.5 text-xs font-bold text-emerald-700 dark:text-emerald-400 shadow-2xs">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              Logged Today! 🔥
            </span>
          ) : (
            <button
              onClick={onLogWorkoutClick}
              className="inline-flex items-center gap-2 rounded-full border border-orange-500/40 bg-gradient-to-r from-amber-500 to-orange-500 px-4 py-1.5 text-xs font-bold text-white shadow-md transition hover:scale-105 hover:from-amber-400 hover:to-orange-400 cursor-pointer"
            >
              <span className="text-sm">🔥</span>
              Log Workout to Keep Streak →
            </button>
          )}
        </div>
      </div>

      {/* Progress to next milestone */}
      <div className="mt-5">
        <div className="flex items-center justify-between text-xs mb-1.5 font-medium">
          <span className="text-slate-600 dark:text-slate-300">
            Progress to Next Milestone ({nextMilestone} Days)
          </span>
          <span className="font-bold text-orange-600 dark:text-orange-400">{progressPercent}%</span>
        </div>
        <div className="h-3 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800 shadow-inner">
          <div
            className="h-full rounded-full bg-gradient-to-r from-amber-500 via-orange-500 to-red-500 transition-all duration-700 shadow-sm"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* Badges preview */}
      {earnedBadges.length > 0 && (
        <div className="mt-4 pt-4 border-t border-slate-200/60 dark:border-slate-800/80">
          <div className="text-xs font-bold text-slate-500 mb-2 uppercase tracking-wider">Earned Badges</div>
          <div className="flex flex-wrap gap-2">
            {earnedBadges.map((b) => (
              <span
                key={b.id}
                title={`${b.title}: ${b.description}`}
                className="inline-flex items-center gap-1.5 rounded-full border border-amber-300/80 bg-amber-500/10 px-3 py-1 text-xs font-bold text-amber-900 shadow-2xs dark:border-amber-700/60 dark:bg-amber-950/40 dark:text-amber-200 hover:scale-105 transition"
              >
                <span>{b.badge}</span>
                <span>{b.title}</span>
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
