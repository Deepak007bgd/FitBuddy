import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { Alert, AuthShell, Button, Field, inputCls } from '../components/ui'

export default function Login() {
  const { signIn } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function onSubmit(e) {
    e.preventDefault()
    setError('')
    setBusy(true)
    const { error } = await signIn(email.trim(), password)
    setBusy(false)
    if (error) setError(error.message) // on success PublicOnly redirects automatically
  }

  return (
    <AuthShell title="Welcome back" subtitle="Log in to continue your fitness journey">
      <form onSubmit={onSubmit} className="space-y-4">
        {error && <Alert>{error}</Alert>}
        <Field label="Email" id="email">
          <input id="email" type="email" required autoComplete="email" className={inputCls} value={email} onChange={(e) => setEmail(e.target.value)} />
        </Field>
        <Field label="Password" id="password">
          <input id="password" type="password" required autoComplete="current-password" className={inputCls} value={password} onChange={(e) => setPassword(e.target.value)} />
        </Field>
        <Button type="submit" disabled={busy} className="w-full">{busy ? 'Logging in…' : 'Log in'}</Button>
        <p className="text-center text-sm text-slate-500 dark:text-slate-400">
          New here? <Link to="/register" className="font-medium text-emerald-600 hover:underline">Create an account</Link>
        </p>
      </form>
    </AuthShell>
  )
}
