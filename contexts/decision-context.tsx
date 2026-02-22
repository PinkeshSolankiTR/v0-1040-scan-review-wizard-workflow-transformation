'use client'

import { createContext, useContext, useCallback, useState, type ReactNode } from 'react'
import type { AuditEntry, WizardType } from '@/lib/types'

interface DecisionContextValue {
  decisions: Record<string, 'accepted' | 'undone'>
  auditLog: AuditEntry[]
  accept: (itemKey: string, wizardType: WizardType, confidence: number, method: 'manual' | 'bulk') => void
  undo: (itemKey: string, wizardType: WizardType, confidence: number) => void
  acceptAllHighConfidence: (items: { key: string; wizardType: WizardType; confidence: number }[]) => void
  isAccepted: (itemKey: string) => boolean
}

const DecisionContext = createContext<DecisionContextValue | null>(null)

export function DecisionProvider({ children, seedAudit = [] }: { children: ReactNode; seedAudit?: AuditEntry[] }) {
  const [decisions, setDecisions] = useState<Record<string, 'accepted' | 'undone'>>({})
  const [auditLog, setAuditLog] = useState<AuditEntry[]>(seedAudit)

  const accept = useCallback((itemKey: string, wizardType: WizardType, confidence: number, method: 'manual' | 'bulk') => {
    setDecisions(prev => ({ ...prev, [itemKey]: 'accepted' }))
    setAuditLog(prev => [...prev, {
      timestamp: new Date().toISOString(),
      wizardType,
      itemKey,
      action: 'accepted',
      confidence,
      method,
    }])
  }, [])

  const undo = useCallback((itemKey: string, wizardType: WizardType, confidence: number) => {
    setDecisions(prev => ({ ...prev, [itemKey]: 'undone' }))
    setAuditLog(prev => [...prev, {
      timestamp: new Date().toISOString(),
      wizardType,
      itemKey,
      action: 'undone',
      confidence,
      method: 'manual',
    }])
  }, [])

  const acceptAllHighConfidence = useCallback((items: { key: string; wizardType: WizardType; confidence: number }[]) => {
    const highItems = items.filter(i => i.confidence >= 0.9)
    setDecisions(prev => {
      const next = { ...prev }
      for (const item of highItems) {
        next[item.key] = 'accepted'
      }
      return next
    })
    setAuditLog(prev => [
      ...prev,
      ...highItems.map(item => ({
        timestamp: new Date().toISOString(),
        wizardType: item.wizardType,
        itemKey: item.key,
        action: 'accepted' as const,
        confidence: item.confidence,
        method: 'bulk' as const,
      })),
    ])
  }, [])

  const isAccepted = useCallback((itemKey: string) => decisions[itemKey] === 'accepted', [decisions])

  return (
    <DecisionContext value={{ decisions, auditLog, accept, undo, acceptAllHighConfidence, isAccepted }}>
      {children}
    </DecisionContext>
  )
}

export function useDecisions() {
  const ctx = useContext(DecisionContext)
  if (!ctx) throw new Error('useDecisions must be used within DecisionProvider')
  return ctx
}
