/** Green when in stock, red when `low` (running out), grey when sold out. */
export default function StockBadge({ inStock, label, low }: { inStock: boolean; label?: string; low?: boolean }) {
  const tone = !inStock
    ? 'bg-soldout-soft text-soldout'
    : low
      ? 'bg-error-soft text-error'
      : 'bg-instock-soft text-instock'
  return (
    <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs whitespace-nowrap ${tone}`}>
      {label ?? (inStock ? 'In stock' : 'Sold out')}
    </span>
  )
}
