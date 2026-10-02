import { useCallback, useEffect, useRef, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { getWorkouts } from '../lib/workoutService'
import { computeProgressMetrics, getWeightLogs } from '../lib/progressService'
import { fetchOrGenerateProgressAnalysis } from '../lib/aiService'
import { calculateStreak } from '../lib/workoutService'
import AiProgressAnalysisCard from '../components/AiProgressAnalysisCard'
import { Button, Spinner } from '../components/ui'

export default function Progress() {
  const { profile, user } = useAuth()
  const [range, setRange] = useState('30d')

  const [workouts, setWorkouts] = useState([])
  const [weightLogs, setWeightLogs] = useState([])
  const [loadingData, setLoadingData] = useState(true)

  const [analysis, setAnalysis] = useState(null)
  const [analysisLoading, setAnalysisLoading] = useState(false)
  const [analysisError, setAnalysisError] = useState('')

  const userId = user?.uid

  const loadData = useCallback(async () => {
    if (!userId) return
    setLoadingData(true)
    try {
      const [wList, wtList] = await Promise.all([
        getWorkouts(userId),
        getWeightLogs(userId),
      ])
      setWorkouts(wList)
      setWeightLogs(wtList)
    } catch (err) {
      console.error('Failed to load progress data:', err)
    } finally {
      setLoadingData(false)
    }
  }, [userId])

  useEffect(() => {
    loadData()
  }, [loadData])

  const streakInfo = calculateStreak(workouts)
  const metrics = computeProgressMetrics(profile, weightLogs, workouts, range)

  const loadAiAnalysis = useCallback(
    async (forceRefresh = false) => {
      if (!userId || !profile) return
      setAnalysisLoading(true)
      setAnalysisError('')
      const res = await fetchOrGenerateProgressAnalysis(
        userId,
        profile,
        workouts,
        weightLogs,
        streakInfo,
        forceRefresh
      )
      setAnalysisLoading(false)
      if (res.error) setAnalysisError(res.error)
      else setAnalysis(res.data)
    },
    [userId, profile, workouts, weightLogs, streakInfo]
  )

  // Run the (cache-only) load once per visit. Without this guard the effect re-fired on every
  // render, because streakInfo is a new object each render and so loadAiAnalysis changes each time.
  const autoLoadedRef = useRef(false)
  useEffect(() => {
    if (userId && profile && !loadingData && !autoLoadedRef.current) {
      autoLoadedRef.current = true
      loadAiAnalysis(false)
    }
  }, [userId, profile, loadingData, loadAiAnalysis])

  if (loadingData) return <Spinner label="Loading your progress metrics…" />

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">📊 Progress Analytics</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Track weight trends, workout frequency, duration, calories, and AI analysis.
          </p>
        </div>

        {/* Time Filters */}
        <div className="flex rounded-xl border border-slate-200 bg-white p-1 shadow-2xs dark:border-slate-800 dark:bg-slate-900">
          {[
            { id: '7d', label: '7 Days' },
            { id: '30d', label: '30 Days' },
            { id: '3m', label: '3 Months' },
            { id: 'all', label: 'All Time' },
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => setRange(t.id)}
              className={`rounded-lg px-3 py-1 text-xs font-semibold transition cursor-pointer ${
                range === t.id
                  ? 'bg-emerald-600 text-white shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Summary Stat Cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900/60">
          <div className="text-xs text-slate-500 dark:text-slate-400">Workouts Completed</div>
          <div className="mt-1 text-xl font-bold">{metrics.workoutCount} session{metrics.workoutCount === 1 ? '' : 's'}</div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900/60">
          <div className="text-xs text-slate-500 dark:text-slate-400">Total Duration</div>
          <div className="mt-1 text-xl font-bold">{metrics.totalDuration} mins</div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900/60">
          <div className="text-xs text-slate-500 dark:text-slate-400">Calories Burned</div>
          <div className="mt-1 text-xl font-bold">{metrics.totalCalories} kcal</div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900/60">
          <div className="text-xs text-slate-500 dark:text-slate-400">Distance Covered</div>
          <div className="mt-1 text-xl font-bold">{metrics.totalDistance} km</div>
        </div>
      </div>

      {/* Goal Progress Card */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900/60">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
          <div>
            <h3 className="text-base font-bold">🎯 Weight Goal Progress</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Target: <strong className="font-semibold text-slate-700 dark:text-slate-200">{metrics.targetWeight} kg</strong> | Current: <strong className="font-semibold text-slate-700 dark:text-slate-200">{metrics.currentWeight} kg</strong>
            </p>
          </div>
          <span className="text-xl font-black text-emerald-600 dark:text-emerald-400">
            {metrics.goalProgressPercent}% Reached
          </span>
        </div>

        <div className="h-3 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
          <div
            className="h-full rounded-full bg-emerald-500 transition-all duration-500"
            style={{ width: `${metrics.goalProgressPercent}%` }}
          />
        </div>
        <p className="mt-2 text-xs text-slate-500 dark:text-slate-400 text-right">
          {metrics.weightDelta > 0
            ? `${metrics.weightDelta} kg remaining to reach target weight`
            : metrics.weightDelta < 0
            ? `${Math.abs(metrics.weightDelta)} kg gained toward target weight`
            : 'Target weight reached! 🎉'}
        </p>
      </div>

      {/* Charts Grid */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Weight History Line Chart */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900/60">
          <h3 className="text-base font-bold mb-1">⚖️ Weight History</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">Weight log entries over time (kg)</p>

          <WeightChart logs={metrics.filteredWeights} targetWeight={metrics.targetWeight} />
        </div>

        {/* Workout Activity Bar Chart */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900/60">
          <h3 className="text-base font-bold mb-1">🏋️ Workout Activity</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">Duration per workout session (mins)</p>

          <WorkoutBarChart workouts={metrics.filteredWorkouts} />
        </div>
      </div>

      {/* AI Progress Analysis Card */}
      <AiProgressAnalysisCard
        analysis={analysis}
        loading={analysisLoading}
        error={analysisError}
        onRefresh={() => loadAiAnalysis(true)}
      />
    </div>
  )
}

// Responsive SVG Line Chart for Weight History
function WeightChart({ logs, targetWeight }) {
  if (!logs || logs.length === 0) {
    return (
      <div className="h-48 flex items-center justify-center text-xs text-slate-400 border border-dashed border-slate-200 dark:border-slate-800 rounded-xl">
        No weight history entries yet for this period. Update your weight in Profile.
      </div>
    )
  }

  const weights = logs.map((l) => Number(l.weight_kg))
  if (targetWeight) weights.push(Number(targetWeight))

  const minW = Math.max(0, Math.min(...weights) - 2)
  const maxW = Math.max(...weights) + 2
  const rangeW = maxW - minW || 1

  const width = 400
  const height = 180
  const padding = 30

  const points = logs.map((l, idx) => {
    const x = padding + (idx / Math.max(1, logs.length - 1)) * (width - 2 * padding)
    const y = height - padding - ((Number(l.weight_kg) - minW) / rangeW) * (height - 2 * padding)
    return { x, y, weight: l.weight_kg, date: l.logged_on }
  })

  const pathD = points.length > 1
    ? `M ${points.map((p) => `${p.x},${p.y}`).join(' L ')}`
    : `M ${padding},${points[0]?.y} L ${width - padding},${points[0]?.y}`

  const targetY = targetWeight
    ? height - padding - ((Number(targetWeight) - minW) / rangeW) * (height - 2 * padding)
    : null

  return (
    <div className="w-full overflow-x-auto">
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-48 overflow-visible">
        {/* Target Weight Reference Line */}
        {targetY != null && (
          <g>
            <line x1={padding} y1={targetY} x2={width - padding} y2={targetY} stroke="#10b981" strokeDasharray="4 4" strokeWidth="1.5" />
            <text x={width - padding} y={targetY - 4} textAnchor="end" className="text-[10px] fill-emerald-500 font-semibold">
              Target ({targetWeight}kg)
            </text>
          </g>
        )}

        {/* Line Path */}
        <path d={pathD} fill="none" stroke="#3b82f6" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />

        {/* Data Points */}
        {points.map((p, idx) => (
          <g key={idx}>
            <circle cx={p.x} cy={p.y} r="4" className="fill-blue-600 stroke-white stroke-2 dark:stroke-slate-900" />
            <text x={p.x} y={p.y - 8} textAnchor="middle" className="text-[9px] fill-slate-600 dark:fill-slate-300 font-medium">
              {p.weight}kg
            </text>
          </g>
        ))}
      </svg>
    </div>
  )
}

// Responsive SVG Bar Chart for Workouts
function WorkoutBarChart({ workouts }) {
  if (!workouts || workouts.length === 0) {
    return (
      <div className="h-48 flex items-center justify-center text-xs text-slate-400 border border-dashed border-slate-200 dark:border-slate-800 rounded-xl">
        No workout sessions recorded for this period. Use "Log Workout" on Dashboard.
      </div>
    )
  }

  const recent = workouts.slice(0, 10).reverse()
  const maxDuration = Math.max(...recent.map((w) => Number(w.duration_min) || 0), 60)

  const width = 400
  const height = 180
  const padding = 30
  const barWidth = Math.min(24, (width - 2 * padding) / recent.length - 8)

  return (
    <div className="w-full overflow-x-auto">
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-48 overflow-visible">
        {recent.map((w, idx) => {
          const dur = Number(w.duration_min) || 0
          const barHeight = (dur / maxDuration) * (height - 2 * padding)
          const x = padding + idx * ((width - 2 * padding) / recent.length) + 6
          const y = height - padding - barHeight

          return (
            <g key={idx}>
              <rect
                x={x}
                y={y}
                width={barWidth}
                height={barHeight}
                rx="4"
                className="fill-emerald-500 hover:fill-emerald-400 transition cursor-pointer"
              />
              <text x={x + barWidth / 2} y={y - 4} textAnchor="middle" className="text-[9px] fill-slate-600 dark:fill-slate-300 font-semibold">
                {dur}m
              </text>
              <text x={x + barWidth / 2} y={height - 10} textAnchor="middle" className="text-[8px] fill-slate-400">
                {w.logged_on ? w.logged_on.slice(5) : ''}
              </text>
            </g>
          )
        })}
      </svg>
    </div>
  )
}
