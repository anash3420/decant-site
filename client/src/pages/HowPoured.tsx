import { Suspense, use, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { getCatalog } from '../api/shop.ts'
import { PageHead } from '../components/PageHead.tsx'
import { ArrowRight } from '../components/icons.tsx'
import { plural } from '../lib/catalog.ts'
import { fill, site } from '../lib/content.ts'

const copy = site.poured

/**
 * "How decants are poured": the four steps from full bottle to door on a burgundy trail, the sizes the shop pours
 * (from the catalogue), and a burgundy band to the decants that closes the page. All text is in site.json `poured`.
 */
export default function HowPoured() {
  useEffect(() => {
    document.title = `${copy.title} | ${site.shopName}`
    return () => {
      document.title = site.shopName
    }
  }, [])

  return (
    <>
      <div className="relative z-10 mx-auto max-w-[1440px] px-4 pt-6 lg:px-12 lg:pt-9">
        <PageHead
          crumb={copy.title}
          kicker={copy.kicker}
          title={copy.title}
          count={copy.steps.length}
          lead={copy.lead}
        />

        <ol className="relative mt-4 max-w-[860px] lg:mt-10">
          {/* The trail joining the steps */}
          <i
            aria-hidden="true"
            className="absolute top-3 bottom-10 left-[6px] w-px bg-[linear-gradient(180deg,#6d1f33,rgb(109_31_51/0.12))] lg:left-[7px]"
          />
          {copy.steps.map((step, i) => (
            <li key={step.title} className="relative grid grid-cols-[13px_1fr] gap-x-5 pb-10 lg:gap-x-10 lg:pb-14">
              <span
                aria-hidden="true"
                className="mt-2.5 size-[13px] rounded-full bg-wine shadow-[0_0_0_6px_rgb(109_31_51/0.12)] lg:size-[15px]"
              />
              <div className="relative">
                <span
                  aria-hidden="true"
                  className="outline-num -top-7 right-0 text-[84px] [-webkit-text-stroke:1px_rgb(109_31_51/0.2)] lg:-top-12 lg:text-[150px]"
                >
                  {String(i + 1).padStart(2, '0')}
                </span>
                <h2 className="font-display text-[26px] leading-[1.15] lg:text-[38px]">{step.title}</h2>
                <p className="mt-2 max-w-[600px] text-base leading-[1.7] text-[#3a2d30] lg:mt-3 lg:text-[17px]">
                  {fill(step.text)}
                </p>
              </div>
            </li>
          ))}
        </ol>

        <Suspense fallback={<div className="h-48" />}>
          <Sizes />
        </Suspense>
      </div>

      {/* Closes the page, flush on the footer */}
      <section
        data-closes-page
        aria-labelledby="poured-cta"
        className="burgundy mt-16 px-5 py-14 text-center lg:mt-24 lg:py-20"
      >
        <h2 id="poured-cta" className="font-display text-[30px] leading-[1.1] text-[#fbf3f4] lg:text-[44px]">
          {copy.cta.title}
        </h2>
        <p className="mx-auto mt-3 max-w-[40ch] text-[15px] text-[#ecd3d8] lg:text-base">{copy.cta.text}</p>
        <Link
          to={copy.cta.to}
          className="mt-7 inline-flex h-12 items-center gap-2 rounded-full border-2 border-gold bg-white px-6 text-[15px] font-medium text-ink transition-transform duration-200 ease-out hover:-translate-y-0.5 active:scale-[0.97]"
        >
          {copy.cta.button} <ArrowRight size={16} />
        </Link>
      </section>
    </>
  )
}

/** Every size the shop pours, with how many decants come in it */
function Sizes() {
  const catalog = use(getCatalog())
  const counts = new Map<number, number>()
  for (const l of catalog) for (const p of l.prices) counts.set(p.sizeMl, (counts.get(p.sizeMl) ?? 0) + 1)
  const sizes = [...counts].sort((a, b) => a[0] - b[0])

  return (
    <section aria-labelledby="poured-sizes" className="mt-6 lg:mt-10">
      <p className="mb-2.5 flex items-center gap-2.5 text-[13px] tracking-[0.14em] text-wine uppercase">
        <i aria-hidden="true" className="block h-px w-11 bg-wine/60" />
        {copy.sizes.kicker}
      </p>
      <h2 id="poured-sizes" className="font-display text-[30px] leading-[1.05] lg:text-[44px]">
        {copy.sizes.title}
      </h2>
      <p className="mt-2 max-w-[560px] text-base text-[#3a2d30]">{copy.sizes.text}</p>
      <ul className="mt-6 grid grid-cols-2 gap-2.5 sm:grid-cols-4 lg:max-w-[860px] lg:gap-[18px]">
        {sizes.map(([ml, n]) => (
          <li key={ml} className="flex flex-col items-center justify-center rounded-2xl bg-white py-6 lg:py-8">
            <b className="font-display text-[40px] leading-none font-normal lg:text-5xl">
              {ml}
              <small className="ml-1 font-sans text-sm text-muted">ml</small>
            </b>
            <span className="mt-2 text-[13px] text-muted">{plural(n, 'fragrance')}</span>
          </li>
        ))}
      </ul>
    </section>
  )
}
