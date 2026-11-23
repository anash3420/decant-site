import { lazy, Suspense } from 'react'
import { createBrowserRouter, Outlet, RouterProvider, ScrollRestoration } from 'react-router-dom'
import { Ticker } from './components/Ticker.tsx'
import { SiteHeader } from './components/SiteHeader.tsx'
import { SiteFooter } from './components/SiteFooter.tsx'
import { QuickBuy } from './components/QuickBuy.tsx'
import { BagPanel } from './components/Bag.tsx'
import Home from './pages/Home.tsx'

// Pages other than the homepage load only when visited
const ComingSoon = lazy(() => import('./pages/ComingSoon.tsx'))
const Decants = lazy(() => import('./pages/Decants.tsx'))
const Product = lazy(() => import('./pages/Product.tsx'))
const AllHouses = lazy(() => import('./pages/AllHouses.tsx'))
const Brand = lazy(() => import('./pages/Brand.tsx'))
const Wishlist = lazy(() => import('./pages/Wishlist.tsx'))
const NewIn = lazy(() => import('./pages/NewIn.tsx'))
const HowPoured = lazy(() => import('./pages/HowPoured.tsx'))
const Contact = lazy(() => import('./pages/Contact.tsx'))
const Legal = lazy(() => import('./pages/Legal.tsx'))

function Layout() {
  return (
    <>
      <Ticker />
      <SiteHeader />
      <div className="relative overflow-x-clip">
        <ScentTrail />
        <main>
          <Suspense>
            <Outlet />
          </Suspense>
        </main>
        <SiteFooter />
      </div>
      <QuickBuy />
      <BagPanel />
      <ScrollRestoration />
    </>
  )
}

/** The fine burgundy line that drifts down the page to the footer */
function ScentTrail() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 1440 4300"
      preserveAspectRatio="none"
      fill="none"
      className="pointer-events-none absolute inset-0 z-0 size-full"
    >
      <g stroke="#6d1f33" strokeWidth="1.2" vectorEffect="non-scaling-stroke">
        <path
          vectorEffect="non-scaling-stroke"
          strokeOpacity=".22"
          d="M1500 640C1200 720 1240 980 980 1120S520 1200 380 1420 -40 1660 120 1900 760 2020 900 2240 1300 2500 1180 2720 900 2880 700 2920 160 3120 300 3400 1060 3620 1240 3880 980 4140 760 4340"
        />
        <path
          vectorEffect="non-scaling-stroke"
          strokeOpacity=".12"
          d="M1500 670C1210 750 1260 1000 1000 1145S540 1230 404 1440 0 1680 150 1910 780 2040 924 2260 1320 2520 1200 2740 920 2900 720 2945 190 3140 330 3420 1080 3640 1270 3900 1010 4160 790 4340"
        />
      </g>
    </svg>
  )
}

const router = createBrowserRouter([
  {
    element: <Layout />,
    children: [
      { index: true, element: <Home /> },
      { path: 'new', element: <NewIn /> },
      { path: 'decants', element: <Decants /> },
      { path: 'fragrance/:slug', element: <Product /> },
      { path: 'houses', element: <AllHouses /> },
      { path: 'houses/:slug', element: <Brand /> },
      { path: 'wishlist', element: <Wishlist /> },
      { path: 'how-decants-are-poured', element: <HowPoured /> },
      { path: 'contact', element: <Contact /> },
      { path: 'privacy-policy', element: <Legal key="privacy" page="privacy" /> },
      { path: 'terms-of-service', element: <Legal key="terms" page="terms" /> },
      { path: 'shipping-and-refund-policy', element: <Legal key="shipping" page="shippingPolicy" /> },
      { path: '*', element: <ComingSoon /> },
    ],
  },
])

export default function App() {
  return <RouterProvider router={router} />
}
