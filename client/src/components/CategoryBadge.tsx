import { Link } from 'react-router-dom'
import type { FragranceCategory } from '@shared/types.ts'
import { categoryMeta } from '../lib/catalog.ts'

/** Niche / Designer / Private line / Dupe label. As a link it opens that category's page. */
export default function CategoryBadge({ category, link = false }: { category: FragranceCategory; link?: boolean }) {
  const meta = categoryMeta(category)
  const className = `inline-block shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium whitespace-nowrap ${meta.badge}`
  return link ? (
    <Link to={meta.path} className={`${className} underline-offset-2 hover:underline`}>
      {meta.label}
    </Link>
  ) : (
    <span className={className}>{meta.label}</span>
  )
}
