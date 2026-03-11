import { Badge } from '@/components/ui/badge'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import { getConfidenceLevel } from '@/lib/types'
import { CheckCircle2, AlertCircle, HelpCircle } from 'lucide-react'

const STYLES = {
  high: 'bg-[var(--confidence-high)] text-white',
  medium: 'bg-[var(--confidence-medium)] text-[oklch(0.17_0.01_260)]',
  low: 'bg-[var(--confidence-low)] text-white',
} as const

/* Confidence-based labels with actionable descriptions */
const CONFIDENCE_LABELS = {
  high: 'High Confidence',
  medium: 'Moderate Confidence',
  low: 'Low Confidence',
} as const

const CONFIDENCE_DESCRIPTIONS = {
  high: 'AI is confident. Reviewer can approve quickly.',
  medium: 'AI has moderate confidence. Reviewer should verify key fields.',
  low: 'AI is uncertain. Reviewer must examine carefully.',
} as const

const ICONS = {
  high: CheckCircle2,
  medium: AlertCircle,
  low: HelpCircle,
} as const

interface ConfidenceBadgeProps {
  score: number
  /** Show the percentage alongside the label */
  showScore?: boolean
  /** Applied rule from Decision Spec (e.g., "A9") */
  appliedRule?: string
}

export function ConfidenceBadge({ score, showScore = false, appliedRule }: ConfidenceBadgeProps) {
  const level = getConfidenceLevel(score)
  const pct = Math.round(score * 100)
  const Icon = ICONS[level]

  const badge = (
    <Badge
      className={cn('gap-1.5 cursor-default', STYLES[level])}
      aria-label={`${CONFIDENCE_LABELS[level]}: ${pct}%`}
    >
      <Icon className="size-3" />
      {CONFIDENCE_LABELS[level]}
      {showScore && <span className="opacity-80">({pct}%)</span>}
    </Badge>
  )

  return (
    <TooltipProvider>
      <Tooltip delayDuration={300}>
        <TooltipTrigger asChild>
          {badge}
        </TooltipTrigger>
        <TooltipContent side="bottom" className="max-w-xs">
          <div className="flex flex-col gap-1">
            <p className="font-medium">{CONFIDENCE_LABELS[level]} ({pct}%)</p>
            <p className="text-xs text-muted-foreground">{CONFIDENCE_DESCRIPTIONS[level]}</p>
            {appliedRule && (
              <p className="text-xs text-muted-foreground mt-1">
                Rule: <span className="font-mono">{appliedRule}</span>
              </p>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}
