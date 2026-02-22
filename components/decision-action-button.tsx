'use client'

import { CheckCircle2, Undo2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useDecisions } from '@/contexts/decision-context'
import type { WizardType } from '@/lib/types'

interface DecisionActionButtonProps {
  itemKey: string
  wizardType: WizardType
  confidence: number
}

export function DecisionActionButton({ itemKey, wizardType, confidence }: DecisionActionButtonProps) {
  const { decisions, accept, undo } = useDecisions()
  const state = decisions[itemKey]

  if (state === 'accepted') {
    return (
      <Button
        variant="ghost"
        size="sm"
        onClick={() => undo(itemKey, wizardType, confidence)}
        className="text-muted-foreground"
      >
        <Undo2 className="size-3.5" />
        Undo
      </Button>
    )
  }

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={() => accept(itemKey, wizardType, confidence, 'manual')}
      className="text-[var(--confidence-high)]"
    >
      <CheckCircle2 className="size-3.5" />
      Accept
    </Button>
  )
}
