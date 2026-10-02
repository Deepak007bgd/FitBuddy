import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { GOALS, LEVELS, RANGES, WORKOUT_OPTIONS, isProfileComplete } from '../lib/profile'
import { Alert, Button, Field, Spinner, inputCls } from '../components/ui'

const toForm = (p) => ({
  display_name: p?.display_name ?? '',
  age: p?.age ?? '',
  height_cm: p?.height_cm ?? '',
  weight_kg: p?.weight_kg ?? '',
  target_weight_kg: p?.target_weight_kg ?? '',
  goal: p?.goal ?? '',
  fitness_level: p?.fitness_level ?? '',
  preferred_workouts: p?.preferred_workouts ?? [],
})

const NUMBER_FIELDS = [
  { key: 'age', label: 'Age', unit: 'years', step: '1' },
  { key: 'height_cm', label: 'Height', unit: 'cm', step: '0.1' },
  { key: 'weight_kg', label: 'Current weight', unit: 'kg', step: '0.1' },
  { key: 'target_weight_kg', label: 'Target weight', unit: 'kg', step: '0.1' },
]

export default function Profile() {
  const { profile, profileLoading, profileError, retryProfile, updateProfile } = useAuth()
  const navigate = useNavigate()

  if (profileLoading) return <Spinner label="Loading your profile…" />
  if (profileError)
    return (
      <div className="space-y-3">
        <Alert>{profileError}</Alert>
        <Button onClick={retryProfile}>Try again</Button>
      </div>
    )
  return <ProfileForm profile={profile} isSetup={!isProfileComplete(profile)} updateProfile={updateProfile} onDone={() => navigate('/')} />
}

function ProfileForm({ profile, isSetup, updateProfile, onDone }) {
  const [form, setForm] = useState(() => toForm(profile))
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [warning, setWarning] = useState('')
  const [saved, setSaved] = useState(false)

  const set = (k, v) => { setSaved(false); setForm((f) => ({ ...f, [k]: v })) }
  const toggleWorkout = (v) =>
    set('preferred_workouts', form.preferred_workouts.includes(v) ? form.preferred_workouts.filter((x) => x !== v) : [...form.preferred_workouts, v])

  function validate() {
    for (const { key, label } of NUMBER_FIELDS) {
      const n = Number(form[key])
      const [min, max] = RANGES[key]
      if (form[key] === '' || Number.isNaN(n)) return `${label} is required.`
      if (n < min || n > max) return `${label} must be between ${min} and ${max}.`
    }
    if (!Number.isInteger(Number(form.age))) return 'Age must be a whole number.'
    if (!form.goal) return 'Please choose a fitness goal.'
    if (!form.fitness_level) return 'Please choose your fitness level.'
    if (form.preferred_workouts.length === 0) return 'Pick at least one preferred workout.'
    return ''
  }

  async function onSubmit(e) {
    e.preventDefault()
    setError(''); setWarning(''); setSaved(false)
    const problem = validate()
    if (problem) return setError(problem)
    setSaving(true)
    const result = await updateProfile({
      display_name: form.display_name.trim() || null,
      age: Number(form.age),
      height_cm: Number(form.height_cm),
      weight_kg: Number(form.weight_kg),
      target_weight_kg: Number(form.target_weight_kg),
      goal: form.goal,
      fitness_level: form.fitness_level,
      preferred_workouts: form.preferred_workouts,
    })
    setSaving(false)
    if (result.error) return setError(result.error)
    if (result.warning) setWarning(result.warning)
    else if (isSetup) return onDone()
    setSaved(true)
  }

  return (
    <div>
      <h1 className="text-2xl font-bold">{isSetup ? 'Set up your profile' : 'Your profile'}</h1>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
        {isSetup ? 'Tell us a bit about you so FitBuddy can personalise your plans.' : 'Keep this up to date for better recommendations.'}
      </p>

      <form onSubmit={onSubmit} className="mt-6 space-y-5 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900/60">
        {error && <Alert>{error}</Alert>}
        {warning && <Alert kind="warning">{warning}</Alert>}
        {saved && !warning && <Alert kind="success">Profile saved.</Alert>}

        <Field label="Display name" id="display_name">
          <input id="display_name" className={inputCls} value={form.display_name} onChange={(e) => set('display_name', e.target.value)} />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          {NUMBER_FIELDS.map(({ key, label, unit, step }) => (
            <Field key={key} label={`${label} (${unit})`} id={key}>
              <input id={key} type="number" inputMode="decimal" step={step} min={RANGES[key][0]} max={RANGES[key][1]} className={inputCls} value={form[key]} onChange={(e) => set(key, e.target.value)} />
            </Field>
          ))}
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Fitness goal" id="goal">
            <select id="goal" className={inputCls} value={form.goal} onChange={(e) => set('goal', e.target.value)}>
              <option value="">Select…</option>
              {GOALS.map((g) => <option key={g.value} value={g.value}>{g.label}</option>)}
            </select>
          </Field>
          <Field label="Fitness level" id="fitness_level">
            <select id="fitness_level" className={inputCls} value={form.fitness_level} onChange={(e) => set('fitness_level', e.target.value)}>
              <option value="">Select…</option>
              {LEVELS.map((l) => <option key={l.value} value={l.value}>{l.label}</option>)}
            </select>
          </Field>
        </div>

        <fieldset>
          <legend className="mb-2 text-sm font-medium">Preferred workouts</legend>
          <div className="flex flex-wrap gap-2">
            {WORKOUT_OPTIONS.map((w) => {
              const on = form.preferred_workouts.includes(w.value)
              return (
                <button key={w.value} type="button" aria-pressed={on} onClick={() => toggleWorkout(w.value)}
                  className={`rounded-full border px-3 py-1.5 text-sm transition ${on ? 'border-emerald-600 bg-emerald-600 text-white' : 'border-slate-300 hover:border-emerald-500 dark:border-slate-700'}`}>
                  {w.label}
                </button>
              )
            })}
          </div>
        </fieldset>

        <Button type="submit" disabled={saving}>{saving ? 'Saving…' : isSetup ? 'Save and continue' : 'Save changes'}</Button>
      </form>
    </div>
  )
}
