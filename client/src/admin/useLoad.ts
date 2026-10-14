import { useCallback, useEffect, useEffectEvent, useState } from 'react'
import { ApiError } from './api.ts'

interface Result<T> {
  /** Which request this result belongs to */
  key: string
  data?: T
  error?: ApiError
}

/**
 * Loads a page's data, and loads again whenever `key` changes (an id or the filters in the URL).
 * Previous data stays on screen while a reload is in flight, so lists don't flash empty.
 */
export function useLoad<T>(load: () => Promise<T>, key: string) {
  const [result, setResult] = useState<Result<T>>()
  const [attempt, setAttempt] = useState(0)
  const requestKey = `${key}#${attempt}`
  // Always calls the latest `load` without making it an effect dependency
  const runLoad = useEffectEvent(load)

  useEffect(() => {
    let live = true
    runLoad().then(
      (data) => live && setResult({ key: requestKey, data }),
      (e: unknown) =>
        live &&
        setResult((prev) => ({
          key: requestKey,
          data: prev?.data,
          error: e instanceof ApiError ? e : new ApiError(0, 'error', String(e)),
        })),
    )
    return () => {
      live = false
    }
  }, [requestKey])

  const setData = useCallback((data: T) => setResult((prev) => ({ key: prev?.key ?? '', ...prev, data })), [])
  const reload = useCallback(() => setAttempt((n) => n + 1), [])

  return {
    data: result?.data,
    setData,
    error: result?.key === requestKey ? result.error : undefined,
    loading: result?.key !== requestKey,
    reload,
  }
}
