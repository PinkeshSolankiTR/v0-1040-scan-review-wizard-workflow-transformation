'use client'

import { CheckCircle2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

interface BulkActionsBarProps {
  totalItems: number
  highCount: number
  onAcceptAllHigh: () => void
}

export function BulkActionsBar({ totalItems, highCount, onAcceptAllHigh }: BulkActionsBarProps) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-border bg-card px-4 py-3">
      <div className="flex items-center gap-3">
        <Badge variant="secondary">{totalItems} total items</Badge>
      </div>
      <Button
        variant="outline"
        size="sm"
        onClick={onAcceptAllHigh}
        disabled={highCount === 0}
        title="Accept all items with Auto-Ready status (>=90% confidence)"
      >
        <CheckCircle2 className="size-4 text-[var(--confidence-high)]" />
        Accept All Auto-Ready ({highCount})
      </Button>
    </div>
  )
}
