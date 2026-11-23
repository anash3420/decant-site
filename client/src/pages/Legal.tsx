import { useEffect, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { PageHead } from '../components/PageHead.tsx'
import { fill, site } from '../lib/content.ts'

/**
 * A policy page: privacy, terms of service, or shipping and refunds. Their sections are in site.json `privacy`,
 * `terms` and `shippingPolicy`;
 * [text](url) in them becomes a link (a page of this site opens in place, others in a new tab).
 */
export default function Legal({ page }: { page: 'privacy' | 'terms' | 'shippingPolicy' }) {
  const copy = site[page]
  useEffect(() => {
    document.title = `${copy.title} | ${site.shopName}`
    return () => {
      document.title = site.shopName
    }
  }, [copy.title])

  return (
    <div className="relative z-10 mx-auto max-w-[1440px] px-4 pt-6 pb-16 lg:px-12 lg:pt-9 lg:pb-24">
      <PageHead crumb={copy.title} kicker={copy.kicker} title={copy.title} lead={copy.updated} />
      <div className="max-w-[760px] rounded-2xl bg-white px-5 py-7 lg:rounded-[18px] lg:px-12 lg:py-12">
        {copy.sections.map((section, i) => (
          <section
            key={section.title}
            aria-labelledby={`${page}-${i}`}
            className="border-t border-line pt-6 pb-2 first:border-t-0 first:pt-0 lg:pt-8"
          >
            <h2 id={`${page}-${i}`} className="font-display text-[22px] leading-tight lg:text-[28px]">
              {section.title}
            </h2>
            {section.text.map((paragraph) => (
              <p key={paragraph} className="mt-3 text-[15px] leading-[1.75] text-[#3a2d30] lg:text-base">
                {withLinks(fill(paragraph))}
              </p>
            ))}
          </section>
        ))}
      </div>
    </div>
  )
}

/** "[Privacy Statement](https://…)" becomes a link; an email address becomes a mail link */
function withLinks(text: string): ReactNode[] {
  return text.split(/(\[[^\]]+\]\([^)]+\)|[\w.+-]+@[\w-]+\.[\w.]+\w)/).map((part, i) => {
    const link = part.match(/^\[([^\]]+)\]\(([^)]+)\)$/)
    const href = link ? link[2] : part.includes('@') && !part.includes(' ') ? `mailto:${part}` : null
    if (!href) return part
    const text = <span className="link-line pb-0.5">{link ? link[1] : part}</span>
    if (href.startsWith('/'))
      return (
        <Link key={i} to={href} className="text-wine hover:text-wine/80">
          {text}
        </Link>
      )
    return (
      <a
        key={i}
        href={href}
        {...(link ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
        className="text-wine hover:text-wine/80"
      >
        {text}
      </a>
    )
  })
}
