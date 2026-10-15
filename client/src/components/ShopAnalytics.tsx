import { Analytics, type BeforeSendEvent } from '@vercel/analytics/react'

/** Your own admin visits would skew shop stats and put admin URLs in the dashboard, so they're never sent */
const skipAdmin = (event: BeforeSendEvent) => {
  const path = new URL(event.url).pathname
  return path === '/admin' || path.startsWith('/admin/') ? null : event
}

/**
 * Vercel Web Analytics: cookieless page views, including in-app navigation. Only in production builds,
 * so local development sends nothing. Needs Analytics enabled for the project in the Vercel dashboard.
 */
export default function ShopAnalytics() {
  return import.meta.env.PROD ? <Analytics beforeSend={skipAdmin} /> : null
}
