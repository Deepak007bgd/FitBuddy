import { collection, getDocs, query, where } from 'firebase/firestore'
import { db } from './firebase'
import { localDateStr } from './workoutService'

export async function getWeightLogs(userId) {
  if (!userId) return []
  try {
    const q = query(
      collection(db, 'weight_logs'),
      where('user_id', '==', userId)
    )
    const snap = await getDocs(q)
    const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }))
    list.sort((a, b) => (a.logged_on || '').localeCompare(b.logged_on || ''))
    return list
  } catch (err) {
    console.error('Error fetching weight logs:', err)
    return []
  }
}

export function filterByTimeRange(items = [], range = '30d', dateField = 'logged_on') {
  if (range === 'all') return items
  const now = new Date()
  let cutoffDays = 30
  if (range === '7d') cutoffDays = 7
  if (range === '3m') cutoffDays = 90

  const cutoffDate = new Date(now)
  cutoffDate.setDate(cutoffDate.getDate() - cutoffDays)
  const cutoffStr = localDateStr(cutoffDate)

  return items.filter((item) => (item[dateField] || '') >= cutoffStr)
}

export function computeProgressMetrics(profile, weightLogs = [], workoutLogs = [], range = '30d') {
  const filteredWorkouts = filterByTimeRange(workoutLogs, range, 'logged_on')
  const filteredWeights = filterByTimeRange(weightLogs, range, 'logged_on')

  // Calculate totals
  const totalDuration = filteredWorkouts.reduce((acc, w) => acc + (Number(w.duration_min) || 0), 0)
  const totalCalories = filteredWorkouts.reduce((acc, w) => acc + (Number(w.calories_burned) || 0), 0)
  const totalDistance = filteredWorkouts.reduce((acc, w) => acc + (Number(w.distance_km) || 0), 0)
  const workoutCount = filteredWorkouts.length
  const avgDuration = workoutCount > 0 ? Math.round(totalDuration / workoutCount) : 0

  // Workout type distribution
  const typeCounts = {}
  filteredWorkouts.forEach((w) => {
    const t = w.type || 'other'
    typeCounts[t] = (typeCounts[t] || 0) + 1
  })

  // Goal Progress Calculation
  const currentWeight = profile?.weight_kg || (filteredWeights.length > 0 ? filteredWeights[filteredWeights.length - 1].weight_kg : null)
  const targetWeight = profile?.target_weight_kg
  const initialWeight = weightLogs.length > 0 ? weightLogs[0].weight_kg : currentWeight

  let goalProgressPercent = 0
  let weightDelta = 0

  if (currentWeight && targetWeight && initialWeight) {
    const totalToChange = Math.abs(initialWeight - targetWeight)
    const currentChanged = Math.abs(initialWeight - currentWeight)
    weightDelta = Math.round((currentWeight - targetWeight) * 10) / 10

    if (totalToChange === 0) {
      goalProgressPercent = 100
    } else {
      goalProgressPercent = Math.min(100, Math.max(0, Math.round((currentChanged / totalToChange) * 100)))
    }
  }

  return {
    range,
    workoutCount,
    totalDuration,
    avgDuration,
    totalCalories,
    totalDistance: Math.round(totalDistance * 10) / 10,
    typeCounts,
    filteredWorkouts,
    filteredWeights,
    currentWeight,
    targetWeight,
    initialWeight,
    weightDelta,
    goalProgressPercent,
  }
}
