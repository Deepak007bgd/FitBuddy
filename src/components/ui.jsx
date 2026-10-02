export const inputCls =
  'w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm outline-none transition ' +
  'focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/30 dark:border-slate-700 dark:bg-slate-900'

export function Spinner({ label = 'Loading…' }) {
  return (
    <div role="status" className="flex items-center justify-center gap-3 py-12 text-sm text-slate-500 dark:text-slate-400">
      <span className="h-5 w-5 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" />
      {label}
    </div>
  )
}

export function Alert({ kind = 'error', children }) {
  const styles = {
    error: 'border-red-200 bg-red-50 text-red-800 dark:border-red-900 dark:bg-red-950/50 dark:text-red-200',
    success: 'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/50 dark:text-emerald-200',
    warning: 'border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900 dark:bg-amber-950/50 dark:text-amber-200',
  }
  return <div role={kind === 'error' ? 'alert' : 'status'} className={`rounded-lg border px-4 py-3 text-sm ${styles[kind]}`}>{children}</div>
}

export function Field({ label, id, hint, children }) {
  return (
    <div>
      <label htmlFor={id} className="mb-1 block text-sm font-medium">{label}</label>
      {children}
      {hint && <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{hint}</p>}
    </div>
  )
}

export function Button({ variant = 'primary', className = '', ...props }) {
  const v = {
    primary: 'bg-emerald-600 text-white hover:bg-emerald-500 disabled:opacity-60',
    secondary: 'border border-slate-300 bg-white text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700 disabled:opacity-60',
    outline: 'border border-emerald-600 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 disabled:opacity-60',
    danger: 'bg-red-600 text-white hover:bg-red-500 disabled:opacity-60',
    ghost: 'text-slate-600 hover:bg-slate-200/60 dark:text-slate-300 dark:hover:bg-slate-800',
  }
  return (
    <button
      {...props}
      className={`inline-flex items-center justify-center rounded-lg px-4 py-2 text-sm font-semibold transition cursor-pointer disabled:cursor-not-allowed ${v[variant] || v.primary} ${className}`}
    />
  )
}

export function AuthShell({ title, subtitle, children }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-10 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <div className="w-full max-w-md">
        <div className="mb-6 text-center">
          <div className="text-2xl font-bold text-emerald-600">💪 FitBuddy</div>
          <h1 className="mt-4 text-xl font-semibold">{title}</h1>
          {subtitle && <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{subtitle}</p>}
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900/60">{children}</div>
      </div>
    </div>
  )
}
