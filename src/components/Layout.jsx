import { NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import ThemeToggle from './ThemeToggle'
import { Button } from './ui'

const navCls = ({ isActive }) =>
  `rounded-lg px-3 py-1.5 text-sm font-medium transition ${
    isActive
      ? 'bg-emerald-600/10 text-emerald-700 dark:text-emerald-400 font-semibold'
      : 'text-slate-600 hover:bg-slate-200/60 dark:text-slate-300 dark:hover:bg-slate-800'
  }`

export default function Layout() {
  const { signOut, profile, user } = useAuth()
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/80 backdrop-blur-md dark:border-slate-800 dark:bg-slate-900/70">
        <div className="mx-auto flex max-w-4xl items-center justify-between gap-2 px-4 py-3">
          <div className="flex items-center gap-1">
            <span className="mr-2 text-lg font-bold text-emerald-600">💪 FitBuddy</span>
            <NavLink to="/" end className={navCls}>Home</NavLink>
            <NavLink to="/progress" className={navCls}>Progress</NavLink>
            <NavLink to="/profile" className={navCls}>Profile</NavLink>
          </div>
          <div className="flex items-center gap-2">
            <span className="hidden text-xs font-medium text-slate-500 sm:inline dark:text-slate-400">
              {profile?.display_name || user?.email}
            </span>
            <ThemeToggle />
            <Button variant="ghost" onClick={signOut} className="text-xs py-1 px-2.5">
              Log out
            </Button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-4xl px-4 py-6">
        <Outlet />
      </main>
    </div>
  )
}
