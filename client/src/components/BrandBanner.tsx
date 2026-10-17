import { useEffect, useState } from 'react'
import { fetchBrands, type ShopBrand } from '../api/shop.ts'
import { slugify } from '../lib/catalog.ts'

// One request per visit is plenty: brand details rarely change
let cache: Promise<ShopBrand[]> | undefined
const loadBrands = () => (cache ??= fetchBrands().catch((err) => ((cache = undefined), Promise.reject(err))))

/**
 * A brand's logo and description, shown when browsing one brand. Logo on the left with the description
 * beside it on wider screens; stacked on phones, where the phone logo (if there is one) is used.
 * Renders nothing until loaded, and nothing for brands without a logo or description.
 */
export default function BrandBanner({
  slug,
  name,
  className = '',
}: {
  slug?: string | null
  name?: string
  className?: string
}) {
  const [brands, setBrands] = useState<ShopBrand[]>()
  useEffect(() => {
    let current = true
    loadBrands()
      .then((b) => current && setBrands(b))
      .catch(() => {}) // the banner is a nice-to-have; the listings below still work
    return () => {
      current = false
    }
  }, [])

  const brand = brands?.find((b) => b.slug === slug || (name && (b.name === name || b.slug === slugify(name))))
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
