import { Link, useLocation } from 'react-router-dom'

/** Every page except the homepage is still being built */
export default function ComingSoon() {
  const { pathname } = useLocation()
  return (
    <section className="relative z-10 mx-auto max-w-xl px-4 py-24 text-center lg:py-32">
      <p className="text-[13px] tracking-[0.14em] text-wine uppercase">Coming soon</p>
      <h1 className="mt-3 font-display text-4xl lg:text-5xl">This page is being poured</h1>
      <p className="mt-4 text-muted">
        <code className="text-ink">{pathname}</code> isn’t ready yet.
      </p>
      <Link to="/" className="mt-8 inline-flex h-11 items-center rounded-full bg-wine px-6 font-medium text-white">
        Back to the homepage
      </Link>
    </section>
  )
}
