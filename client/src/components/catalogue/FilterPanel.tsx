import { useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import type { ShopListing } from '@shared/types.ts'
import {
  activeCount,
  isOn,
  SORTS,
  sortLabel,
  toggle,
  type Filters,
  type Group,
  type GroupKey,
  type SortValue,
} from '../../lib/filters.ts'
import { dimClass, slideClass } from '../../lib/overlay.ts'
import { useDragDismiss } from '../../lib/useDragDismiss.ts'
import { useModal } from '../../lib/useModal.ts'
import { Dropdown } from '../Dropdown.tsx'
import { CheckIcon, ChevronDown, CloseIcon } from '../icons.tsx'

/** Accords shown before "Show all N accords" */
const ACCORDS_SHOWN = { list: 8, tiles: 6 }

interface FilterPanelProps {
  open: boolean
  onClose: () => void
  groups: Record<GroupKey, Group>
  filters: Filters
  sort: SortValue
  onChange: (filters: Filters, sort: SortValue) => void
  /** Decants the current choices show, for "Show N decants" */
  resultCount: number
  catalog: ShopListing[]
  /** Leave out a group (the brand page has no House filter) */
  hide?: GroupKey[]
}

/**
 * Filter & Sort. On desktop a 440 px drawer from the left: Sort first, then Price, Accord and Size open, with Mood,
 * House, Type and Worn by collapsed. On phones a sheet from the bottom: accord tiles, then Price, Size and Mood
 * (Sort has its own button). Choices apply as they are made; "Show N decants" closes it.
 */
export function FilterPanel(props: FilterPanelProps) {
  const { open, onClose, groups, filters, sort, onChange, resultCount, catalog, hide = [] } = props
  const closeRef = useRef<HTMLButtonElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const dimRef = useRef<HTMLDivElement>(null)
  useModal(open, onClose, closeRef)
  // Phone: pull the sheet down by its handle or header to close it
  const drag = useDragDismiss(panelRef, { axis: 'y', onDismiss: onClose, dimRef, phoneOnly: true })

  const set = (key: GroupKey, value: string) => onChange(toggle(filters, key, value), sort)
  const shown = (key: GroupKey) => !hide.includes(key) && groups[key].options.length > 0
  const clear = () => onChange(Object.fromEntries(Object.keys(filters).map((k) => [k, []])) as unknown as Filters, sort)
  const any = activeCount(filters) > 0

  return createPortal(
    <>
      <div aria-hidden="true" onClick={onClose} ref={dimRef} className={dimClass(open)} />
      <div
        role="dialog"
        aria-modal="true"
        ref={panelRef}
        aria-labelledby="filter-title"
        inert={!open}
        className={`fixed inset-x-0 top-[120px] bottom-0 z-50 flex flex-col rounded-t-[20px] bg-[#fbf8f4] shadow-[0_-12px_40px_rgb(20_8_12/0.25)] lg:inset-y-0 lg:right-auto lg:left-0 lg:w-[440px] lg:rounded-none lg:shadow-[16px_0_48px_rgb(20_8_12/0.25)] ${slideClass(open)} ${open ? 'translate-0' : 'translate-y-full lg:-translate-x-full lg:translate-y-0'}`}
      >
        <div {...drag} className="touch-none lg:touch-auto">
          <span aria-hidden="true" className="mx-auto mt-2.5 block h-1 w-10 rounded-full bg-[#d6c9c0] lg:hidden" />
          <div className="flex items-center gap-3.5 border-b border-line py-2 pr-2 pl-5 lg:justify-between lg:border-ink lg:pt-[22px] lg:pr-5 lg:pb-[18px] lg:pl-8">
            <h2 id="filter-title" className="flex-1 font-display text-[26px] lg:text-3xl">
              <span className="lg:hidden">Filter</span>
              <span className="hidden lg:inline">Filter &amp; Sort</span>
            </h2>
            {any && (
              <button type="button" onClick={clear} className="min-h-11 text-[15px] text-wine lg:hidden">
                <span className="link-line pb-0.5">Clear all</span>
              </button>
            )}
            <button
              ref={closeRef}
              type="button"
              aria-label="Close filters"
              onClick={onClose}
              className="flex size-11 items-center justify-center transition-transform duration-[120ms] ease-out active:scale-95"
            >
              <CloseIcon />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto overscroll-contain px-5 lg:px-8">
          {/* Desktop: sort comes first in the drawer */}
          <Section title="Sort by" defaultOpen className="hidden lg:block">
            <div role="radiogroup" aria-label="Sort by">
              {SORTS.map((s) => (
                <Radio key={s.value} on={s.value === sort} onSelect={() => onChange(filters, s.value)}>
                  {s.label}
                </Radio>
              ))}
            </div>
          </Section>

          {/* Phone: accords as tiles with three bottles each */}
          {shown('accord') && (
            <div className="pt-4 pb-2 lg:hidden">
              <p className="mb-2.5 text-[15px] font-medium">Accord</p>
              <AccordTiles
                group={groups.accord}
                filters={filters}
                onToggle={(v) => set('accord', v)}
                catalog={catalog}
              />
            </div>
          )}

          {shown('price') && (
            <Section title="Price" defaultOpen>
              <Checks group={groups.price} filters={filters} onToggle={(v) => set('price', v)} />
            </Section>
          )}
          {shown('accord') && (
            <Section title="Accord" defaultOpen className="hidden lg:block">
              <Checks group={groups.accord} filters={filters} onToggle={(v) => set('accord', v)} limit />
            </Section>
          )}
          {shown('size') && (
            <Section title="Size" defaultOpen meta={groups.size.options.length}>
              <Checks group={groups.size} filters={filters} onToggle={(v) => set('size', v)} />
            </Section>
          )}
          {shown('mood') && (
            <Section title="Mood" meta={groups.mood.options.length}>
              <Checks group={groups.mood} filters={filters} onToggle={(v) => set('mood', v)} />
            </Section>
          )}
          {(['house', 'type', 'worn'] as const).map(
            (key) =>
              shown(key) && (
                <Section
                  key={key}
                  title={groups[key].title}
                  meta={groups[key].options.length}
                  className="hidden lg:block"
                >
                  <Checks group={groups[key]} filters={filters} onToggle={(v) => set(key, v)} />
                </Section>
              ),
          )}
        </div>

        <div className="flex items-center gap-5 border-t border-line px-4 pt-3 pb-[max(1.25rem,env(safe-area-inset-bottom))] lg:px-8 lg:pt-4 lg:pb-[22px]">
          {any && (
            <button
              type="button"
              onClick={clear}
              className="hidden min-h-11 text-[15px] whitespace-nowrap text-wine lg:block"
            >
              <span className="link-line pb-0.5">Clear all</span>
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            className="flex h-[52px] flex-1 items-center justify-center rounded-full bg-wine font-medium text-white transition-transform duration-150 ease-out active:scale-[0.98]"
          >
            {resultCount === 0 ? 'No decants match' : `Show ${resultCount} ${resultCount === 1 ? 'decant' : 'decants'}`}
          </button>
        </div>
      </div>
    </>,
    document.body,
  )
}

/** A group that opens and closes (grid-rows animation, so it eases to its height) */
function Section({
  title,
  meta,
  defaultOpen = false,
  className = '',
  children,
}: {
  title: string
  meta?: number
  defaultOpen?: boolean
  className?: string
  children: ReactNode
}) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <section className={`border-b border-line last:border-b-0 ${className}`}>
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className="flex h-14 w-full items-center gap-2.5 text-left"
      >
        <span className="flex-1 text-[15px] font-medium">{title}</span>
        {!open && meta !== undefined && <small className="text-[13px] text-muted">{meta}</small>}
        <ChevronDown size={18} className={`transition-transform duration-300 ease-out ${open ? 'rotate-180' : ''}`} />
      </button>
      <div
        className={`grid transition-[grid-template-rows] duration-300 ease-lux ${open ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}
      >
        <div className="overflow-hidden" inert={!open}>
          <div className="pb-4">{children}</div>
        </div>
      </div>
    </section>
  )
}

function Checks({
  group,
  filters,
  onToggle,
  limit,
}: {
  group: Group
  filters: Filters
  onToggle: (value: string) => void
  /** Show the first few, then "Show all N" */
  limit?: boolean
}) {
  const [all, setAll] = useState(false)
  const options = limit && !all ? group.options.slice(0, ACCORDS_SHOWN.list) : group.options
  return (
    <>
      <ul>
        {options.map((o) => {
          const on = isOn(filters, group.key, o.value)
          return (
            <li key={o.value}>
              <label className="flex min-h-11 cursor-pointer items-center gap-3 text-base lg:min-h-[38px] lg:text-[15px]">
                <input type="checkbox" checked={on} onChange={() => onToggle(o.value)} className="peer sr-only" />
                <span
                  aria-hidden="true"
                  className={`flex size-5 flex-none items-center justify-center rounded-md border-[1.5px] transition-colors duration-150 peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-wine ${on ? 'border-wine bg-wine text-white' : 'border-[#cdbfb6] bg-white'}`}
                >
                  {on && <CheckIcon size={14} strokeWidth={2.2} />}
                </span>
                <span className={`flex-1 ${on ? 'font-medium text-wine' : ''}`}>{o.label}</span>
                <small className="text-[13px] text-muted">{o.count}</small>
              </label>
            </li>
          )
        })}
      </ul>
      {limit && group.options.length > ACCORDS_SHOWN.list && (
        <button type="button" onClick={() => setAll((a) => !a)} className="mt-1 min-h-11 text-sm text-wine lg:min-h-0">
          <span className="link-line pb-0.5">{all ? 'Show fewer' : `Show all ${group.options.length} accords`}</span>
        </button>
      )}
    </>
  )
}

function Radio({ on, onSelect, children }: { on: boolean; onSelect: () => void; children: ReactNode }) {
  return (
    <label className="flex min-h-11 cursor-pointer items-center gap-3 text-base lg:min-h-[38px] lg:text-[15px]">
      <input type="radio" name="sort" checked={on} onChange={onSelect} className="peer sr-only" />
      <span
        aria-hidden="true"
        className={`size-5 flex-none rounded-full border-[1.5px] transition-[background-color,border-color,box-shadow] duration-150 peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-wine ${on ? 'border-wine bg-wine shadow-[inset_0_0_0_4px_#fff]' : 'border-[#cdbfb6] bg-white'}`}
      />
      <span className={on ? 'font-medium text-wine' : ''}>{children}</span>
    </label>
  )
}

/** Phone: two columns of accord tiles, each with three round bottle photos, its name and count */
function AccordTiles({
  group,
  filters,
  onToggle,
  catalog,
}: {
  group: Group
  filters: Filters
  onToggle: (value: string) => void
  catalog: ShopListing[]
}) {
  const [all, setAll] = useState(false)
  const options = all ? group.options : group.options.slice(0, ACCORDS_SHOWN.tiles)
  return (
    <>
      <div className="grid grid-cols-2 gap-2">
        {options.map((o) => {
          const on = isOn(filters, 'accord', o.value)
          const bottles = catalog
            .filter((l) => l.accords.includes(o.value))
            .slice(0, 3)
            .map((l) => l.photos?.[0]?.src)
            .filter(Boolean)
          return (
            <button
              key={o.value}
              type="button"
              aria-pressed={on}
              onClick={() => onToggle(o.value)}
              className={`flex min-h-[104px] flex-col items-start rounded-[14px] border p-3 text-left transition-transform duration-150 ease-out active:scale-[0.98] ${on ? 'burgundy border-transparent' : 'border-wine/12 bg-white/75'}`}
            >
              <span className="flex h-[34px]">
                {bottles.map((src) => (
                  <img
                    key={src}
                    src={src}
                    alt=""
                    loading="lazy"
                    className={`-mr-3 size-8 rounded-full border-2 bg-sand object-cover ${on ? 'border-[#7a2640]' : 'border-white'}`}
                  />
                ))}
              </span>
              <b className="mt-2 font-display text-lg leading-[1.1] font-normal">{o.label}</b>
              <small className={`text-[13px] ${on ? 'text-wine-soft' : 'text-muted'}`}>
                {o.count} {o.count === 1 ? 'decant' : 'decants'}
              </small>
            </button>
          )
        })}
      </div>
      {group.options.length > ACCORDS_SHOWN.tiles && (
        <button type="button" onClick={() => setAll((a) => !a)} className="mt-1 min-h-11 text-sm text-wine">
          <span className="link-line pb-0.5">{all ? 'Show fewer' : `Show all ${group.options.length} accords`}</span>
        </button>
      )}
    </>
  )
}

/** Phone: the sort choices in a small sheet from the bottom; picking one closes it */
export function SortSheet({
  open,
  onClose,
  sort,
  onSort,
}: {
  open: boolean
  onClose: () => void
  sort: SortValue
  onSort: (sort: SortValue) => void
}) {
  const closeRef = useRef<HTMLButtonElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const dimRef = useRef<HTMLDivElement>(null)
  useModal(open, onClose, closeRef)
  const drag = useDragDismiss(panelRef, { axis: 'y', onDismiss: onClose, dimRef })
  return createPortal(
    <div className="lg:hidden">
      <div aria-hidden="true" onClick={onClose} ref={dimRef} className={dimClass(open)} />
      <div
        role="dialog"
        aria-modal="true"
        ref={panelRef}
        aria-labelledby="sort-title"
        inert={!open}
        className={`fixed inset-x-0 bottom-0 z-50 rounded-t-[20px] bg-[#fbf8f4] px-5 pb-[max(1.5rem,env(safe-area-inset-bottom))] shadow-[0_-12px_40px_rgb(20_8_12/0.25)] ${slideClass(open)} ${open ? 'translate-y-0' : 'translate-y-full'}`}
      >
        <div {...drag} className="touch-none">
          <span aria-hidden="true" className="mx-auto mt-2.5 block h-1 w-10 rounded-full bg-[#d6c9c0]" />
          <div className="-mr-3 flex items-center border-b border-line py-1">
            <h2 id="sort-title" className="flex-1 font-display text-[26px]">
              Sort by
            </h2>
            <button
              ref={closeRef}
              type="button"
              aria-label="Close"
              onClick={onClose}
              className="flex size-11 items-center justify-center"
            >
              <CloseIcon />
            </button>
          </div>
        </div>
        <div role="radiogroup" aria-label="Sort by" className="pt-2">
          {SORTS.map((s) => (
            <Radio
              key={s.value}
              on={s.value === sort}
              onSelect={() => {
                onSort(s.value)
                onClose()
              }}
            >
              {s.label}
            </Radio>
          ))}
        </div>
      </div>
    </div>,
    document.body,
  )
}

/**
 * Desktop: "Sorted by newest first" as a dropdown. Opens a small menu under it; Escape, a click outside or a choice
 * closes it, and the arrow keys move between choices.
 */
export function SortMenu({ sort, onSort }: { sort: SortValue; onSort: (sort: SortValue) => void }) {
  return (
    <Dropdown
      value={sort}
      options={SORTS.map((s) => ({ value: s.value, label: s.label }))}
      onChange={onSort}
      label="Sort by"
      buttonClassName="flex h-11 items-center gap-2 rounded-full border bg-white px-[18px] text-sm whitespace-nowrap text-muted"
      menuClassName="right-0 w-60 origin-top-right"
    >
      Sorted by <b className="font-medium text-ink">{sortLabel(sort)}</b>
    </Dropdown>
  )
}
