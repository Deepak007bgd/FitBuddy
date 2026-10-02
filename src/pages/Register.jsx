import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { Alert, AuthShell, Button, Field, inputCls } from '../components/ui'

export default function Register() {
  const { signUp } = useAuth()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [busy, setBusy] = useState(false)

  async function onSubmit(e) {
    e.preventDefault()
    setError('')
    if (password.length < 8) return setError('Password must be at least 8 characters.')
    if (password !== confirm) return setError('Passwords do not match.')
    setBusy(true)
    const { data, error } = await signUp(email.trim(), password, name.trim())
    setBusy(false)
    if (error) return setError(error.message)
    // Supabase returns a user with no identities (and no error) when the email already exists.
    if (data.user && data.user.identities?.length === 0) return setError('An account with this email already exists. Try logging in.')
    // If email confirmation is on there is no session yet; otherwise PublicOnly redirects automatically.
    if (!data.session) setNotice('Check your email and click the confirmation link, then log in.')
  }

  return (
    <AuthShell title="Create your account" subtitle="Start tracking workouts and get AI-powered plans">
      {notice ? (
        <div className="space-y-4">
          <Alert kind="success">{notice}</Alert>
          <Link to="/login" className="block text-center text-sm font-medium text-emerald-600 hover:underline">Go to log in</Link>
        </div>
      ) : (
        <form onSubmit={onSubmit} className="space-y-4">
          {error && <Alert>{error}</Alert>}
          <Field label="Name" id="name">
            <input id="name" required autoComplete="name" className={inputCls} value={name} onChange={(e) => setName(e.target.value)} />
          </Field>
          <Field label="Email" id="email">
            <input id="email" type="email" required autoComplete="email" className={inputCls} value={email} onChange={(e) => setEmail(e.target.value)} />
          </Field>
          <Field label="Password" id="password" hint="At least 8 characters.">
            <input id="password" type="password" required autoComplete="new-password" className={inputCls} value={password} onChange={(e) => setPassword(e.target.value)} />
          </Field>
          <Field label="Confirm password" id="confirm">
            <input id="confirm" type="password" required autoComplete="new-password" className={inputCls} value={confirm} onChange={(e) => setConfirm(e.target.value)} />
          </Field>
          <Button type="submit" disabled={busy} className="w-full">{busy ? 'Creating account…' : 'Create account'}</Button>
          <p className="text-center text-sm text-slate-500 dark:text-slate-400">
            Already registered? <Link to="/login" className="font-medium text-emerald-600 hover:underline">Log in</Link>
          </p>
        </form>
      )}
    </AuthShell>
  )
}
