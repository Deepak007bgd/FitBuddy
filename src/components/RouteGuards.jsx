import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { isProfileComplete } from '../lib/profile'
import { Alert, Button, Spinner } from './ui'

// Signed-out users go to /login (remembering where they were headed).
export function RequireAuth() {
  const { session, authLoading } = useAuth()
  const location = useLocation()
  if (authLoading) return <Spinner label="Checking session…" />
  if (!session) return <Navigate to="/login" replace state={{ from: location }} />
  return <Outlet />
}

// Signed-in users skip the login/register pages.
export function PublicOnly() {
  const { session, authLoading } = useAuth()
  const location = useLocation()
  if (authLoading) return <Spinner label="Checking session…" />
  if (session) return <Navigate to={location.state?.from?.pathname || '/'} replace />
  return <Outlet />
}

// Users must finish profile setup before reaching the main app.
export function RequireProfile() {
  const { profile, profileLoading, profileError, retryProfile } = useAuth()
  if (profileLoading) return <Spinner label="Loading your profile…" />
  if (profileError)
    return (
      <div className="space-y-3">
        <Alert>{profileError}</Alert>
        <Button onClick={retryProfile}>Try again</Button>
      </div>
    )
  if (!isProfileComplete(profile)) return <Navigate to="/profile" replace />
  return <Outlet />
}
