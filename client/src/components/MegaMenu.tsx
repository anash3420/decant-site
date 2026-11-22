import { memo, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
// Hardcoded for now (generated from the mock catalogue); fetched from the API later
import menus from '../data/mock/menus.json'
import { formatPrice } from '@shared/stock.ts'
import { housePath, productPath } from '../lib/catalog.ts'
import { Photo } from './Photo.tsx'
import { ArrowRight } from './icons.tsx'

export type MenuKey = 'new' | 'decants' | 'fragrances' | 'houses'

type Item = { label: string; count?: number; to: string }
type Img = { src: string; width: number; height: number }

/** The panel for one nav item. Desktop only; rendered under the header while that item is hovered or focused. */
export function MegaMenu({ menu }: { menu: MenuKey }) {
  return (
    <div className="animate-menu-in shadow-[0_30px_60px_-20px_rgb(20_8_12/0.45)]">
      {/* Keyed, so moving from one menu to the next fades the new content in */}
      <div key={menu} className="animate-[fade-in_180ms_ease-out_both]">
        {menu === 'new' && <NewInMenu />}
        {menu === 'houses' && <HousesMenu />}
        {menu === 'decants' && <DecantsMenu />}
        {menu === 'fragrances' && <FragrancesMenu />}
      </div>
    </div>
  )
}

/* ── New in ("Arrivals wall"): the newest arrival large, the next two as cards, then a burgundy "Shop all" tile.
   Every photo is designed art, never the listing photo. ── */

const NewInMenu = memo(function NewInMenu() {
  const { newIn } = menus
  const [first, ...rest] = newIn.items
  return (
    <div className="grid grid-cols-[2fr_1fr_1fr_1fr] gap-3.5 border-t border-line bg-white px-12 pt-9 pb-10">
      {first && (
        <Tile to={productPath(first.slug)} photo={first.art.wide} label={`${first.house} ${first.name}`}>
          <span className="absolute inset-x-7 bottom-[26px] text-white">
            <span className="flex items-center gap-2.5 text-xs tracking-[0.16em] text-gold uppercase">
              Newest arrival
              <i aria-hidden="true" className="block h-px w-11 bg-gold" />
            </span>
            <b className="mt-2 mb-1.5 block font-display text-[40px] leading-[1.05] font-normal">
              {first.house} {first.name}
            </b>
            <span className="flex items-center gap-1.5 text-[15px]">
              From {formatPrice(first.price)} for {first.sizeMl} ml · Discover <ArrowRight size={14} />
            </span>
          </span>
        </Tile>
      )}
      {rest.slice(0, 2).map((item) => (
        <Link key={item.slug} to={productPath(item.slug)} className="group block">
          <span className="relative block h-[300px] overflow-hidden rounded-[14px]">
            <Photo
              src={item.art.tall.src}
              alt=""
              width={item.art.tall.width}
              height={item.art.tall.height}
              className="absolute! inset-0"
              imgClassName="motion-safe:group-hover:scale-[1.08]"
            />
            <span className="absolute top-3 left-3 rounded-full bg-wine px-2.5 py-0.5 text-xs text-white">New</span>
          </span>
          <span className="mt-3 block text-[13px] text-muted">{item.house}</span>
          <span className="block font-display text-[21px] leading-[1.15] transition-colors duration-200 group-hover:text-wine">
            {item.name}
          </span>
          <span className="mt-0.5 block text-sm font-medium">From {formatPrice(item.price)}</span>
        </Link>
      ))}
      <Link
        to="/new"
        className="burgundy flex h-[400px] flex-col justify-end gap-1.5 rounded-[14px] px-[18px] py-[22px] transition-[translate,box-shadow] duration-[400ms] ease-out hover:-translate-y-1.5 hover:shadow-[0_26px_40px_-18px_rgb(20_8_12/0.5)]"
      >
        <span className="mb-auto text-[13px] tracking-[0.14em] text-wine-soft uppercase">This month</span>
        <b className="font-display text-[28px] leading-[1.1] font-normal">
          {newIn.count} new {newIn.count === 1 ? 'decant' : 'decants'}
        </b>
        <small className="text-[13px] text-wine-soft">Newest first, every house</small>
        <em className="mt-2.5 flex items-center gap-1.5 self-start border-b border-gold/60 pb-0.5 text-sm text-gold not-italic">
          Shop all new in <ArrowRight size={14} />
        </em>
      </Link>
    </div>
  )
})

/* ── Houses (M1 "Gallery"): A to Z list, then four tall photo tiles with each house's logo in white ── */

const HousesMenu = memo(function HousesMenu() {
  const { houses } = menus
  return (
    <div className="grid grid-cols-[280px_1fr] gap-10 border-t border-line bg-white px-12 pt-9 pb-10">
      <div>
        <Kicker>Top houses</Kicker>
        <List items={houses.list.map((h) => ({ label: h.name, count: h.count, to: housePath(h.slug) }))} />
        <MoreLink to="/houses">View all {houses.total} houses</MoreLink>
      </div>
      <div className="grid grid-cols-4 gap-4">
        {houses.tiles.map((t) => (
          <Tile key={t.slug} to={housePath(t.slug)} photo={t.photo} label={t.name}>
            <span className="absolute inset-x-0 bottom-[34px] flex justify-center px-4">
              {/* Logos are dark on white; inverted and screened they read as white on the photo */}
              <img
                src={t.logo.src}
                alt={t.name}
                className="max-h-[64px] max-w-[170px] object-contain mix-blend-screen [filter:grayscale(1)_invert(1)_contrast(1.8)_brightness(1.2)]"
              />
            </span>
          </Tile>
        ))}
      </div>
    </div>
  )
})

/* ── All decants (M2 "Salon"): dark columns in ivory Fraunces; the photo shows what the hovered accord is about ── */

const DecantsMenu = memo(function DecantsMenu() {
  const { decants } = menus
  const features = decants.features as Record<string, typeof decants.feature>
  const [feature, setFeature] = useState(decants.feature)
  return (
    <div className="grid grid-cols-[1fr_420px] gap-12 bg-[radial-gradient(ellipse_60%_120%_at_80%_30%,#4a1626_0%,#2a0d16_55%,#170709_100%)] px-12 pt-10 pb-11 text-[#f5e6e9]">
      <div className="grid grid-cols-[1.2fr_1fr_1fr_1fr_1fr] gap-7">
        {decants.columns.map((col) => (
          <div key={col.title}>
            <Kicker gold>{col.title}</Kicker>
            <ul>
              {col.items.map((item: Item) => (
                <li key={item.label}>
                  <Link
                    to={item.to}
                    onMouseEnter={() => features[item.label] && setFeature(features[item.label])}
                    onFocus={() => features[item.label] && setFeature(features[item.label])}
                    className="group/l flex min-h-[34px] items-baseline justify-between gap-2.5 font-display text-[19px] text-[#f3e1e5] transition-colors duration-200 hover:text-gold"
                  >
                    <span className="border-b border-transparent transition-colors duration-200 group-hover/l:border-gold">
                      {item.label}
                    </span>
                    {item.count !== undefined && (
                      <small className="font-sans text-xs text-[#a98a92]">{item.count}</small>
                    )}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <Link
        to={feature.to}
        className="group relative block h-[330px] overflow-hidden rounded-[14px] shadow-[0_0_0_1px_rgb(226_199_156/0.25)]"
      >
        {/* Keyed so a new feature dissolves in */}
        <span key={feature.kicker} className="absolute inset-0 animate-[fade-in_500ms_var(--ease-out)_both]">
          <Photo
            src={feature.photo.src}
            alt=""
            className="absolute! inset-0"
            imgClassName="motion-safe:group-hover:scale-[1.08]"
          />
        </span>
        <Shade />
        <span className="absolute inset-x-6 bottom-[22px] flex flex-col gap-1 text-white">
          <small className="text-xs tracking-[0.16em] text-gold uppercase">
            {feature.kicker} · {feature.count} decants
          </small>
          <b className="font-display text-[28px] leading-[1.1] font-normal">{feature.title}</b>
          <em className="mt-1.5 flex items-center gap-1.5 text-sm not-italic">
            {feature.cta} <ArrowRight size={14} />
          </em>
        </span>
      </Link>
    </div>
  )
})

/* ── Fragrances (F1 + Shop all): Worn by and Strength lists, four scent-family photo tiles, then a burgundy tile ── */

const FragrancesMenu = memo(function FragrancesMenu() {
  const { fragrances, totalDecants } = menus
  return (
    <div className="grid grid-cols-[240px_1fr] gap-10 border-t border-line bg-white px-12 pt-9 pb-10">
      <div>
        <Kicker>Worn by</Kicker>
        <List items={fragrances.wornBy} />
        <div className="mt-[26px]">
          <Kicker>Strength</Kicker>
          <List items={fragrances.strength} />
        </div>
      </div>
      <div className="grid grid-cols-5 gap-3.5">
        {fragrances.families.map((f) => (
          <Tile key={f.slug} to={f.to} photo={f.photo} label={f.name}>
            <span className="absolute inset-x-[18px] bottom-5 flex flex-col gap-1 text-white">
              <b className="font-display text-2xl leading-[1.1] font-normal">{f.name}</b>
              <small className="text-[13px] opacity-85">{f.line}</small>
              <em className="mt-1 text-xs tracking-[0.14em] text-[#f3d9b0] uppercase not-italic">{f.count} decants</em>
            </span>
          </Tile>
        ))}
        <Link
          to="/decants"
          className="burgundy group relative flex h-[400px] flex-col justify-end gap-1.5 rounded-[14px] px-[18px] py-[22px] transition-[translate,box-shadow] duration-[400ms] ease-out hover:-translate-y-1.5 hover:shadow-[0_26px_40px_-18px_rgb(20_8_12/0.5)]"
        >
          <span className="mb-auto flex items-center gap-2.5 text-[13px] tracking-[0.14em] text-wine-soft uppercase">
            Not sure yet?
            <i aria-hidden="true" className="block h-px w-11 bg-wine-soft/70" />
          </span>
          <b className="font-display text-[26px] leading-[1.1] font-normal">Shop all {totalDecants} decants</b>
          <small className="text-[13px] text-wine-soft">Every family, every house</small>
          <em className="mt-2.5 flex items-center gap-1.5 self-start border-b border-gold/60 pb-0.5 text-sm text-gold not-italic">
            Browse the catalogue <ArrowRight size={14} />
          </em>
        </Link>
      </div>
    </div>
  )
})

/* ── Shared pieces ── */

/** A tall photo tile: on hover it lifts a little and its photo zooms outwards slowly */
function Tile({ to, photo, label, children }: { to: string; photo: Img; label: string; children: ReactNode }) {
  return (
    <Link
      to={to}
      aria-label={label}
      className="group relative block h-[400px] overflow-hidden rounded-[14px] transition-[translate,box-shadow] duration-[400ms] ease-out hover:-translate-y-1.5 hover:shadow-[0_26px_40px_-18px_rgb(20_8_12/0.5)]"
    >
      <Photo
        src={photo.src}
        alt=""
        width={photo.width}
        height={photo.height}
        className="absolute! inset-0"
        imgClassName="motion-safe:group-hover:scale-[1.08]"
      />
      <Shade />
      {children}
    </Link>
  )
}

/** Darkens the lower part of a photo so white text and logos read */
function Shade() {
  return (
    <span
      aria-hidden="true"
      className="absolute inset-0 bg-[linear-gradient(180deg,rgb(0_0_0/0)_38%,rgb(10_4_6/0.55)_62%,rgb(10_4_6/0.85)_100%)]"
    />
  )
}

function Kicker({ children, gold }: { children: ReactNode; gold?: boolean }) {
  return (
    <span className={`mb-4 block text-xs tracking-[0.2em] uppercase ${gold ? 'text-gold' : 'text-wine'}`}>
      {children}
    </span>
  )
}

/** Fraunces list with counts, on white */
function List({ items }: { items: Item[] }) {
  return (
    <ul>
      {items.map((item) => (
        <li key={item.label}>
          <Link
            to={item.to}
            className="flex min-h-9 items-baseline justify-between border-b border-[#f1ebe4] font-display text-xl transition-colors duration-200 hover:text-wine"
          >
            {item.label}
            {item.count !== undefined && <small className="font-sans text-xs text-muted">{item.count}</small>}
          </Link>
        </li>
      ))}
    </ul>
  )
}

function MoreLink({ to, children }: { to: string; children: ReactNode }) {
  return (
    <Link
      to={to}
      className="mt-[18px] inline-flex items-center gap-1.5 border-b border-wine/50 pb-0.5 text-[15px] text-wine"
    >
      {children} <ArrowRight size={14} />
    </Link>
  )
}
