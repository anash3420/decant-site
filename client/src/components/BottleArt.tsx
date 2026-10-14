import type { Photo } from '@shared/types.ts'

interface Props {
  tint: string
  variant?: Photo['variant']
  /** 0–1 liquid level */
  fill?: number
  className?: string
}

// Placeholder illustration until real photos exist.
export default function BottleArt({ tint, variant = 'vial', fill = 0.72, className = '' }: Props) {
  return (
    <div className={`relative overflow-hidden bg-accent-soft/60 ${className}`} aria-hidden="true">
      {variant === 'vial' && <Vial tint={tint} fill={fill} />}
      {variant === 'bottle' && <FullBottle tint={tint} fill={fill} />}
      {variant === 'box' && <Box tint={tint} />}
    </div>
  )
}

const svgClass = 'absolute inset-0 m-auto h-3/4 w-auto drop-shadow-sm'

function Vial({ tint, fill }: { tint: string; fill: number }) {
  const h = 101 * fill
  return (
    <svg viewBox="0 0 60 140" className={svgClass}>
      <rect x="22" y="4" width="16" height="14" rx="2" fill="#2B2E27" />
      <rect x="26" y="18" width="8" height="8" fill="#9EA394" />
      <rect x="12" y="26" width="36" height="108" rx="6" fill="#FFFFFF" stroke="#D3D7CC" strokeWidth="2" />
      <rect x="15" y={131 - h} width="30" height={h} rx="4" fill={tint} opacity="0.85" />
      <rect x="18" y="32" width="4" height="94" rx="2" fill="#FFFFFF" opacity="0.6" />
    </svg>
  )
}

function FullBottle({ tint, fill }: { tint: string; fill: number }) {
  const h = 88 * fill
  return (
    <svg viewBox="0 0 120 140" className={svgClass}>
      <rect x="44" y="2" width="32" height="26" rx="3" fill="#2B2E27" />
      <rect x="52" y="28" width="16" height="10" fill="#9EA394" />
      <rect x="10" y="38" width="100" height="98" rx="10" fill="#FFFFFF" stroke="#D3D7CC" strokeWidth="2" />
      <rect x="15" y={131 - h} width="90" height={h} rx="7" fill={tint} opacity="0.85" />
      <rect x="34" y="70" width="52" height="30" rx="2" fill="#FFFFFF" opacity="0.92" />
      <rect x="42" y="80" width="36" height="3" rx="1.5" fill="#2B2E27" opacity="0.7" />
      <rect x="48" y="88" width="24" height="2" rx="1" fill="#2B2E27" opacity="0.4" />
      <rect x="18" y="44" width="5" height="86" rx="2.5" fill="#FFFFFF" opacity="0.55" />
    </svg>
  )
}

function Box({ tint }: { tint: string }) {
  return (
    <svg viewBox="0 0 120 140" className={svgClass}>
      <path d="M20 30 L60 14 L100 30 L60 46 Z" fill={tint} opacity="0.55" />
      <path d="M20 30 L60 46 L60 136 L20 120 Z" fill={tint} opacity="0.95" />
      <path d="M100 30 L60 46 L60 136 L100 120 Z" fill={tint} opacity="0.75" />
    </svg>
  )
}
