import { useEffect, useRef, useState, type KeyboardEvent, type ReactNode } from 'react'
import { CheckIcon, ChevronDown } from './icons.tsx'

export interface DropdownOption<T> {
  value: T
  label: ReactNode
  /** Shown on the right, muted (a price, "Sold out") */
  detail?: ReactNode
  disabled?: boolean
}

interface DropdownProps<T> {
  value: T
  options: DropdownOption<T>[]
  onChange: (value: T) => void
  /** Names the menu for screen readers ("Sort by", "Size of Interlude M") */
  label: string
  /** What the button shows; the chevron is added after it */
  children: ReactNode
  buttonClassName: string
  /** Width and side, e.g. "right-0 w-60" */
  menuClassName: string
  chevronSize?: number
  /** As a form field: the button's id (for its label), an error state, and the id of its error message */
  id?: string
  invalid?: boolean
  describedBy?: string
}

/**
 * The shop's dropdown: a pill button opening a small white menu of choices, the chosen one burgundy with a check.
 * Escape, a click outside or a choice closes it; the arrow keys move between choices. It opens upwards when there
 * isn't room below inside the panel or page it sits in.
 */
export function Dropdown<T extends string | number>(props: DropdownProps<T>) {
  const { value, options, onChange, label, children, buttonClassName, menuClassName, chevronSize = 16 } = props
  const { id, invalid, describedBy } = props
  const [open, setOpen] = useState(false)
  const [up, setUp] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    // Start on the current choice, or the first when nothing is chosen yet
    const list = listRef.current
    ;(
      list?.querySelector<HTMLButtonElement>('[aria-checked="true"]') ??
      list?.querySelector<HTMLButtonElement>('button:not(:disabled)')
    )?.focus()
    const onDown = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('pointerdown', onDown)
    return () => document.removeEventListener('pointerdown', onDown)
  }, [open])

  const toggle = () => {
    const button = buttonRef.current
    if (!open && button) {
      const below = scrollBottom(button) - button.getBoundingClientRect().bottom
      setUp(below < options.length * 44 + 24)
    }
    setOpen((o) => !o)
  }
  const close = () => {
    setOpen(false)
    buttonRef.current?.focus()
  }

  // Handled here rather than on the window, so Escape closes only the menu, not the bag it sits in
  const onKeyDown = (e: KeyboardEvent) => {
    if (!open) return
    if (e.key === 'Escape') {
      e.stopPropagation()
      close()
    }
    if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return
    e.preventDefault()
    const items = [...(listRef.current?.querySelectorAll<HTMLButtonElement>('button:not(:disabled)') ?? [])]
    const i = items.indexOf(document.activeElement as HTMLButtonElement)
    items[(i + (e.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length]?.focus()
  }

  return (
    <div ref={rootRef} onKeyDown={onKeyDown} data-no-drag className="relative">
      <button
        ref={buttonRef}
        id={id}
        type="button"
        aria-invalid={invalid || undefined}
        aria-describedby={describedBy}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={toggle}
        className={`${buttonClassName} transition-colors duration-150 hover:border-wine ${open ? 'border-wine' : invalid ? 'border-[#b42318]' : 'border-rose-line'}`}
      >
        {children}
        <ChevronDown
          size={chevronSize}
          className={`transition-transform duration-200 ease-out ${open ? 'rotate-180' : ''}`}
        />
      </button>
      {open && (
        <div
          ref={listRef}
          role="menu"
          aria-label={label}
          className={`absolute z-30 animate-menu-in rounded-[14px] border border-line bg-white p-1.5 shadow-[0_16px_40px_-12px_rgb(20_8_12/0.25)] ${up ? 'bottom-full mb-2' : 'top-full mt-2'} ${menuClassName}`}
        >
          {options.map((o) => {
            const on = o.value === value
            return (
              <button
                key={o.value}
                type="button"
                role="menuitemradio"
                aria-checked={on}
                disabled={o.disabled}
                onClick={() => {
                  if (!on) onChange(o.value)
                  close()
                }}
                className={`flex h-11 w-full items-center gap-2.5 rounded-[10px] px-3 text-left text-[15px] whitespace-nowrap transition-colors duration-150 outline-none focus-visible:bg-[#f6efe9] enabled:hover:bg-[#f6efe9] disabled:cursor-not-allowed disabled:opacity-45 ${on ? 'font-medium text-wine' : 'text-ink'}`}
              >
                <span className="flex-1">{o.label}</span>
                {o.detail !== undefined && (
                  <span className={`text-sm ${on ? 'text-wine' : 'text-muted'}`}>{o.detail}</span>
                )}
                <span className="w-4">{on && <CheckIcon size={16} />}</span>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

/** Where the nearest scrolling box (or the screen) ends, so the menu can open upwards near the bottom */
function scrollBottom(el: HTMLElement) {
  for (let p = el.parentElement; p; p = p.parentElement) {
    const overflowY = getComputedStyle(p).overflowY
    if (overflowY === 'auto' || overflowY === 'scroll') return p.getBoundingClientRect().bottom
  }
  return window.innerHeight
}
