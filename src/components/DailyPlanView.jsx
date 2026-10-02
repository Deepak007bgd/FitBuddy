import { useState } from 'react'
import { Alert, Button, Spinner } from './ui'

export default function DailyPlanView({ plan, loading, error, onRefresh, onLogWorkout }) {
  const [activeTab, setActiveTab] = useState('workout')

  if (loading) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-xs dark:border-slate-800 dark:bg-slate-900/60">
        <Spinner label="Generating your personalized daily AI plan…" />
        <p className="mt-2 text-center text-xs text-slate-400">
          Analyzing your profile, goal, fitness level, and recent workouts...
        </p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900/60">
        <Alert kind="error">{error}</Alert>
        <div className="mt-4 flex justify-center">
          <Button variant="outline" onClick={onRefresh} disabled={loading}>
            🔄 Try Generating AI Plan Again
          </Button>
        </div>
      </div>
    )
  }

  if (!plan) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-xs dark:border-slate-800 dark:bg-slate-900/60">
        <div className="text-4xl mb-3">🤖</div>
        <h3 className="text-lg font-bold">Today's AI Recommendations</h3>
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
          Get a personalized workout, nutrition tips, and recovery suggestions based on your profile and recent activity.
        </p>
        <Button variant="primary" className="mt-4 text-xs" onClick={onRefresh}>
          ✨ Generate AI Plan
        </Button>
      </div>
    )
  }

  const { workout, nutrition, recovery, weeklySummary } = plan

  return (
    <div className="space-y-6">
      {/* Header & Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-3 dark:border-slate-800">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <span>🤖 Today's AI Recommendations</span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Tailored to your profile and recent activity. Saved for today.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="ghost" className="text-xs py-1 px-2.5" onClick={onRefresh} disabled={loading}>
            {loading ? '⏳ Generating…' : '🔄 Refresh Plan'}
          </Button>
        </div>
      </div>

      {/* Navigation Pills */}
      <div className="flex flex-wrap gap-2">
        {[
          { id: 'workout', label: '🏋️ Workout Suggestion' },
          { id: 'nutrition', label: '🥗 Nutrition Tips' },
          { id: 'recovery', label: '🧘 Recovery & Wellness' },
          { id: 'weekly', label: '📊 Weekly AI Summary' },
        ].map((t) => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            className={`rounded-xl px-3.5 py-2 text-xs font-semibold transition cursor-pointer ${
              activeTab === t.id
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* TAB 1: WORKOUT */}
      {activeTab === 'workout' && workout && (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900/60 space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4 dark:border-slate-800/80">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">{workout.title}</h3>
                <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                  {workout.intensity || 'Moderate'}
                </span>
              </div>
              <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">{workout.summary}</p>
            </div>

            <div className="flex items-center gap-3">
              <span className="text-sm font-bold text-slate-700 dark:text-slate-300">
                ⏱️ {workout.durationMinutes || 30} mins
              </span>
              <Button variant="primary" className="text-xs" onClick={() => onLogWorkout(workout)}>
                ✓ Log Completed Workout
              </Button>
            </div>
          </div>

          {/* Exercises */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">Recommended Exercises</h4>
            <div className="grid gap-3 sm:grid-cols-2">
              {workout.exercises?.map((ex, idx) => (
                <div
                  key={idx}
                  className="rounded-xl border border-slate-100 bg-slate-50/70 p-3.5 dark:border-slate-800/60 dark:bg-slate-800/40"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-sm">{ex.name}</span>
                    <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                      {ex.sets} sets × {ex.reps}
                    </span>
                  </div>
                  {ex.instructions && (
                    <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400">{ex.instructions}</p>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Safety Warning */}
          {workout.safetyTip && (
            <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-3 text-xs text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-200 flex items-start gap-2">
              <span className="text-sm">⚠️</span>
              <div>
                <strong>Exercise Safety Note:</strong> {workout.safetyTip}
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: NUTRITION */}
      {activeTab === 'nutrition' && nutrition && (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900/60 space-y-5">
          {/* Hydration Banner */}
          <div className="rounded-xl border border-sky-200 bg-sky-50 p-4 dark:border-sky-900/50 dark:bg-sky-950/40 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-3xl">💧</span>
              <div>
                <h4 className="text-sm font-bold text-sky-900 dark:text-sky-200">Daily Hydration Goal</h4>
                <p className="text-xs text-sky-700 dark:text-sky-300">{nutrition.hydrationTip}</p>
              </div>
            </div>
            <span className="text-lg font-black text-sky-600 dark:text-sky-400">
              {nutrition.hydrationGoalLiters || 2.5} Liters
            </span>
          </div>

          {/* Goal alignment tip */}
          {nutrition.goalAlignmentTip && (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-3.5 text-xs text-emerald-900 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-200">
              <strong>💡 Goal Alignment Rationale:</strong> {nutrition.goalAlignmentTip}
            </div>
          )}

          {/* Meals */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">Simple Meal Ideas</h4>
            <div className="grid gap-3 sm:grid-cols-3">
              {nutrition.mealIdeas?.map((m, idx) => (
                <div key={idx} className="rounded-xl border border-slate-100 bg-slate-50/70 p-4 dark:border-slate-800/60 dark:bg-slate-800/40">
                  <div className="font-bold text-sm text-emerald-600 dark:text-emerald-400">{m.meal}</div>
                  <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">{m.description}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Healthy suggestions */}
          {nutrition.healthySuggestions?.length > 0 && (
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">Healthy Food Choice Suggestions</h4>
              <ul className="list-disc list-inside text-xs text-slate-600 space-y-1 dark:text-slate-300">
                {nutrition.healthySuggestions.map((s, idx) => (
                  <li key={idx}>{s}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* TAB 3: RECOVERY */}
      {activeTab === 'recovery' && recovery && (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900/60 space-y-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-xl border border-purple-200 bg-purple-50/60 p-4 dark:border-purple-900/40 dark:bg-purple-950/30 space-y-1">
              <span className="text-2xl">😴</span>
              <h4 className="font-bold text-sm text-purple-900 dark:text-purple-200">Rest & Sleep Recommendation</h4>
              <p className="text-xs text-purple-800 dark:text-purple-300">{recovery.restAdvice}</p>
              {recovery.sleepTip && <p className="text-xs text-purple-700 italic dark:text-purple-400 mt-2">"{recovery.sleepTip}"</p>}
            </div>

            <div className="rounded-xl border border-teal-200 bg-teal-50/60 p-4 dark:border-teal-900/40 dark:bg-teal-950/30 space-y-1">
              <span className="text-2xl">🌿</span>
              <h4 className="font-bold text-sm text-teal-900 dark:text-teal-200">Safe Wellness & Stress Relief</h4>
              <p className="text-xs text-teal-800 dark:text-teal-300">{recovery.wellnessAdvice}</p>
            </div>
          </div>

          {/* Stretching */}
          {recovery.stretchingRoutine?.length > 0 && (
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">Stretching & Recovery Routine</h4>
              <div className="flex flex-wrap gap-2">
                {recovery.stretchingRoutine.map((st, idx) => (
                  <span
                    key={idx}
                    className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                  >
                    🧘 {st}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 4: WEEKLY SUMMARY */}
      {activeTab === 'weekly' && weeklySummary && (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900/60 space-y-4">
          <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-4 dark:border-emerald-900/40 dark:bg-emerald-950/30">
            <h4 className="font-bold text-sm text-emerald-900 dark:text-emerald-200">Weekly Progress Overview</h4>
            <p className="mt-1 text-xs text-emerald-800 dark:text-emerald-300">{weeklySummary.summary}</p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 text-xs">
            <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-3.5 dark:border-slate-800/60 dark:bg-slate-800/40">
              <span className="font-bold text-slate-700 dark:text-slate-300">Activity Consistency:</span>
              <p className="mt-1 text-slate-600 dark:text-slate-400">{weeklySummary.consistencyAssessment}</p>
            </div>
            <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-3.5 dark:border-slate-800/60 dark:bg-slate-800/40">
              <span className="font-bold text-slate-700 dark:text-slate-300">Goal Assessment:</span>
              <p className="mt-1 text-slate-600 dark:text-slate-400">{weeklySummary.progressAssessment}</p>
            </div>
          </div>

          {weeklySummary.encouragement && (
            <div className="text-xs font-medium text-emerald-600 dark:text-emerald-400 italic">
              ✨ "{weeklySummary.encouragement}"
            </div>
          )}

          {weeklySummary.nextWeekSuggestions?.length > 0 && (
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">Suggestions for Next Week</h4>
              <ul className="list-disc list-inside text-xs text-slate-600 space-y-1 dark:text-slate-300">
                {weeklySummary.nextWeekSuggestions.map((s, idx) => (
                  <li key={idx}>{s}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
