import { lazy, Suspense } from 'react'
import { BrowserRouter, Navigate, Routes, Route } from 'react-router-dom'
import SiteLayout from './layouts/SiteLayout.tsx'
import Home from './pages/Home.tsx'
import { CATEGORIES } from './lib/catalog.ts'
import KindPage from './pages/KindPage.tsx'
import FragranceDetail from './pages/FragranceDetail.tsx'
import Inquiry from './pages/Inquiry.tsx'
import History from './pages/History.tsx'
import NotFound from './pages/NotFound.tsx'
// The admin is only for me; keep it out of the bundle shop visitors download
const AdminApp = lazy(() => import('./admin/AdminApp.tsx'))
import { ToastProvider } from './context/ToastContext.tsx'
import ShopAnalytics from './components/ShopAnalytics.tsx'

export default function App() {
  return (
    <BrowserRouter>
      <ShopAnalytics />
      <ToastProvider>
        <Routes>
          <Route element={<SiteLayout />}>
            <Route index element={<Home />} />
            <Route path="decants" element={<KindPage key="decant" kind="decant" />} />
            <Route path="catch-release" element={<KindPage key="catch-release" kind="catch-release" />} />
            <Route path="full-bottles" element={<KindPage key="full-bottle" kind="full-bottle" />} />
            {CATEGORIES.map((c) => (
              <Route key={c.id} path={c.path.slice(1)} element={<Home key={c.id} category={c.id} />} />
            ))}
            <Route path="fragrance/:slug" element={<FragranceDetail />} />
            <Route path="inquiry" element={<Inquiry />} />
            <Route path="history" element={<History />} />
            <Route path="info" element={<Navigate to="/history" replace />} />
            <Route path="*" element={<NotFound />} />
          </Route>
          <Route
            path="admin/*"
            element={
              <Suspense fallback={null}>
                <AdminApp />
              </Suspense>
            }
          />
        </Routes>
      </ToastProvider>
    </BrowserRouter>
  )
}
