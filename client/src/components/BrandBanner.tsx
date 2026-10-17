import { useEffect, useState } from 'react'
import { fetchBrands, type ShopBrand } from '../api/shop.ts'

/**
 * A brand's logo and description, shown when browsing one brand. Logo on the left with the description
 * beside it on wider screens; stacked on phones, where the phone logo (if there is one) is used.
 * Renders nothing until loaded, and nothing for brands without a logo or description.
 */
export default function BrandBanner({ slug, className = '' }: { slug?: string | null; className?: string }) {
  const [brands, setBrands] = useState<ShopBrand[]>()
  useEffect(() => {
    let current = true
    // Fetched on each view (CDN-cached briefly), so a logo or description edited in the admin shows up
    fetchBrands()
      .then((b) => current && setBrands(b))
      .catch(() => {}) // the banner is a nice-to-have; the listings below still work
    return () => {
      current = false
    }
  }, [])

  // Matched on the stored slug: a renamed brand keeps its slug, so its banner keeps working
  const brand = slug ? brands?.find((b) => b.slug === slug) : undefined
  if (!brand || (!brand.logo && !brand.description)) return null
  const logo = brand.logo ?? brand.logoMobile

  return (
    <section
      aria-label={`About ${brand.name}`}
      className={`grid items-center gap-6 rounded-xl bg-panel px-6 py-8 sm:px-10 md:grid-cols-2 md:gap-10 md:py-10 ${className}`}
    >
      {logo && (
        <picture className="flex justify-center">
          {brand.logoMobile && <source media="(max-width: 767px)" srcSet={brand.logoMobile.src} />}
          <img
            src={logo.src}
            width={logo.width}
            height={logo.height}
            alt={brand.name}
            // Logos come on white; multiply melts the white into the panel
            className="h-auto max-h-28 w-auto max-w-full object-contain mix-blend-multiply md:max-h-40"
          />
        </picture>
      )}
      {brand.description && (
        <p className={`leading-relaxed text-text/85 ${logo ? '' : 'md:col-span-2'}`}>{brand.description}</p>
      )}
    </section>
  )
}
