import { Button } from './ui'

export default function MilestoneCelebrationModal({ milestone, onClose, onClaim }) {
  if (!milestone) return null

  function handleClaim() {
    onClaim(milestone.id)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/75 p-4 backdrop-blur-sm">
      <div className="relative overflow-hidden w-full max-w-md rounded-3xl border border-amber-300/50 bg-gradient-to-b from-amber-500/10 via-slate-900 to-slate-950 p-8 text-center shadow-2xl">
        
        {/* CSS Confetti Particles */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <span className="confetti-particle bg-amber-400 left-[10%] animation-delay-0" />
          <span className="confetti-particle bg-emerald-400 left-[25%] animation-delay-200" />
          <span className="confetti-particle bg-rose-400 left-[40%] animation-delay-400" />
          <span className="confetti-particle bg-sky-400 left-[55%] animation-delay-100" />
          <span className="confetti-particle bg-purple-400 left-[70%] animation-delay-300" />
          <span className="confetti-particle bg-yellow-300 left-[85%] animation-delay-500" />
        </div>

        {/* Milestone Icon */}
        <div className="relative mx-auto mb-4 flex h-24 w-24 items-center justify-center rounded-full bg-amber-500/20 text-6xl shadow-inner border border-amber-400/40 animate-bounce">
          {milestone.badge}
        </div>

        <h2 className="text-2xl font-extrabold text-white tracking-tight">
          🎉 Milestone Unlocked!
        </h2>
        <h3 className="mt-2 text-lg font-bold text-amber-400">
          {milestone.title}
        </h3>

        <p className="mt-3 text-sm text-slate-300 leading-relaxed">
          {milestone.description}
        </p>

        <div className="mt-4 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs italic text-amber-200">
          "{milestone.motivation}"
        </div>

        <div className="mt-6 flex justify-center">
          <Button
            variant="primary"
            className="w-full bg-gradient-to-r from-amber-500 to-emerald-500 py-3 text-base font-bold shadow-lg hover:from-amber-400 hover:to-emerald-400"
            onClick={handleClaim}
          >
            🏆 Claim Badge & Continue
          </Button>
        </div>

        <style>{`
          .confetti-particle {
            position: absolute;
            top: -20px;
            width: 10px;
            height: 10px;
            border-radius: 50%;
            opacity: 0.8;
            animation: confetti-fall 3s linear infinite;
          }
          .animation-delay-0 { animation-delay: 0s; }
          .animation-delay-100 { animation-delay: 0.3s; }
          .animation-delay-200 { animation-delay: 0.6s; }
          .animation-delay-300 { animation-delay: 0.9s; }
          .animation-delay-400 { animation-delay: 1.2s; }
          .animation-delay-500 { animation-delay: 1.5s; }

          @keyframes confetti-fall {
            0% {
              transform: translateY(0) rotate(0deg);
              opacity: 1;
            }
            100% {
              transform: translateY(400px) rotate(720deg);
              opacity: 0;
            }
          }
        `}</style>
      </div>
    </div>
  )
}
