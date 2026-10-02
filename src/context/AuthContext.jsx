import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  updateProfile as updateAuthProfile,
} from 'firebase/auth'
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore'
import { auth, db } from '../lib/firebase'

const AuthContext = createContext(null)

const PROFILE_NOT_FOUND = 'Profile not found. Try signing out and registering again.'

const AUTH_ERRORS = {
  'auth/email-already-in-use': 'An account with this email already exists. Try logging in.',
  'auth/invalid-email': 'Please enter a valid email address.',
  'auth/invalid-credential': 'Incorrect email or password.',
  'auth/user-not-found': 'Incorrect email or password.',
  'auth/wrong-password': 'Incorrect email or password.',
  'auth/weak-password': 'Password is too weak. Use at least 8 characters.',
  'auth/too-many-requests': 'Too many attempts. Please wait a moment and try again.',
  'auth/network-request-failed': 'Network error. Check your connection and try again.',
}
const authMessage = (err) => AUTH_ERRORS[err?.code] ?? 'Something went wrong. Please try again.'

function firestoreMessage(err) {
  if (err?.code === 'permission-denied') return 'Permission denied. Check your Firestore security rules.'
  if (err?.code === 'unavailable') return 'Network error. Check your connection and try again.'
  return err?.message || 'Something went wrong. Please try again.'
}

// Default profile document, used at registration and as a fallback if one is missing.
function newProfileDoc(user, displayName) {
  const now = new Date().toISOString()
  return {
    id: user.uid,
    email: user.email,
    display_name: displayName || user.displayName || null,
    age: null,
    height_cm: null,
    weight_kg: null,
    target_weight_kg: null,
    goal: null,
    fitness_level: null,
    preferred_workouts: [],
    created_at: now,
    updated_at: now,
  }
}

// Local calendar date (YYYY-MM-DD), not UTC.
const localDate = () => new Date().toLocaleDateString('en-CA')

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null)
  const [authLoading, setAuthLoading] = useState(true)
  // Tracks which user the profile belongs to, so guards never act on a stale/missing profile.
  const [profileState, setProfileState] = useState({ userId: null, data: null, error: null })
  // Held open while signUp creates the profile doc, so loadProfile never reads it too early.
  const signUpGate = useRef(null)

  // Session persistence: Firebase stores the session; onAuthStateChanged restores it on reload.
  useEffect(() => {
    return onAuthStateChanged(auth, (firebaseUser) => {
      setSession(firebaseUser ? { user: firebaseUser } : null)
      setAuthLoading(false)
    })
  }, [])

  const userId = session?.user?.uid ?? null

  const loadProfile = useCallback(async () => {
    if (!userId) return
    if (signUpGate.current) await signUpGate.current
    let data = null
    let err = null
    try {
      const ref = doc(db, 'profiles', userId)
      const snap = await getDoc(ref)
      if (snap.exists()) {
        data = snap.data()
      } else {
        // Account exists but has no profile document (e.g. registered before it was created): create it now.
        const created = newProfileDoc(auth.currentUser)
        await setDoc(ref, created)
        data = created
      }
    } catch (e) {
      err = firestoreMessage(e)
    }
    setProfileState({ userId, data, error: err })
  }, [userId])

  useEffect(() => {
    if (userId) loadProfile()
  }, [userId, loadProfile])

  const profileLoading = Boolean(userId) && profileState.userId !== userId
  const profile = profileState.userId === userId ? profileState.data : null
  const profileError = profileState.userId === userId ? profileState.error : null

  const retryProfile = useCallback(() => {
    setProfileState({ userId: null, data: null, error: null })
    loadProfile()
  }, [loadProfile])

  // Firestore rules guarantee this can only touch the signed-in user's own document.
  const updateProfile = useCallback(
    async (patch) => {
      if (!userId) return { error: 'You are not signed in.' }
      const prevWeight = profile?.weight_kg
      const changes = { ...patch, updated_at: new Date().toISOString() }
      try {
        await updateDoc(doc(db, 'profiles', userId), changes)
      } catch (e) {
        return { error: e?.code === 'not-found' ? PROFILE_NOT_FOUND : firestoreMessage(e) }
      }
      setProfileState({ userId, data: { ...profile, ...changes }, error: null })

      // Seed/maintain weight history when weight changes (one entry per day).
      if (patch.weight_kg != null && Number(prevWeight) !== Number(patch.weight_kg)) {
        const logged_on = localDate()
        try {
          await setDoc(doc(db, 'weight_logs', `${userId}_${logged_on}`), {
            user_id: userId,
            weight_kg: patch.weight_kg,
            logged_on,
          })
        } catch (e) {
          return { error: null, warning: `Profile saved, but weight history was not updated: ${firestoreMessage(e)}` }
        }
      }
      return { error: null }
    },
    [userId, profile],
  )

  const signIn = useCallback(async (email, password) => {
    try {
      const cred = await signInWithEmailAndPassword(auth, email, password)
      return { data: { user: cred.user, session: { user: cred.user } }, error: null }
    } catch (e) {
      return { data: { user: null, session: null }, error: { message: authMessage(e) } }
    }
  }, [])

  const signUp = useCallback(async (email, password, displayName) => {
    let release
    signUpGate.current = new Promise((resolve) => { release = resolve })
    try {
      const cred = await createUserWithEmailAndPassword(auth, email, password)
      try {
        if (displayName) await updateAuthProfile(cred.user, { displayName })
        await setDoc(doc(db, 'profiles', cred.user.uid), newProfileDoc(cred.user, displayName))
      } catch (e) {
        // Don't leave an account behind that has no profile document.
        await cred.user.delete().catch(() => {})
        return { data: { user: null, session: null }, error: { message: firestoreMessage(e) } }
      }
      return { data: { user: cred.user, session: { user: cred.user } }, error: null }
    } catch (e) {
      return { data: { user: null, session: null }, error: { message: authMessage(e) } }
    } finally {
      release()
      signUpGate.current = null
    }
  }, [])

  const signOut = useCallback(async () => {
    try {
      await firebaseSignOut(auth)
      return { error: null }
    } catch (e) {
      return { error: { message: authMessage(e) } }
    }
  }, [])

  const value = useMemo(
    () => ({
      session, user: session?.user ?? null, authLoading,
      profile, profileLoading, profileError, retryProfile, updateProfile,
      signIn, signUp, signOut,
    }),
    [session, authLoading, profile, profileLoading, profileError, retryProfile, updateProfile, signIn, signUp, signOut],
  )
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>')
  return ctx
}
