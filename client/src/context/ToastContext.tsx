import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'

interface Toast {
  id: number
  title: string
  detail?: string
  action?: { label: string; to: string }
}

type ShowToast = (toast: Omit<Toast, 'id'>) => void

const ToastContext = createContext<ShowToast | null>(null)

const VISIBLE_MS = 3500
const EXIT_MS = 200

/** One toast at a time, bottom centre. A new toast replaces the current one. */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<Toast | null>(null)
  const [leaving, setLeaving] = useState(false)
  const timers = useRef<number[]>([])
  const hovered = useRef(false)

  const clearTimers = () => {
    timers.current.forEach(clearTimeout)
    timers.current = []
  }

  const dismiss = useCallback(() => {
    clearTimers()
    setLeaving(true)
    timers.current.push(window.setTimeout(() => setToast(null), EXIT_MS))
  }, [])

  const schedule = useCallback(() => {
    clearTimers()
    timers.current.push(window.setTimeout(() => !hovered.current && dismiss(), VISIBLE_MS))
  }, [dismiss])

  const show = useCallback<ShowToast>(
    (t) => {
      setToast({ ...t, id: Date.now() })
      setLeaving(false)
      schedule()
    },
    [schedule],
  )

  useEffect(() => clearTimers, [])

  return (
    <ToastContext.Provider value={show}>
      {children}
      {/* Live region stays mounted so screen readers announce each new toast */}
      <div
        aria-live="polite"
        className="pointer-events-none fixed inset-x-0 bottom-[var(--toast-offset,0px)] z-50 flex justify-center px-4 pb-[max(1.25rem,env(safe-area-inset-bottom))]"
      >
        {toast && (
          <div
            key={toast.id}
            role="status"
            onMouseEnter={() => {
              hovered.current = true
              clearTimers()
            }}
            onMouseLeave={() => {
              hovered.current = false
              schedule()
            }}
            className={`pointer-events-auto flex w-full max-w-md items-center gap-3 rounded-xl bg-text py-3 pr-2 pl-4 text-sm text-surface shadow-lg ${
              leaving ? 'animate-toast-out' : 'animate-toast-in'
            }`}
          >
            <span
              className="flex size-6 shrink-0 items-center justify-center rounded-full bg-instock"
              aria-hidden="true"
            >
              <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2.5" className="size-3.5">
                <path d="M5 10.5l3.2 3L15 6.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </span>
            <span className="min-w-0 flex-1">
              <span className="block font-medium">{toast.title}</span>
              {toast.detail && <span className="block truncate text-xs opacity-75">{toast.detail}</span>}
            </span>
            {toast.action && (
              <Link
                to={toast.action.to}
                onClick={dismiss}
                className="shrink-0 rounded-md px-3 py-1.5 font-medium whitespace-nowrap text-accent-soft underline-offset-4 hover:underline"
              >
                {toast.action.label}
              </Link>
            )}
            <button
              type="button"
              onClick={dismiss}
              aria-label="Dismiss"
              className="flex size-8 shrink-0 items-center justify-center rounded-md text-lg opacity-60 hover:opacity-100"
            >
              ×
            </button>
          </div>
        )}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used inside <ToastProvider>')
  return ctx
}
