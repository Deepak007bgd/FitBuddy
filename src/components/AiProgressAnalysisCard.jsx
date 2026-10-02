import { Alert, Button, Spinner } from './ui'

export default function AiProgressAnalysisCard({ analysis, loading, error, onRefresh }) {
  if (loading) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-xs dark:border-slate-800 dark:bg-slate-900/60">
        <Spinner label="Generating your comprehensive AI progress analysis…" />
        <p className="mt-2 text-center text-xs text-slate-400">
          Evaluating weight logs, workout frequency, consistency trends, and target weight goals...
        </p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900/60">
        <Alert kind="error">{error}</Alert>
        <div className="mt-4 flex justify-center">
          <Button variant="outline" onClick={onRefresh}>
            🔄 Retry AI Progress Analysis
          </Button>
        </div>
      </div>
    )
  }

  if (!analysis) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-xs dark:border-slate-800 dark:bg-slate-900/60">
        <div className="text-4xl mb-3">📈</div>
        <h3 className="text-lg font-bold">AI Progress Analysis</h3>
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
          Get an intelligent evaluation of your workout consistency, weight progress, achievements, and next steps.
        </p>
        <Button variant="primary" className="mt-4 text-xs" onClick={onRefresh}>
          ✨ Generate AI Progress Analysis
        </Button>
      </div>
    )
  }

  const { summary, consistency, positiveAchievements, areasToImprove, nextSteps } = analysis

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900/60 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4 dark:border-slate-800">
        <div className="flex items-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-purple-500/10 text-xl border border-purple-500/20">
            📊
          </span>
          <div>
            <h3 className="text-lg font-bold">AI Progress Analysis</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Evaluated based on your history, streak, and target goal
            </p>
          </div>
        </div>

        <Button variant="ghost" className="text-xs py-1 px-2.5" onClick={onRefresh}>
          🔄 Re-analyze Progress
        </Button>
      </div>

      {/* Summary & Consistency */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-4 dark:border-slate-800/60 dark:bg-slate-800/40">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Progress Summary</h4>
          <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">{summary}</p>
        </div>

        <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-4 dark:border-slate-800/60 dark:bg-slate-800/40">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Consistency Observation</h4>
          <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">{consistency}</p>
        </div>
      </div>

      {/* Achievements & Improvements */}
      <div className="grid gap-4 sm:grid-cols-2 text-xs">
        {positiveAchievements?.length > 0 && (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-4 dark:border-emerald-900/40 dark:bg-emerald-950/20">
            <h4 className="font-bold text-emerald-800 dark:text-emerald-300 mb-2 flex items-center gap-1">
              <span>🌟</span> Positive Achievements
            </h4>
            <ul className="list-disc list-inside text-emerald-900 dark:text-emerald-200 space-y-1">
              {positiveAchievements.map((item, idx) => (
                <li key={idx}>{item}</li>
              ))}
            </ul>
          </div>
        )}

        {areasToImprove?.length > 0 && (
          <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-4 dark:border-amber-900/40 dark:bg-amber-950/20">
            <h4 className="font-bold text-amber-800 dark:text-amber-300 mb-2 flex items-center gap-1">
              <span>💡</span> Areas to Improve
            </h4>
            <ul className="list-disc list-inside text-amber-900 dark:text-amber-200 space-y-1">
              {areasToImprove.map((item, idx) => (
                <li key={idx}>{item}</li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Next steps */}
      {nextSteps?.length > 0 && (
        <div className="rounded-xl border border-sky-200 bg-sky-50/60 p-4 dark:border-sky-900/40 dark:bg-sky-950/20">
          <h4 className="font-bold text-xs uppercase tracking-wider text-sky-900 dark:text-sky-200 mb-2">
            🚀 Practical Next-Step Suggestions
          </h4>
          <div className="grid gap-2 sm:grid-cols-3">
            {nextSteps.map((step, idx) => (
              <div
                key={idx}
                className="rounded-lg border border-sky-200/60 bg-white p-3 text-xs text-sky-900 dark:border-sky-800 dark:bg-slate-900 dark:text-sky-200 shadow-2xs"
              >
                <span className="font-bold text-sky-600 dark:text-sky-400 mr-1.5">Step {idx + 1}:</span>
                {step}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
