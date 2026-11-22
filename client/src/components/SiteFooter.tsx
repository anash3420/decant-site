import { Link } from 'react-router-dom'
import { site } from '../lib/content.ts'
import { LogoMark } from './LogoMark.tsx'

const linkClass = 'flex min-h-11 items-center break-words transition-colors hover:text-wine lg:mb-2.5 lg:min-h-0'

export function SiteFooter() {
  const year = new Date().getFullYear()
  return (
    <footer className="relative z-10 mt-14 grid grid-cols-2 gap-x-4 gap-y-7 border-t border-line bg-white px-4 pt-10 pb-7 text-sm text-muted lg:mt-20 lg:grid-cols-[1.5fr_1fr_1fr_1fr] lg:gap-12 lg:px-12 lg:pt-16 lg:pb-14">
      <div className="col-span-2 lg:col-span-1">
        <Link to="/" className="flex min-h-11 items-center gap-3 text-wine">
          <LogoMark size={30} />
          <span className="font-display text-2xl text-ink">{site.shopName}</span>
        </Link>
        <p className="mt-3.5 leading-relaxed lg:max-w-[300px]">{site.about}</p>
      </div>

      <FooterColumn title="Shop" links={site.footer.shop} />
      <FooterColumn title="Help" links={site.footer.help} />

      <div className="col-span-2 lg:col-span-1">
        <h2 className="mb-3.5 text-[15px] font-medium text-ink">Contact</h2>
        <ul>
          <li>
            <a href={`mailto:${site.email}`} className={linkClass}>
              {site.email}
            </a>
          </li>
          <li className="flex min-h-11 items-center lg:min-h-0">{site.location}</li>
        </ul>
      </div>

      <div className="col-span-full mt-2 flex flex-col gap-1.5 border-t border-line pt-[22px] text-[13px] lg:flex-row lg:justify-between">
        <span>
          © {year} {site.shopName}
        </span>
        <span>{site.checkoutLine}</span>
      </div>
    </footer>
  )
}

function FooterColumn({ title, links }: { title: string; links: { label: string; to: string }[] }) {
  return (
    <div>
      <h2 className="mb-3.5 text-[15px] font-medium text-ink">{title}</h2>
      <ul>
        {links.map((l) => (
          <li key={l.to}>
            <Link to={l.to} className={linkClass}>
              {l.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}
