import { doc, getDoc, setDoc } from 'firebase/firestore'
import { db } from './firebase'
import { localDateStr } from './workoutService'

// In-memory guard to prevent concurrent identical requests this session
const inflightKeys = new Set()

function isQuotaError(msg = '') {
  const m = msg.toLowerCase()
  return m.includes('quota') || m.includes('rate limit') || m.includes('resource_exhausted') || m.includes('429')
}

// Only check Firestore cache; never auto-call Gemini.
export async function getExistingDailyPlan(userId) {
  if (!userId) return null
  const today = localDateStr()
  const planDocId = `${userId}_${today}`
  try {
    const snap = await getDoc(doc(db, 'ai_plans', planDocId))
    if (snap.exists()) return snap.data().plan ?? null
  } catch (e) {
    console.warn('Cache read error (ai_plans):', e)
  }
  return null
}

// Explicitly called only when user presses "Generate AI Plan".
// Returns { data, fromCache, error }
export async function generateDailyPlan(userId, profile, recentWorkouts = []) {
  if (!userId || !profile) return { data: null, error: 'User profile is missing.' }

  const today = localDateStr()
  const planDocId = `${userId}_${today}`
  const docRef = doc(db, 'ai_plans', planDocId)

  // Always check cache first before spending a quota request
  try {
    const snap = await getDoc(docRef)
    if (snap.exists()) {
      return { data: snap.data().plan, fromCache: true, error: null }
    }
  } catch (e) {
    console.warn('Cache read error (ai_plans):', e)
  }

  // Prevent duplicate in-flight requests for the same plan
  const key = `daily_${planDocId}`
  if (inflightKeys.has(key)) return { data: null, error: 'A generation request is already in progress.' }
  inflightKeys.add(key)

  try {
    const res = await fetch('/api/ai/daily-plan', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ profile, recentWorkouts }),
    })

    const body = await res.json()

    if (!res.ok || body.error) {
      const msg = body.error || 'Failed to generate AI daily plan.'
      if (isQuotaError(msg) || res.status === 429) {
        return { data: null, error: 'AI usage limit reached. Please try again later.' }
      }
      return { data: null, error: msg }
    }

    const generatedPlan = body.data

    // Cache successful result in Firestore
    try {
      await setDoc(docRef, {
        user_id: userId,
        date: today,
        plan: generatedPlan,
        created_at: new Date().toISOString(),
      })
    } catch (e) {
      console.warn('Could not cache AI plan in Firestore:', e)
    }

    return { data: generatedPlan, fromCache: false, error: null }
  } catch (err) {
    const msg = err?.message || 'Network error connecting to AI service.'
    if (isQuotaError(msg)) return { data: null, error: 'AI usage limit reached. Please try again later.' }
    return { data: null, error: msg }
  } finally {
    inflightKeys.delete(key)
  }
}

// Only check Firestore cache; never auto-call Gemini.
export async function getExistingProgressAnalysis(userId) {
  if (!userId) return null
  try {
    const snap = await getDoc(doc(db, 'ai_progress_analyses', userId))
    if (snap.exists()) return snap.data().analysis ?? null
  } catch (e) {
    console.warn('Cache read error (ai_progress_analyses):', e)
  }
  return null
}

// Explicitly called only when user presses "Analyze Progress".
// Returns { data, fromCache, error }
export async function generateProgressAnalysis(userId, profile, recentWorkouts = [], weightLogs = [], streakInfo = {}, forceRefresh = false) {
  if (!userId || !profile) return { data: null, error: 'User profile is missing.' }

  const docRef = doc(db, 'ai_progress_analyses', userId)

  // Check cache first, unless the user explicitly asked to re-analyze
  if (!forceRefresh) {
    try {
      const snap = await getDoc(docRef)
      if (snap.exists()) {
        return { data: snap.data().analysis, fromCache: true, error: null }
      }
    } catch (e) {
      console.warn('Cache read error (ai_progress_analyses):', e)
    }
  }

  const key = `analysis_${userId}`
  if (inflightKeys.has(key)) return { data: null, error: 'A generation request is already in progress.' }
  inflightKeys.add(key)

  try {
    const res = await fetch('/api/ai/progress-analysis', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ profile, recentWorkouts, weightLogs, streakInfo }),
    })

    const body = await res.json()

    if (!res.ok || body.error) {
      const msg = body.error || 'Failed to generate progress analysis.'
      if (isQuotaError(msg) || res.status === 429) {
        return { data: null, error: 'AI usage limit reached. Please try again later.' }
      }
      return { data: null, error: msg }
    }

    const analysis = body.data

    try {
      await setDoc(docRef, {
        user_id: userId,
        analysis,
        created_at: new Date().toISOString(),
      })
    } catch (e) {
      console.warn('Could not cache AI analysis in Firestore:', e)
    }

    return { data: analysis, fromCache: false, error: null }
  } catch (err) {
    const msg = err?.message || 'Network error connecting to AI service.'
    if (isQuotaError(msg)) return { data: null, error: 'AI usage limit reached. Please try again later.' }
    return { data: null, error: msg }
  } finally {
    inflightKeys.delete(key)
  }
}

// Used by the Progress page.
// forceRefresh=false (page load): read the Firestore cache only, never call Gemini.
// forceRefresh=true (user pressed Generate / Re-analyze): call Gemini and overwrite the cache.
// Returns { data, fromCache, error } — data is null when nothing is cached yet.
export async function fetchOrGenerateProgressAnalysis(userId, profile, recentWorkouts = [], weightLogs = [], streakInfo = {}, forceRefresh = false) {
  if (!forceRefresh) {
    const cached = await getExistingProgressAnalysis(userId)
    return { data: cached, fromCache: Boolean(cached), error: null }
  }
  return generateProgressAnalysis(userId, profile, recentWorkouts, weightLogs, streakInfo, true)
}

export async function getChatHistory(userId) {
  if (!userId) return []
  try {
    const snap = await getDoc(doc(db, 'ai_chats', userId))
    if (snap.exists()) return snap.data().messages || []
  } catch (e) {
    console.warn('Error reading chat history:', e)
  }
  return []
}

export async function sendChatMessage(userId, profile, userPrompt, existingMessages = []) {
  if (!userId || !userPrompt) return { error: 'Prompt is required.' }

  const key = `chat_${userId}`
  if (inflightKeys.has(key)) return { error: 'Please wait for the previous message to complete.' }
  inflightKeys.add(key)

  try {
    const res = await fetch('/api/ai/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: existingMessages, profile, userPrompt }),
    })

    const body = await res.json()

    if (!res.ok || body.error) {
      const msg = body.error || 'AI Assistant is currently unavailable.'
      if (isQuotaError(msg) || res.status === 429) {
        return { error: 'AI usage limit reached. Please try again later.' }
      }
      return { error: msg }
    }

    const reply = body.reply
    const newMessages = [
      ...existingMessages,
      { role: 'user', text: userPrompt, timestamp: new Date().toISOString() },
      { role: 'model', text: reply, timestamp: new Date().toISOString() },
    ]

    try {
      await setDoc(doc(db, 'ai_chats', userId), {
        user_id: userId,
        messages: newMessages,
        updated_at: new Date().toISOString(),
      })
    } catch (e) {
      console.warn('Could not save chat history to Firestore:', e)
    }

    return { reply, newMessages, error: null }
  } catch (err) {
    const msg = err?.message || 'Network error reaching AI Assistant.'
    if (isQuotaError(msg)) return { error: 'AI usage limit reached. Please try again later.' }
    return { error: msg }
  } finally {
    inflightKeys.delete(key)
  }
}