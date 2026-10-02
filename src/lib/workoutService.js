import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  query,
  updateDoc,
  where,
} from 'firebase/firestore'
import { db } from './firebase'

export const WORKOUT_TYPES = [
  { value: 'walking', label: 'Walking', icon: '🚶' },
  { value: 'running', label: 'Running', icon: '🏃' },
  { value: 'cycling', label: 'Cycling', icon: '🚴' },
  { value: 'strength', label: 'Strength Training', icon: '🏋️' },
  { value: 'yoga', label: 'Yoga', icon: '🧘' },
  { value: 'swimming', label: 'Swimming', icon: '🏊' },
  { value: 'custom', label: 'Custom', icon: '⚡' },
]

export const MILESTONES = [3, 7, 14, 30, 60, 100]

export const localDateStr = (date = new Date()) => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function formatWorkoutType(type, customName) {
  if (type === 'custom' && customName) return customName
  const match = WORKOUT_TYPES.find((t) => t.value === type)
  return match ? `${match.icon} ${match.label}` : type || 'Workout'
}

const getLocalWorkouts = (userId) => {
  try {
    const raw = localStorage.getItem(`fitbuddy_workouts_${userId}`)
    return raw ? JSON.parse(raw) : []
  } catch (e) {
    return []
  }
}

const saveLocalWorkouts = (userId, list) => {
  try {
    localStorage.setItem(`fitbuddy_workouts_${userId}`, JSON.stringify(list))
  } catch (e) {}
}

export async function getWorkouts(userId) {
  if (!userId) return []
  let remoteList = []
  try {
    const q = query(
      collection(db, 'workout_logs'),
      where('user_id', '==', userId)
    )
    const snap = await getDocs(q)
    remoteList = snap.docs.map((d) => ({ id: d.id, ...d.data() }))
  } catch (err) {
    console.warn('Firestore workout query failed (falling back to local cache):', err)
  }

  const localList = getLocalWorkouts(userId)
  const map = new Map()
  for (const item of [...remoteList, ...localList]) {
    map.set(item.id, item)
  }

  const combined = Array.from(map.values())
  combined.sort((a, b) => (b.logged_on || '').localeCompare(a.logged_on || '') || (b.created_at || '').localeCompare(a.created_at || ''))
  return combined
}

export async function addWorkout(userId, workoutData) {
  if (!userId) throw new Error('User not authenticated')
  const now = new Date().toISOString()
  const tempId = `local_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`

  const docData = {
    user_id: userId,
    type: workoutData.type || 'walking',
    custom_name: workoutData.type === 'custom' ? workoutData.custom_name.trim() : null,
    duration_min: Number(workoutData.duration_min) || 0,
    distance_km: workoutData.distance_km ? Number(workoutData.distance_km) : null,
    calories_burned: workoutData.calories_burned ? Number(workoutData.calories_burned) : null,
    logged_on: workoutData.logged_on || localDateStr(),
    notes: (workoutData.notes || '').trim() || null,
    created_at: now,
    updated_at: now,
  }

  let finalItem = { id: tempId, ...docData }

  try {
    const ref = await addDoc(collection(db, 'workout_logs'), docData)
    finalItem = { id: ref.id, ...docData }
  } catch (err) {
    console.warn('Firestore write failed (permission or network). Saved locally for seamless experience:', err)
  }

  const existingLocal = getLocalWorkouts(userId)
  saveLocalWorkouts(userId, [finalItem, ...existingLocal.filter((w) => w.id !== finalItem.id)])
  return finalItem
}

export async function updateWorkout(workoutId, workoutData, userId) {
  const changes = {
    type: workoutData.type,
    custom_name: workoutData.type === 'custom' ? workoutData.custom_name.trim() : null,
    duration_min: Number(workoutData.duration_min) || 0,
    distance_km: workoutData.distance_km ? Number(workoutData.distance_km) : null,
    calories_burned: workoutData.calories_burned ? Number(workoutData.calories_burned) : null,
    logged_on: workoutData.logged_on,
    notes: (workoutData.notes || '').trim() || null,
    updated_at: new Date().toISOString(),
  }

  if (workoutId && !workoutId.startsWith('local_')) {
    try {
      const ref = doc(db, 'workout_logs', workoutId)
      await updateDoc(ref, changes)
    } catch (err) {
      console.warn('Could not update Firestore document:', err)
    }
  }

  const targetUserId = userId || workoutData.user_id
  if (targetUserId) {
    const local = getLocalWorkouts(targetUserId)
    const updated = local.map((w) => (w.id === workoutId ? { ...w, ...changes } : w))
    saveLocalWorkouts(targetUserId, updated)
  }

  return changes
}

export async function deleteWorkout(workoutId, userId) {
  if (workoutId && !workoutId.startsWith('local_')) {
    try {
      const ref = doc(db, 'workout_logs', workoutId)
      await deleteDoc(ref)
    } catch (err) {
      console.warn('Could not delete from Firestore:', err)
    }
  }

  if (userId) {
    const local = getLocalWorkouts(userId)
    saveLocalWorkouts(
      userId,
      local.filter((w) => w.id !== workoutId)
    )
  }
}

export function calculateStreak(workouts = []) {
  if (!workouts || workouts.length === 0) {
    return {
      currentStreak: 0,
      longestStreak: 0,
      isLoggedToday: false,
      nextMilestone: 3,
      progressPercent: 0,
    }
  }

  const uniqueDates = Array.from(new Set(workouts.map((w) => w.logged_on))).sort().reverse()
  const today = localDateStr()
  const yesterdayDate = new Date()
  yesterdayDate.setDate(yesterdayDate.getDate() - 1)
  const yesterday = localDateStr(yesterdayDate)

  const isLoggedToday = uniqueDates.includes(today)

  let currentStreak = 0
  let checkDate = new Date()

  if (!isLoggedToday && !uniqueDates.includes(yesterday)) {
    currentStreak = 0
  } else {
    if (!isLoggedToday) {
      checkDate = yesterdayDate
    }

    while (true) {
      const dStr = localDateStr(checkDate)
      if (uniqueDates.includes(dStr)) {
        currentStreak++
        checkDate.setDate(checkDate.getDate() - 1)
      } else {
        break
      }
    }
  }

  let longestStreak = 0
  let tempStreak = 0
  let prevTimestamp = null

  const sortedAsc = Array.from(new Set(workouts.map((w) => w.logged_on))).sort()
  for (const dStr of sortedAsc) {
    const parts = dStr.split('-')
    const currentTimestamp = new Date(parts[0], parts[1] - 1, parts[2]).getTime()

    if (prevTimestamp === null) {
      tempStreak = 1
    } else {
      const diffDays = Math.round((currentTimestamp - prevTimestamp) / (1000 * 3600 * 24))
      if (diffDays === 1) {
        tempStreak++
      } else if (diffDays > 1) {
        tempStreak = 1
      }
    }
    prevTimestamp = currentTimestamp
    if (tempStreak > longestStreak) longestStreak = tempStreak
  }

  if (currentStreak > longestStreak) longestStreak = currentStreak

  const nextMilestone = MILESTONES.find((m) => m > currentStreak) || MILESTONES[MILESTONES.length - 1]
  const prevMilestoneIndex = MILESTONES.findIndex((m) => m > currentStreak) - 1
  const prevMilestone = prevMilestoneIndex >= 0 ? MILESTONES[prevMilestoneIndex] : 0

  const span = nextMilestone - prevMilestone
  const progress = currentStreak - prevMilestone
  const progressPercent = Math.min(100, Math.max(0, Math.round((progress / span) * 100)))

  return {
    currentStreak,
    longestStreak,
    isLoggedToday,
    nextMilestone,
    progressPercent,
  }
}

export function getTodaySummary(workouts = []) {
  const today = localDateStr()
  const todayWorkouts = workouts.filter((w) => w.logged_on === today)
  const totalDuration = todayWorkouts.reduce((acc, w) => acc + (Number(w.duration_min) || 0), 0)
  const totalCalories = todayWorkouts.reduce((acc, w) => acc + (Number(w.calories_burned) || 0), 0)
  const totalDistance = todayWorkouts.reduce((acc, w) => acc + (Number(w.distance_km) || 0), 0)

  return {
    count: todayWorkouts.length,
    totalDuration,
    totalCalories,
    totalDistance,
    workouts: todayWorkouts,
  }
}
