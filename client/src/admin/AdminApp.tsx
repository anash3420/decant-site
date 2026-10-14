import { useEffect } from 'react'
import { Link, Navigate, NavLink, Outlet, Route, Routes, useLocation } from 'react-router-dom'
import { SITE_NAME } from '../config.ts'
import { AdminAuthProvider, useAdminAuth } from './AuthContext.tsx'
import { Loading } from './ui.tsx'
import Login from './pages/Login.tsx'
import Dashboard from './pages/Dashboard.tsx'
import Inquiries from './pages/Inquiries.tsx'
import InquiryDetail from './pages/InquiryDetail.tsx'
import Listings from './pages/Listings.tsx'
import ListingEdit from './pages/ListingEdit.tsx'
import Fragrances from './pages/Fragrances.tsx'
import FragranceEdit from './pages/FragranceEdit.tsx'
import Brands from './pages/Brands.tsx'
import SettingsPage from './pages/Settings.tsx'

export default function AdminApp() {
  // Keep the admin out of search engines
  useEffect(() => {
    const meta = document.createElement('meta')
    meta.name = 'robots'
    meta.content = 'noindex, nofollow'
    document.head.appendChild(meta)
    const title = document.title
    document.title = `Admin · ${SITE_NAME}`
    return () => {
      meta.remove()
      document.title = title
    }
  }, [])

  return (
    <AdminAuthProvider>
      <Routes>
        <Route path="login" element={<Login />} />
        <Route element={<RequireAdmin />}>
          <Route index element={<Dashboard />} />
          <Route path="inquiries" element={<Inquiries />} />
          <Route path="inquiries/:id" element={<InquiryDetail />} />
          <Route path="listings" element={<Listings />} />
          <Route path="listings/new" element={<ListingEdit />} />
          <Route path="listings/:id" element={<ListingEdit />} />
          <Route path="fragrances" element={<Fragrances />} />
          <Route path="fragrances/new" element={<FragranceEdit />} />
          <Route path="fragrances/:id" element={<FragranceEdit />} />
          <Route path="brands" element={<Brands />} />
          <Route path="settings" element={<SettingsPage />} />
          <Route path="*" element={<Navigate to="/admin" replace />} />
        </Route>
      </Routes>
    </AdminAuthProvider>
  )
}

const NAV = [
  { to: '/admin', label: 'Dashboard', end: true },
  { to: '/admin/inquiries', label: 'Inquiries' },
  { to: '/admin/listings', label: 'Listings' },
  { to: '/admin/fragrances', label: 'Fragrances' },
  { to: '/admin/brands', label: 'Brands' },
  { to: '/admin/settings', label: 'Settings' },
]

function RequireAdmin() {
  const { admin, logout } = useAdminAuth()
  const location = useLocation()

  useEffect(() => {
    window.scrollTo({ top: 0 })
  }, [location.pathname])

  if (admin === undefined) return <div className="mx-auto max-w-5xl px-4"><Loading label="Checking your session…" /></div>
  if (admin === null) return <Navigate to={`/admin/login?next=${encodeURIComponent(location.pathname + location.search)}`} replace />

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="border-b border-border bg-surface pt-[env(safe-area-inset-top)]">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-2 sm:px-6">
          <Link to="/admin" className="inline-flex min-h-11 items-center gap-2 font-display text-xl whitespace-nowrap">
            {SITE_NAME}
            <span className="rounded-full bg-accent-soft px-2 py-0.5 font-sans text-xs text-accent">Admin</span>
          </Link>
          <div className="flex items-center gap-1">
            <Link to="/" target="_blank" className="hidden min-h-11 items-center px-3 text-sm text-muted hover:text-text sm:inline-flex">
              View shop ↗
            </Link>
            <button type="button" onClick={logout} className="min-h-11 px-3 text-sm text-muted hover:text-text">
              Log out
            </button>
          </div>
        </div>
        <nav aria-label="Admin" className="mx-auto max-w-5xl">
          <div className="no-scrollbar flex gap-4 overflow-x-auto px-4 sm:gap-6 sm:px-6">
            {NAV.map((n) => (
              <NavLink
                key={n.to}
                to={n.to}
                end={n.end}
                className={({ isActive }) =>
                  `inline-flex min-h-11 shrink-0 items-center border-b-2 px-1 text-sm whitespace-nowrap transition-colors ${
                    isActive ? 'border-accent font-medium text-text' : 'border-transparent text-muted hover:text-text'
                  }`
                }
              >
                {n.label}
              </NavLink>
            ))}
          </div>
        </nav>
      </header>
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-6 sm:px-6 sm:py-8">
        <Outlet />
      </main>
    </div>
  )
}
