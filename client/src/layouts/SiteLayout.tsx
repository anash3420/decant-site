import { useEffect } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { getOption } from '@shared/stock.ts'
import Header from '../components/Header.tsx'
import Footer from '../components/Footer.tsx'
import { ShopProvider, useShop } from '../context/ShopContext.tsx'
import { useInquiry } from '../context/InquiryContext.tsx'

export default function SiteLayout() {
  return (
    <ShopProvider>
      <PruneInquiry />
      <Shell />
    </ShopProvider>
  )
}

function Shell() {
  const { pathname } = useLocation()
  useEffect(() => {
    window.scrollTo({ top: 0 })
  }, [pathname])

  return (
    <div className="flex min-h-dvh flex-col">
      <Header />
      <main className="mx-auto w-full max-w-6xl flex-1 px-5 py-10 sm:px-8">
        <Outlet />
      </main>
      <Footer />
    </div>
  )
}

/** Once the catalog loads, drop saved inquiry lines whose listing or option no longer exists */
function PruneInquiry() {
  const { status, getListing } = useShop()
  const { retain } = useInquiry()
  useEffect(() => {
    if (status !== 'ready') return
    retain((i) => {
      const listing = getListing(i.slug)
      return Boolean(listing && getOption(listing, i.optionId))
    })
  }, [status, getListing, retain])
  return null
}
