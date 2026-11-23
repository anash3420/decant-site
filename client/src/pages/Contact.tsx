import { useEffect, useId, useRef, useState, type FormEvent, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { sendMessage } from '../api/shop.ts'
import { Dropdown } from '../components/Dropdown.tsx'
import { PageHead } from '../components/PageHead.tsx'
import { ArrowRight, CheckIcon, CloseIcon } from '../components/icons.tsx'
import { site } from '../lib/content.ts'

const copy = site.contact
const f = copy.form
const MAX_FILES = 10
const MAX_MB = 10

type Field = 'name' | 'email' | 'subject' | 'message'

/** Contact us: the shop's details at the top, then a form (name, email, subject, message, attachments) */
export default function Contact() {
  useEffect(() => {
    document.title = `${copy.title} | ${site.shopName}`
    return () => {
      document.title = site.shopName
    }
  }, [])

  return (
    <div className="relative z-10 mx-auto max-w-[1440px] px-4 pt-6 pb-16 lg:px-12 lg:pt-9 lg:pb-24">
      <PageHead crumb={copy.title} kicker={copy.kicker} title={copy.title} lead={copy.lead} />

      <ul className="grid gap-2.5 sm:grid-cols-3 lg:gap-[18px]">
        <Card kicker={copy.cards.email.kicker} text={copy.cards.email.text}>
          <a href={`mailto:${site.email}`} className="break-all text-wine">
            <span className="link-line pb-0.5">{site.email}</span>
          </a>
        </Card>
        <Card kicker={copy.cards.place.kicker} text={copy.cards.place.text}>
          {site.location}
        </Card>
        <Card kicker={copy.cards.poured.kicker} text={copy.cards.poured.text}>
          <Link to={copy.cards.poured.to} className="inline-flex items-center gap-1.5 text-wine">
            <span className="link-line pb-0.5">{copy.cards.poured.link}</span>
            <ArrowRight size={16} />
          </Link>
        </Card>
      </ul>

      <ContactForm />
    </div>
  )
}

function Card({ kicker, text, children }: { kicker: string; text: string; children: ReactNode }) {
  return (
    <li className="rounded-2xl bg-white px-5 py-5 lg:px-7 lg:py-6">
      <p className="text-[13px] tracking-[0.14em] text-wine uppercase">{kicker}</p>
      <div className="mt-2 font-display text-xl leading-snug lg:text-[22px]">{children}</div>
      <p className="mt-1 text-sm text-muted">{text}</p>
    </li>
  )
}

function ContactForm() {
  const [values, setValues] = useState<Record<Field, string>>({ name: '', email: '', subject: '', message: '' })
  const [files, setFiles] = useState<File[]>([])
  const [fileError, setFileError] = useState('')
  // Errors show after the first try to send, then update as the visitor types
  const [tried, setTried] = useState(false)
  const [state, setState] = useState<'idle' | 'sending' | 'sent' | 'failed'>('idle')
  const fileRef = useRef<HTMLInputElement>(null)
  const formRef = useRef<HTMLFormElement>(null)

  const errors = validate(values)
  const shown = tried ? errors : {}
  const set = (field: Field, value: string) => setValues((v) => ({ ...v, [field]: value }))

  const addFiles = (picked: FileList | null) => {
    if (!picked) return
    const tooBig = [...picked].find((file) => file.size > MAX_MB * 1024 * 1024)
    // The same file picked twice is kept once
    const next = [...files, ...[...picked].filter((p) => p.size <= MAX_MB * 1024 * 1024)].filter(
      (file, i, all) => all.findIndex((o) => o.name === file.name && o.size === file.size) === i,
    )
    setFileError(
      tooBig
        ? f.errors.tooBig.replace('{name}', tooBig.name).replace('{mb}', String(MAX_MB))
        : next.length > MAX_FILES
          ? f.errors.tooMany.replace('{max}', String(MAX_FILES))
          : '',
    )
    setFiles(next.slice(0, MAX_FILES))
  }

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setTried(true)
    if (Object.keys(errors).length > 0) {
      // Take the visitor to the first field that needs attention, once the errors are on screen
      requestAnimationFrame(() => formRef.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus())
      return
    }
    setState('sending')
    try {
      await sendMessage({ ...values, name: values.name.trim(), email: values.email.trim(), files })
      setState('sent')
    } catch {
      setState('failed')
    }
  }

  const reset = () => {
    setValues({ name: '', email: '', subject: '', message: '' })
    setFiles([])
    setFileError('')
    setTried(false)
    setState('idle')
  }

  return (
    <section
      aria-labelledby="contact-form-title"
      className="mt-6 rounded-2xl bg-white lg:mt-10 lg:max-w-[820px] lg:rounded-[18px]"
    >
      <h2
        id="contact-form-title"
        className="border-b border-line px-5 py-5 font-display text-[26px] leading-tight lg:px-10 lg:py-7 lg:text-[34px]"
      >
        {f.title}
      </h2>

      {state === 'sent' ? (
        <div role="status" className="flex flex-col items-center gap-3 px-6 py-14 text-center lg:py-20">
          <span className="flex size-14 items-center justify-center rounded-full bg-wine text-white">
            <CheckIcon size={24} />
          </span>
          <p className="font-display text-2xl">{f.sent.title}</p>
          <p className="max-w-[36ch] text-muted">{f.sent.text.replace('{email}', values.email.trim())}</p>
          <button type="button" onClick={reset} className="mt-2 min-h-11 text-[15px] text-wine">
            <span className="link-line pb-0.5">{f.sent.again}</span>
          </button>
        </div>
      ) : (
        <form
          ref={formRef}
          noValidate
          onSubmit={submit}
          className="flex flex-col gap-6 px-5 py-6 lg:gap-7 lg:px-10 lg:py-9"
        >
          <Input
            field="name"
            label={f.name.label}
            hint={f.name.hint}
            autoComplete="name"
            values={values}
            set={set}
            error={shown.name}
          />
          <Input
            field="email"
            label={f.email.label}
            hint={f.email.hint}
            type="email"
            autoComplete="email"
            values={values}
            set={set}
            error={shown.email}
          />

          <Labelled label={f.subject.label} error={shown.subject}>
            {(id, describedBy) => (
              <Dropdown
                id={id}
                invalid={!!shown.subject}
                describedBy={describedBy}
                value={values.subject}
                options={f.subject.options.map((o) => ({ value: o, label: o }))}
                onChange={(v) => set('subject', v)}
                label={f.subject.label}
                buttonClassName="flex h-12 w-full items-center justify-between gap-3 rounded-xl border bg-white px-4 text-left text-base"
                menuClassName="inset-x-0"
              >
                <span className={values.subject ? '' : 'text-muted'}>{values.subject || f.subject.placeholder}</span>
              </Dropdown>
            )}
          </Labelled>

          <Labelled label={f.message.label} error={shown.message}>
            {(id, describedBy) => (
              <textarea
                id={id}
                value={values.message}
                onChange={(e) => set('message', e.target.value)}
                aria-invalid={!!shown.message || undefined}
                aria-describedby={describedBy}
                rows={6}
                className={`${fieldClass(!!shown.message)} min-h-36 resize-y py-3`}
              />
            )}
          </Labelled>

          <div>
            <input
              ref={fileRef}
              type="file"
              multiple
              className="sr-only"
              tabIndex={-1}
              aria-hidden="true"
              onChange={(e) => {
                addFiles(e.target.files)
                e.target.value = ''
              }}
            />
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={files.length >= MAX_FILES}
              aria-describedby="contact-files-hint"
              className="flex h-16 w-full items-center justify-center gap-2.5 rounded-xl border border-dashed border-rose-line bg-[#faf7f3] text-base font-medium transition-colors duration-150 hover:border-wine hover:text-wine disabled:cursor-not-allowed disabled:opacity-50"
            >
              <PaperclipIcon />
              {f.files.button}
            </button>
            <p id="contact-files-hint" className="mt-2 text-sm text-muted">
              {f.files.hint.replace('{max}', String(MAX_FILES)).replace('{mb}', String(MAX_MB))}
            </p>
            {fileError && (
              <p role="alert" className="mt-1.5 text-sm text-[#b42318]">
                {fileError}
              </p>
            )}
            {files.length > 0 && (
              <ul className="mt-3 flex flex-col gap-1.5">
                {files.map((file) => (
                  <li
                    key={file.name + file.size}
                    className="flex items-center gap-3 rounded-lg border border-line py-1 pr-1 pl-3 text-sm"
                  >
                    <span className="min-w-0 flex-1 truncate">{file.name}</span>
                    <span className="text-muted tabular-nums">{formatSize(file.size)}</span>
                    <button
                      type="button"
                      aria-label={`${f.files.remove} ${file.name}`}
                      onClick={() => {
                        setFiles((all) => all.filter((o) => o !== file))
                        setFileError('')
                      }}
                      className="flex size-10 items-center justify-center text-muted hover:text-wine"
                    >
                      <CloseIcon size={16} />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {state === 'failed' && (
            <p role="alert" className="text-sm text-[#b42318]">
              {f.errors.send.replace('{email}', site.email)}
            </p>
          )}
          <button
            type="submit"
            disabled={state === 'sending'}
            className="flex h-[52px] w-full items-center justify-center rounded-full bg-wine text-base font-medium text-white shadow-[0_8px_18px_rgb(109_31_51/0.22)] transition-[background-color,transform] duration-200 ease-out hover:bg-[#5a1829] active:scale-[0.98] disabled:opacity-70"
          >
            {state === 'sending' ? f.sending : f.send}
          </button>
        </form>
      )}
    </section>
  )
}

const fieldClass = (invalid: boolean) =>
  `block w-full rounded-xl border bg-white px-4 text-base transition-colors duration-150 outline-none focus:border-wine focus:ring-2 focus:ring-wine/15 ${invalid ? 'border-[#b42318]' : 'border-rose-line hover:border-wine/60'}`

/** A field's label (with the required mark), its hint, the field itself and its error */
function Labelled({
  label,
  hint,
  error,
  children,
}: {
  label: string
  hint?: string
  error?: string
  children: (id: string, describedBy: string | undefined) => ReactNode
}) {
  const id = useId()
  const hintId = hint ? `${id}-hint` : undefined
  const errorId = error ? `${id}-error` : undefined
  const describedBy = [hintId, errorId].filter(Boolean).join(' ') || undefined
  return (
    <div>
      <label htmlFor={id} className="block text-base font-medium">
        {label}{' '}
        <span aria-hidden="true" className="text-wine">
          *
        </span>
      </label>
      {hint && (
        <p id={hintId} className="mt-0.5 text-sm text-muted">
          {hint}
        </p>
      )}
      <div className="mt-2">{children(id, describedBy)}</div>
      {error && (
        <p id={errorId} className="mt-1.5 text-sm text-[#b42318]">
          {error}
        </p>
      )}
    </div>
  )
}

function Input(props: {
  field: Field
  label: string
  hint: string
  type?: string
  autoComplete: string
  values: Record<Field, string>
  set: (field: Field, value: string) => void
  error?: string
}) {
  const { field, label, hint, type = 'text', autoComplete, values, set, error } = props
  return (
    <Labelled label={label} hint={hint} error={error}>
      {(id, describedBy) => (
        <input
          id={id}
          type={type}
          autoComplete={autoComplete}
          required
          value={values[field]}
          onChange={(e) => set(field, e.target.value)}
          aria-invalid={!!error || undefined}
          aria-describedby={describedBy}
          className={`${fieldClass(!!error)} h-12`}
        />
      )}
    </Labelled>
  )
}

function validate(v: Record<Field, string>) {
  const errors: Partial<Record<Field, string>> = {}
  if (!v.name.trim()) errors.name = f.errors.required
  if (!v.email.trim()) errors.email = f.errors.required
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.email.trim())) errors.email = f.errors.email
  if (!v.subject) errors.subject = f.errors.subject
  if (!v.message.trim()) errors.message = f.errors.required
  return errors
}

const formatSize = (bytes: number) =>
  bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))} KB` : `${(bytes / 1024 / 1024).toFixed(1)} MB`

function PaperclipIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="m21 11.5-8.6 8.6a5.5 5.5 0 0 1-7.8-7.8l8.6-8.6a3.7 3.7 0 0 1 5.2 5.2l-8.6 8.6a1.8 1.8 0 0 1-2.6-2.6l7.9-7.9" />
    </svg>
  )
}
