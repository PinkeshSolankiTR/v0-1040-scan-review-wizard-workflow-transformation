import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { getConfidenceLevel } from '@/lib/types'

const STYLES = {
  high: 'bg-[var(--confidence-high)] text-white',
  medium: 'bg-[var(--confidence-medium)] text-[oklch(0.17_0.01_260)]',
  low: 'bg-[var(--confidence-low)] text-white',
} as const

const LABELS = { high: 'High', medium: 'Medium', low: 'Low' } as const

export function ConfidenceBadge({ score }: { score: number }) {
  const level = getConfidenceLevel(score)
  const pct = Math.round(score * 100)

  return (
    <Badge
      className={cn('gap-1', STYLES[level])}
      aria-label={`${LABELS[level]} confidence: ${pct}%`}
    >
      {LABELS[level]}
      <span className="opacity-80">{pct}%</span>
    </Badge>
  )
}
