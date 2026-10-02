import { useState } from 'react'
import { Button, Spinner } from './ui'
import { formatWorkoutType } from '../lib/workoutService'

export default function WorkoutHistoryModal({ isOpen, onClose, workouts, loading, onEdit, onDelete, onAddNew }) {
  if (!isOpen) return null

  const [filterType, setFilterType] = useState('all')
  const [deletingId, setDeletingId] = useState(null)

  const filtered = workouts.filter((w) => {
    if (filterType === 'all') return true
    return w.type === filterType
  })

  async function handleDelete(id) {
    if (!window.confirm('Are you sure you want to delete this workout entry?')) return
    setDeletingId(id)
    try {
      await onDelete(id)
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
      <div className="flex h-[85vh] w-full max-w-2xl flex-col rounded-2xl border border-slate-200 bg-white shadow-xl dark:border-slate-800 dark:bg-slate-900">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4 dark:border-slate-800">
          <div>
            <h2 className="text-xl font-bold">📋 Workout History</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {workouts.length} total workout session{workouts.length === 1 ? '' : 's'} recorded
            </p>
          </div>
          <button
            onClick={onClose}
            type="button"
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-200"
          >
            ✕
          </button>
        </div>

        {/* Filter bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 bg-slate-50/50 px-6 py-3 dark:border-slate-800/50 dark:bg-slate-900/30">
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-slate-500">Filter:</span>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs shadow-xs dark:border-slate-700 dark:bg-slate-800"
            >
              <option value="all">All Workouts</option>
              <option value="walking">Walking</option>
              <option value="running">Running</option>
              <option value="cycling">Cycling</option>
              <option value="strength">Strength Training</option>
              <option value="yoga">Yoga</option>
              <option value="swimming">Swimming</option>
              <option value="custom">Custom</option>
            </select>
          </div>
          <Button variant="primary" className="py-1 px-3 text-xs" onClick={() => { onClose(); onAddNew(); }}>
            + Log New Workout
          </Button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-3">
          {loading ? (
            <Spinner label="Loading your workout history…" />
          ) : filtered.length === 0 ? (
            <div className="py-16 text-center">
              <div className="text-4xl mb-3">🏋️‍♂️</div>
              <h3 className="text-base font-semibold">No workouts found</h3>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                {filterType === 'all'
                  ? 'Start your fitness journey by logging your first workout today!'
                  : `No ${filterType} sessions found in history.`}
              </p>
              <Button
                variant="outline"
                className="mt-4 text-xs"
                onClick={() => { onClose(); onAddNew(); }}
              >
                Log a Workout
              </Button>
            </div>
          ) : (
            filtered.map((w) => (
              <div
                key={w.id}
                className="flex items-start justify-between rounded-xl border border-slate-200 bg-white p-4 shadow-2xs transition hover:border-emerald-300 dark:border-slate-800 dark:bg-slate-900/60 dark:hover:border-emerald-700"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm">
                      {formatWorkoutType(w.type, w.custom_name)}
                    </span>
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                      {w.logged_on}
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
                    <span>⏱️ {w.duration_min} min</span>
                    {w.distance_km != null && <span>📍 {w.distance_km} km</span>}
                    {w.calories_burned != null && <span>🔥 {w.calories_burned} kcal</span>}
                  </div>
                  {w.notes && (
                    <p className="mt-1.5 text-xs text-slate-600 italic dark:text-slate-300">
                      "{w.notes}"
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => { onClose(); onEdit(w); }}
                    className="rounded-md p-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
                    title="Edit Workout"
                  >
                    ✏️ Edit
                  </button>
                  <button
                    onClick={() => handleDelete(w.id)}
                    disabled={deletingId === w.id}
                    className="rounded-md p-1.5 text-xs font-medium text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/40"
                    title="Delete Workout"
                  >
                    {deletingId === w.id ? 'Deleting…' : '🗑️ Delete'}
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
