'use client'

import { createContext, useContext, useState, useMemo, type ReactNode } from 'react'

export type WizardId = 'superseded' | 'cfa' | 'duplicate' | 'nfr'

export interface WizardStep {
  id: WizardId
  label: string
  count: number
  completed: boolean
  enabled: boolean
}

interface WizardPipelineContextValue {
  activeWizard: WizardId
  setActiveWizard: (id: WizardId) => void
  wizardSteps: WizardStep[]
  updateSteps: (steps: WizardStep[]) => void
}

const WizardPipelineContext = createContext<WizardPipelineContextValue | null>(null)

export function WizardPipelineProvider({ children }: { children: ReactNode }) {
  const [activeWizard, setActiveWizard] = useState<WizardId>('superseded')
  const [wizardSteps, setWizardSteps] = useState<WizardStep[]>([
    { id: 'superseded', label: 'Superseded', count: 0, completed: false, enabled: true },
    { id: 'cfa', label: 'CFA', count: 0, completed: false, enabled: false },
    { id: 'duplicate', label: 'Duplicate', count: 0, completed: false, enabled: false },
    { id: 'nfr', label: 'NFR', count: 0, completed: false, enabled: false },
  ])

  const value = useMemo(() => ({
    activeWizard,
    setActiveWizard,
    wizardSteps,
    updateSteps: setWizardSteps,
  }), [activeWizard, wizardSteps])

  return (
    <WizardPipelineContext.Provider value={value}>
      {children}
    </WizardPipelineContext.Provider>
  )
}

export function useWizardPipeline() {
  const ctx = useContext(WizardPipelineContext)
  if (!ctx) throw new Error('useWizardPipeline must be used within WizardPipelineProvider')
  return ctx
}
