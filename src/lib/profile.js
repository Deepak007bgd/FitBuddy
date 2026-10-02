// Values mirror the CHECK constraints in the profiles table migration.
export const GOALS = [
  { value: 'weight_loss', label: 'Weight loss' },
  { value: 'muscle_gain', label: 'Muscle gain' },
  { value: 'general_fitness', label: 'General fitness' },
  { value: 'endurance', label: 'Endurance' },
  { value: 'flexibility', label: 'Flexibility' },
]

export const LEVELS = [
  { value: 'beginner', label: 'Beginner' },
  { value: 'intermediate', label: 'Intermediate' },
  { value: 'advanced', label: 'Advanced' },
]

export const WORKOUT_OPTIONS = [
  { value: 'walking', label: 'Walking' },
  { value: 'running', label: 'Running' },
  { value: 'cycling', label: 'Cycling' },
  { value: 'strength', label: 'Gym / strength' },
  { value: 'yoga', label: 'Yoga' },
  { value: 'swimming', label: 'Swimming' },
]

export const RANGES = {
  age: [13, 100],
  height_cm: [80, 250],
  weight_kg: [25, 400],
  target_weight_kg: [25, 400],
}

export function isProfileComplete(p) {
  return Boolean(
    p &&
      p.age != null &&
      p.height_cm != null &&
      p.weight_kg != null &&
      p.target_weight_kg != null &&
      p.goal &&
      p.fitness_level &&
      p.preferred_workouts?.length > 0,
  )
}

export const labelFor = (list, value) => list.find((o) => o.value === value)?.label ?? value
