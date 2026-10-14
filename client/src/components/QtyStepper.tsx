interface Props {
  value: number
  min?: number
  max: number
  onChange: (qty: number) => void
  label: string
}

const btn =
  'flex size-11 items-center justify-center text-lg text-muted transition-colors hover:text-text disabled:opacity-35 disabled:hover:text-muted'

export default function QtyStepper({ value, min = 1, max, onChange, label }: Props) {
  return (
    <div
      className="inline-flex items-center rounded-md border border-border bg-surface"
      role="group"
      aria-label={label}
    >
      <button
        type="button"
        className={btn}
        onClick={() => onChange(value - 1)}
        disabled={value <= min}
        aria-label="Decrease"
      >
        −
      </button>
      <span className="w-8 text-center text-sm tabular-nums" aria-live="polite">
        {value}
      </span>
      <button
        type="button"
        className={btn}
        onClick={() => onChange(value + 1)}
        disabled={value >= max}
        aria-label="Increase"
      >
        +
      </button>
    </div>
  )
}
