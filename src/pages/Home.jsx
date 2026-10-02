import { useCallback, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import {
  addWorkout,
  calculateStreak,
  deleteWorkout,
  getTodaySummary,
  getWorkouts,
  updateWorkout,
} from '../lib/workoutService'
import { claimMilestone, checkUnclaimedMilestones } from '../lib/milestoneService'
import { getExistingDailyPlan, generateDailyPlan } from '../lib/aiService'
import StreakWidget from '../components/StreakWidget'
import DailyPlanView from '../components/DailyPlanView'
import WorkoutModal from '../components/WorkoutModal'
import WorkoutHistoryModal from '../components/WorkoutHistoryModal'
import MilestoneCelebrationModal from '../components/MilestoneCelebrationModal'
import AiAssistant from '../components/AiAssistant'
import { Button } from '../components/ui'

export default function Home() {
  const { profile, user } = useAuth()
  const userId = user?.uid

  const [workouts, setWorkouts] = useState([])
  const [loadingWorkouts, setLoadingWorkouts] = useState(true)

  // Modals state
  const [isLogModalOpen, setIsLogModalOpen] = useState(false)
  const [editingWorkout, setEditingWorkout] = useState(null)
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false)
  const [isAiAssistantOpen, setIsAiAssistantOpen] = useState(false)
  const [celebratingMilestone, setCelebratingMilestone] = useState(null)

  // AI Daily Plan state
  const [dailyPlan, setDailyPlan] = useState(null)
  const [loadingPlan, setLoadingPlan] = useState(false)
  const [planError, setPlanError] = useState('')
  const inFlightRef = useRef(false)

  // Load Workouts
  const loadWorkoutData = useCallback(async () => {
    if (!userId) return
    setLoadingWorkouts(true)
    try {
      const list = await getWorkouts(userId)
      setWorkouts(list)
    } catch (err) {
      console.error('Failed to load workouts:', err)
    } finally {
      setLoadingWorkouts(false)
    }
  }, [userId])

  useEffect(() => {
    loadWorkoutData()
  }, [loadWorkoutData])

  const streakInfo = calculateStreak(workouts)
  const todaySummary = getTodaySummary(workouts)

  // Check for newly reached milestones
  useEffect(() => {
    if (streakInfo.currentStreak > 0 && profile) {
      const unclaimed = checkUnclaimedMilestones(
        streakInfo.currentStreak,
        profile.achieved_milestones || []
      )
      if (unclaimed.length > 0 && !celebratingMilestone) {
        setCelebratingMilestone(unclaimed[0])
      }
    }
  }, [streakInfo.currentStreak, profile, celebratingMilestone])

  // Load cached AI Daily Plan on mount — NEVER auto-call Gemini
  const loadCachedPlan = useCallback(async () => {
    if (!userId) return
    try {
      const cached = await getExistingDailyPlan(userId)
      if (cached) setDailyPlan(cached)
    } catch (e) {
      console.warn('Could not load cached AI plan:', e)
    }
  }, [userId])

  useEffect(() => {
    if (userId && !loadingWorkouts) loadCachedPlan()
  }, [userId, loadingWorkouts, loadCachedPlan])

  // Explicit: only called when user clicks "Generate AI Plan" button
  const handleGeneratePlan = useCallback(async () => {
    if (!userId || !profile || inFlightRef.current) return
    inFlightRef.current = true
    setLoadingPlan(true)
    setPlanError('')
    try {
      const res = await generateDailyPlan(userId, profile, workouts)
      if (res.error) {
        setPlanError(res.error)
      } else {
        setDailyPlan(res.data)
      }
    } catch (e) {
      setPlanError(e?.message || 'Failed to generate plan.')
    } finally {
      setLoadingPlan(false)
      inFlightRef.current = false
    }
  }, [userId, profile, workouts])

  // Workout CRUD Handlers
  async function handleSaveWorkout(workoutData) {
    if (workoutData.id) {
      await updateWorkout(workoutData.id, workoutData, userId)
    } else {
      await addWorkout(userId, workoutData)
    }
    await loadWorkoutData()
  }

  async function handleDeleteWorkout(workoutId) {
    await deleteWorkout(workoutId, userId)
    await loadWorkoutData()
  }

  async function handleClaimMilestone(milestoneId) {
    await claimMilestone(userId, milestoneId, profile?.achieved_milestones || [])
  }

  return (
    <div className="space-y-6">
      {/* Welcome & Primary Actions Banner */}
      <div className="relative overflow-hidden rounded-3xl border border-slate-200/80 bg-gradient-to-r from-emerald-500/10 via-teal-500/5 to-white p-6 sm:p-8 shadow-sm dark:border-slate-800 dark:from-emerald-950/20 dark:via-teal-950/10 dark:to-slate-900">
        
        {/* Subtle background ambient ring */}
        <div className="pointer-events-none absolute -bottom-10 -left-10 h-40 w-40 rounded-full bg-emerald-500/10 blur-3xl" />

        <div className="relative flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-bold text-emerald-700 dark:text-emerald-300 mb-2">
              ✨ Personal Fitness Hub
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-slate-100">
              Welcome back, {profile.display_name || 'Fitness Champion'} 👋
            </h1>
            <p className="mt-1 text-xs sm:text-sm text-slate-600 dark:text-slate-300 max-w-xl">
              Log today's workout, check your streak, or view personalized AI nutrition and recovery guidance.
            </p>
          </div>

          {/* Primary Action Buttons */}
          <div className="flex flex-wrap items-center gap-2.5">
            <Button
              variant="primary"
              className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 shadow-md text-sm font-bold py-3 px-5 hover:scale-[1.02] transition cursor-pointer"
              onClick={() => {
                setEditingWorkout(null)
                setIsLogModalOpen(true)
              }}
            >
              💪 Log Workout
            </Button>

            <Link to="/progress">
              <Button variant="secondary" className="text-xs font-semibold py-2.5 px-4 shadow-2xs hover:scale-[1.02] transition">
                📈 View Progress
              </Button>
            </Link>

            <Button
              variant="outline"
              className="text-xs font-semibold py-2.5 px-3"
              onClick={() => setIsHistoryModalOpen(true)}
            >
              📋 History
            </Button>

            <Button
              variant="outline"
              className="text-xs font-semibold py-2.5 px-3"
              onClick={() => setIsAiAssistantOpen(true)}
            >
              🤖 Assistant
            </Button>
          </div>
        </div>
      </div>

      {/* Today's Activity & Streak Grid */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Streak & Rewards Card with Animated Fire */}
        <StreakWidget
          streakInfo={streakInfo}
          achievedMilestones={profile?.achieved_milestones || []}
          onLogWorkoutClick={() => {
            setEditingWorkout(null)
            setIsLogModalOpen(true)
          }}
        />

        {/* Today's Activity Summary Card */}
        <div className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900/60 transition hover:shadow-md">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
            <h3 className="font-bold text-base flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-teal-500/10 text-lg border border-teal-500/20">
                ⚡
              </span>
              <span>Today's Activity</span>
            </h3>
            <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
              {todaySummary.count} session{todaySummary.count === 1 ? '' : 's'} logged
            </span>
          </div>

          <div className="grid grid-cols-3 gap-3 my-4">
            <div className="rounded-xl border border-slate-100 bg-slate-50/80 p-3 text-center dark:border-slate-800 dark:bg-slate-800/40">
              <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400">Duration</div>
              <div className="mt-1 text-xl font-black text-slate-800 dark:text-slate-100">
                {todaySummary.totalDuration} <span className="text-xs font-normal text-slate-400">min</span>
              </div>
            </div>

            <div className="rounded-xl border border-slate-100 bg-slate-50/80 p-3 text-center dark:border-slate-800 dark:bg-slate-800/40">
              <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400">Calories</div>
              <div className="mt-1 text-xl font-black text-slate-800 dark:text-slate-100">
                {todaySummary.totalCalories} <span className="text-xs font-normal text-slate-400">kcal</span>
              </div>
            </div>

            <div className="rounded-xl border border-slate-100 bg-slate-50/80 p-3 text-center dark:border-slate-800 dark:bg-slate-800/40">
              <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400">Distance</div>
              <div className="mt-1 text-xl font-black text-slate-800 dark:text-slate-100">
                {Math.round(todaySummary.totalDistance * 10) / 10} <span className="text-xs font-normal text-slate-400">km</span>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between text-xs pt-2">
            <span className="text-slate-500 font-medium">
              {todaySummary.count > 0 ? '🎉 Excellent work staying active today!' : 'No activity logged for today yet.'}
            </span>
            <button
              onClick={() => {
                setEditingWorkout(null)
                setIsLogModalOpen(true)
              }}
              className="font-bold text-emerald-600 hover:text-emerald-500 hover:underline dark:text-emerald-400 cursor-pointer"
            >
              + Quick Log
            </button>
          </div>
        </div>
      </div>

      {/* Today's Personalized AI Recommendations Section */}
      <DailyPlanView
        plan={dailyPlan}
        loading={loadingPlan}
        error={planError}
        onRefresh={handleGeneratePlan}
        onLogWorkout={(suggestedWorkout) => {
          setEditingWorkout({
            type: 'strength',
            custom_name: suggestedWorkout.title,
            duration_min: suggestedWorkout.durationMinutes || 30,
            notes: `AI Suggested: ${suggestedWorkout.summary}`,
          })
          setIsLogModalOpen(true)
        }}
      />

      {/* Floating AI Assistant Entry Point */}
      <button
        onClick={() => setIsAiAssistantOpen(true)}
        className="fixed bottom-6 right-6 z-40 flex items-center gap-2 rounded-full bg-gradient-to-r from-emerald-600 to-teal-600 px-5 py-3.5 text-sm font-bold text-white shadow-2xl transition hover:scale-105 hover:from-emerald-500 hover:to-teal-500 cursor-pointer"
      >
        <span className="text-xl">🤖</span>
        <span>AI Assistant</span>
      </button>

      {/* MODALS */}
      <WorkoutModal
        isOpen={isLogModalOpen}
        onClose={() => setIsLogModalOpen(false)}
        onSave={handleSaveWorkout}
        editingWorkout={editingWorkout}
      />

      <WorkoutHistoryModal
        isOpen={isHistoryModalOpen}
        onClose={() => setIsHistoryModalOpen(false)}
        workouts={workouts}
        loading={loadingWorkouts}
        onEdit={(w) => {
          setEditingWorkout(w)
          setIsLogModalOpen(true)
        }}
        onDelete={handleDeleteWorkout}
        onAddNew={() => {
          setEditingWorkout(null)
          setIsLogModalOpen(true)
        }}
      />

      <MilestoneCelebrationModal
        milestone={celebratingMilestone}
        onClose={() => setCelebratingMilestone(null)}
        onClaim={handleClaimMilestone}
      />

      <AiAssistant
        isOpen={isAiAssistantOpen}
        onClose={() => setIsAiAssistantOpen(false)}
        userId={userId}
        profile={profile}
      />
    </div>
  )
}
