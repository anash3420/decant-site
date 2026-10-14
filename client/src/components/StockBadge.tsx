export default function StockBadge({ inStock, label }: { inStock: boolean; label?: string }) {
  return (
    <span
      className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs whitespace-nowrap ${
        inStock ? 'bg-instock-soft text-instock' : 'bg-soldout-soft text-soldout'
      }`}
    >
      {label ?? (inStock ? 'In stock' : 'Sold out')}
    </span>
  )
}
