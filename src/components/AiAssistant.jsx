import { useEffect, useRef, useState } from 'react'
import { Alert, Button, Spinner, inputCls } from './ui'
import { getChatHistory, sendChatMessage } from '../lib/aiService'

const PRESET_CHIPS = [
  '🥗 What should I eat after a heavy workout?',
  '🏋️ Suggest a quick 15-min core workout',
  '🧘 How do I relieve sore leg muscles?',
  '💧 How much water should I drink daily?',
]

export default function AiAssistant({ isOpen, onClose, userId, profile }) {
  if (!isOpen) return null

  const [messages, setMessages] = useState([])
  const [loadingHistory, setLoadingHistory] = useState(true)
  const [inputPrompt, setInputPrompt] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')
  const chatEndRef = useRef(null)

  useEffect(() => {
    let active = true
    if (userId) {
      getChatHistory(userId).then((list) => {
        if (active) {
          setMessages(list)
          setLoadingHistory(false)
        }
      })
    }
    return () => { active = false }
  }, [userId])

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, sending])

  async function handleSend(promptText) {
    const text = (promptText || inputPrompt).trim()
    if (!text || sending) return

    setInputPrompt('')
    setError('')
    setSending(true)

    // Optimistically add user message
    const tempUserMsg = { role: 'user', text, timestamp: new Date().toISOString() }
    const updatedLocally = [...messages, tempUserMsg]
    setMessages(updatedLocally)

    const res = await sendChatMessage(userId, profile, text, messages)
    setSending(false)

    if (res.error) {
      setError(res.error)
    } else {
      setMessages(res.newMessages)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
      <div className="flex h-[85vh] w-full max-w-xl flex-col rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-900">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/10 text-xl border border-emerald-500/20">
              🤖
            </span>
            <div>
              <h2 className="text-base font-bold">FitBuddy AI Assistant</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">Ask any workout, nutrition, or recovery question</p>
            </div>
          </div>
          <button
            onClick={onClose}
            type="button"
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-200"
          >
            ✕
          </button>
        </div>

        {/* Safety Disclaimer Banner */}
        <div className="border-b border-amber-200/50 bg-amber-50/70 px-6 py-2 text-[11px] text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-300">
          🛡️ <strong>Safety Disclaimer:</strong> FitBuddy AI provides general wellness guidance. It does not diagnose medical conditions. Consult a physician for medical advice.
        </div>

        {/* Message Log */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {loadingHistory ? (
            <Spinner label="Loading chat history…" />
          ) : messages.length === 0 ? (
            <div className="py-10 text-center">
              <div className="text-4xl mb-3">💬</div>
              <h3 className="text-sm font-semibold">Ask me anything about fitness!</h3>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                I can give you workout tips, meal ideas, or stretching advice tailored to your goals.
              </p>

              <div className="mt-6 flex flex-col gap-2">
                <span className="text-xs font-semibold text-slate-500">Try asking:</span>
                {PRESET_CHIPS.map((chip, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSend(chip)}
                    className="rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-xs text-slate-700 hover:border-emerald-500 hover:bg-emerald-50/50 text-left transition dark:border-slate-800 dark:bg-slate-800/60 dark:text-slate-200 dark:hover:border-emerald-500"
                  >
                    {chip}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            messages.map((m, idx) => (
              <div
                key={idx}
                className={`flex flex-col ${m.role === 'user' ? 'items-end' : 'items-start'}`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl px-4 py-3 text-xs leading-relaxed ${
                    m.role === 'user'
                      ? 'bg-emerald-600 text-white rounded-br-none'
                      : 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-100 rounded-bl-none border border-slate-200/50 dark:border-slate-700/50'
                  }`}
                >
                  <div className="whitespace-pre-wrap">{m.text}</div>
                </div>
                <span className="mt-1 text-[10px] text-slate-400">
                  {m.role === 'user' ? 'You' : 'FitBuddy AI'}
                </span>
              </div>
            ))
          )}

          {sending && (
            <div className="flex items-start gap-2">
              <div className="rounded-2xl rounded-bl-none bg-slate-100 px-4 py-3 text-xs dark:bg-slate-800">
                <span className="inline-flex items-center gap-1 text-slate-500 dark:text-slate-400">
                  <span className="h-2 w-2 animate-ping rounded-full bg-emerald-500" />
                  FitBuddy AI is thinking…
                </span>
              </div>
            </div>
          )}

          {error && <Alert kind="error">{error}</Alert>}
          <div ref={chatEndRef} />
        </div>

        {/* Input Footer */}
        <div className="border-t border-slate-200 p-4 dark:border-slate-800">
          <form
            onSubmit={(e) => {
              e.preventDefault()
              handleSend()
            }}
            className="flex items-center gap-2"
          >
            <input
              type="text"
              placeholder="Ask about workouts, meal prep, or recovery..."
              className={inputCls}
              value={inputPrompt}
              onChange={(e) => setInputPrompt(e.target.value)}
              disabled={sending}
            />
            <Button variant="primary" type="submit" disabled={sending || !inputPrompt.trim()}>
              Send
            </Button>
          </form>
        </div>
      </div>
    </div>
  )
}
