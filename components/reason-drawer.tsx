'use client'

import { useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

interface ReasonDrawerProps {
  rule: string
  reason: string
  fieldsCompared?: string[]
  escalation?: string | null
}

export function ReasonDrawer({ rule, reason, fieldsCompared, escalation }: ReasonDrawerProps) {
  const [open, setOpen] = useState(false)

  return (
    <div className="rounded-md border border-border bg-muted/50">
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between px-3 py-2 text-left text-sm font-medium text-foreground hover:bg-muted transition-colors rounded-md"
        aria-expanded={open}
      >
        <span className="flex items-center gap-2">
          <span className="font-mono text-xs text-muted-foreground">{rule}</span>
        </span>
        <ChevronDown
          className={cn('size-4 text-muted-foreground transition-transform', open && 'rotate-180')}
        />
      </button>

      {open && (
        <div className="flex flex-col gap-3 border-t border-border px-3 py-3">
          <p className="text-sm text-foreground leading-relaxed">{reason}</p>

          {fieldsCompared && fieldsCompared.length > 0 && (
            <div className="flex flex-col gap-1.5">
              <p className="text-xs font-medium text-muted-foreground">Fields Compared</p>
              <div className="flex flex-wrap gap-1.5">
                {fieldsCompared.map((f) => (
                  <Badge key={f} variant="secondary" className="text-xs">
                    {f}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {escalation && (
            <div className="rounded-md bg-[var(--confidence-low)]/10 px-3 py-2">
              <p className="text-xs font-medium text-[var(--confidence-low)]">Escalation Reason</p>
              <p className="mt-1 text-sm text-foreground">{escalation}</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
