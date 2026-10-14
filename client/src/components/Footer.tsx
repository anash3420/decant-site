import { SITE_NAME } from '../config.ts'
import { useShop } from '../context/ShopContext.tsx'

export default function Footer() {
  const { settings } = useShop()
  return (
    <footer className="border-t border-border">
      <div className="mx-auto flex min-h-19 max-w-6xl flex-wrap items-center justify-between gap-x-6 gap-y-1 px-5 py-4 text-sm text-muted sm:px-8">
        <p>
          © {new Date().getFullYear()} {SITE_NAME}. Calgary, AB.
        </p>
        {settings?.ownerFacebookUrl && (
          <a
            href={settings.ownerFacebookUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex min-h-11 items-center font-medium text-accent underline-offset-4 hover:underline"
          >
            Message me on Facebook ↗
          </a>
        )}
      </div>
    </footer>
  )
}
