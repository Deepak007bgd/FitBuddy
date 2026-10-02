import { useState } from 'react'
import { Alert, Button, Field, inputCls } from './ui'
import { WORKOUT_TYPES, localDateStr } from '../lib/workoutService'

export default function WorkoutModal({ isOpen, onClose, onSave, editingWorkout = null }) {
  if (!isOpen) return null

  const isEdit = Boolean(editingWorkout)
  const [type, setType] = useState(editingWorkout?.type || 'walking')
  const [customName, setCustomName] = useState(editingWorkout?.custom_name || '')
  const [durationMin, setDurationMin] = useState(editingWorkout?.duration_min ?? 30)
  const [distanceKm, setDistanceKm] = useState(editingWorkout?.distance_km ?? '')
  const [caloriesBurned, setCaloriesBurned] = useState(editingWorkout?.calories_burned ?? '')
  const [loggedOn, setLoggedOn] = useState(editingWorkout?.logged_on || localDateStr())
  const [notes, setNotes] = useState(editingWorkout?.notes || '')

  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  function validate() {
    if (!type) return 'Please select a workout type.'
    if (type === 'custom' && !customName.trim()) return 'Please provide a custom workout name.'
    const dur = Number(durationMin)
    if (!durationMin || Number.isNaN(dur) || dur <= 0) return 'Duration must be a positive number of minutes.'
    if (!loggedOn) return 'Please select a valid workout date.'
    if (distanceKm !== '' && (Number.isNaN(Number(distanceKm)) || Number(distanceKm) < 0)) {
      return 'Distance must be a non-negative number.'
    }
    if (caloriesBurned !== '' && (Number.isNaN(Number(caloriesBurned)) || Number(caloriesBurned) < 0)) {
      return 'Calories must be a non-negative number.'
    }
    return ''
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    const problem = validate()
    if (problem) return setError(problem)

    setSaving(true)
    try {
      await onSave({
        id: editingWorkout?.id,
        type,
        custom_name: customName,
        duration_min: Number(durationMin),
        distance_km: distanceKm !== '' ? Number(distanceKm) : null,
        calories_burned: caloriesBurned !== '' ? Number(caloriesBurned) : null,
        logged_on: loggedOn,
        notes,
      })
      onClose()
    } catch (err) {
      setError(err?.message || 'Failed to save workout.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 p-4 backdrop-blur-sm transition-all">
      <div className="flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-900">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/50 px-6 py-4 dark:border-slate-800/80 dark:bg-slate-900/40">
          <div className="flex items-center gap-2.5">
            <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-500/10 text-xl border border-emerald-500/20">
              {isEdit ? '✏️' : '💪'}
            </span>
            <div>
              <h2 className="text-lg font-bold">{isEdit ? 'Edit Workout Entry' : 'Log Workout Activity'}</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {isEdit ? 'Modify your workout session details' : 'Track your session & maintain your streak 🔥'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            type="button"
            className="rounded-xl p-2 text-slate-400 hover:bg-slate-200/60 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-200 transition cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Scrollable Form Content */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5">
          {error && <Alert kind="error">{error}</Alert>}

          {/* Visual Workout Type Picker Grid */}
          <div>
            <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-500">
              Select Workout Type
            </label>
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
              {WORKOUT_TYPES.map((t) => {
                const selected = type === t.value
                return (
                  <button
                    key={t.value}
                    type="button"
                    onClick={() => setType(t.value)}
                    className={`flex flex-col items-center justify-center rounded-2xl border p-3 text-center transition cursor-pointer ${
                      selected
                        ? 'border-emerald-500 bg-emerald-50/70 text-emerald-900 shadow-xs dark:border-emerald-500 dark:bg-emerald-950/40 dark:text-emerald-100 font-bold scale-[1.02]'
                        : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900/60 dark:text-slate-300 dark:hover:border-slate-700'
                    }`}
                  >
                    <span className="text-2xl mb-1">{t.icon}</span>
                    <span className="text-xs font-medium">{t.label}</span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Custom Name input if Custom selected */}
          {type === 'custom' && (
            <Field label="Custom Workout Name" id="custom_name">
              <input
                id="custom_name"
                type="text"
                placeholder="e.g. Pilates, HIIT Circuit, Rock Climbing..."
                className={inputCls}
                value={customName}
                onChange={(e) => setCustomName(e.target.value)}
              />
            </Field>
          )}

          {/* Duration & Preset Buttons */}
          <div className="space-y-2">
            <Field label="Duration (minutes)" id="duration_min">
              <div className="flex items-center gap-2">
                <input
                  id="duration_min"
                  type="number"
                  min="1"
                  step="1"
                  className={inputCls}
                  value={durationMin}
                  onChange={(e) => setDurationMin(e.target.value)}
                />
                <span className="text-xs font-bold text-slate-400">mins</span>
              </div>
            </Field>
            {/* Quick Duration Preset Pills */}
            <div className="flex items-center gap-1.5 pt-1">
              <span className="text-[11px] text-slate-400 mr-1">Quick:</span>
              {[15, 30, 45, 60, 90].map((mins) => (
                <button
                  key={mins}
                  type="button"
                  onClick={() => setDurationMin(mins)}
                  className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition cursor-pointer ${
                    Number(durationMin) === mins
                      ? 'bg-emerald-600 text-white'
                      : 'border border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300'
                  }`}
                >
                  {mins}m
                </button>
              ))}
            </div>
          </div>

          {/* Date Picker */}
          <Field label="Workout Date" id="logged_on">
            <input
              id="logged_on"
              type="date"
              className={inputCls}
              value={loggedOn}
              onChange={(e) => setLoggedOn(e.target.value)}
            />
          </Field>

          {/* Distance & Calories */}
          <div className="grid grid-cols-2 gap-4">
            <Field label="Distance (km / miles)" id="distance_km" hint="Optional">
              <input
                id="distance_km"
                type="number"
                step="0.1"
                min="0"
                placeholder="e.g. 5.0"
                className={inputCls}
                value={distanceKm}
                onChange={(e) => setDistanceKm(e.target.value)}
              />
            </Field>

            <Field label="Calories Burned (kcal)" id="calories_burned" hint="Optional">
              <input
                id="calories_burned"
                type="number"
                step="1"
                min="0"
                placeholder="e.g. 350"
                className={inputCls}
                value={caloriesBurned}
                onChange={(e) => setCaloriesBurned(e.target.value)}
              />
            </Field>
          </div>

          {/* Notes */}
          <Field label="Notes / Exercises Done" id="notes" hint="Optional">
            <textarea
              id="notes"
              rows="2"
              placeholder="e.g. Completed 3 sets of squats, felt energized!"
              className={inputCls}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </Field>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
            <Button variant="secondary" type="button" onClick={onClose} disabled={saving}>
              Cancel
            </Button>
            <Button
              variant="primary"
              type="submit"
              disabled={saving}
              className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 px-6 py-2.5 font-bold shadow-md"
            >
              {saving ? 'Saving Workout…' : isEdit ? 'Update Workout' : '💪 Save Workout'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
