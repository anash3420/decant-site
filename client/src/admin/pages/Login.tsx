import { useState, type FormEvent } from 'react'
import { Navigate, useSearchParams } from 'react-router-dom'
import { SITE_NAME } from '../../config.ts'
import { ApiError } from '../api.ts'
import { useAdminAuth } from '../AuthContext.tsx'
import { Button, Field, inputClass } from '../ui.tsx'

export default function Login() {
  const { admin, login } = useAdminAuth()
  const [params] = useSearchParams()
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  // Only ever return to an admin page
  const next = params.get('next')?.startsWith('/admin') ? params.get('next')! : '/admin'
  if (admin) return <Navigate to={next} replace />

  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const data = new FormData(e.currentTarget)
    setBusy(true)
    setError('')
    try {
      await login(String(data.get('email')), String(data.get('password')))
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not log in.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="flex min-h-dvh items-center justify-center px-4 py-10">
      <form onSubmit={submit} className="w-full max-w-sm rounded-xl border border-border bg-surface p-6">
        <p className="text-sm text-muted">{SITE_NAME}</p>
        <h1 className="mt-1 text-3xl">Admin login</h1>
        <div className="mt-6 space-y-4">
          <Field label="Email">
            <input
              name="email"
              type="email"
              autoComplete="username"
              required
              autoCapitalize="off"
              className={inputClass}
            />
          </Field>
          <Field label="Password">
            <input name="password" type="password" autoComplete="current-password" required className={inputClass} />
          </Field>
        </div>
        {error && (
          <p role="alert" className="mt-4 rounded-md bg-error-soft px-3 py-2 text-sm font-medium text-error">
            {error}
          </p>
        )}
        <Button type="submit" busy={busy} className="mt-6 w-full">
          Log in
        </Button>
      </form>
    </main>
  )
}
