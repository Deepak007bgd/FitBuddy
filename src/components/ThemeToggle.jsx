import { useState } from 'react'

export default function ThemeToggle() {
  const [dark, setDark] = useState(() => document.documentElement.classList.contains('dark'))
  function toggle() {
    const next = !dark
    document.documentElement.classList.toggle('dark', next)
    try { localStorage.setItem('fitbuddy-theme', next ? 'dark' : 'light') } catch { /* private mode */ }
    setDark(next)
  }
  return (
    <button onClick={toggle} aria-label="Toggle dark mode" className="rounded-lg px-2 py-1.5 text-lg hover:bg-slate-200/60 dark:hover:bg-slate-800">
      {dark ? '☀️' : '🌙'}
    </button>
  )
}
