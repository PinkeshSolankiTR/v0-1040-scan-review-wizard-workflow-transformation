'use client'

import { createContext, useContext, useCallback, useState, type ReactNode } from 'react'
import { learnedRules as seedRules, type LearnedRule } from '@/lib/mock-data/learned-rules'
import type { OverrideDetail } from '@/lib/types'

interface LearnedRulesContextValue {
  rules: LearnedRule[]
  addRuleFromOverride: (detail: OverrideDetail, wizardType: LearnedRule['wizardType']) => void
  approveRule: (ruleId: string) => void
  rejectRule: (ruleId: string, reason: string) => void
  deactivateRule: (ruleId: string) => void
  reactivateRule: (ruleId: string) => void
}

const LearnedRulesContext = createContext<LearnedRulesContextValue | null>(null)

/* ── Generate next rule ID ── */
let ruleCounter = 200

function nextRuleId() {
  ruleCounter += 1
  return `LR-${String(ruleCounter).padStart(5, '0')}`
}

/* ── Confidence ramp logic ── */
function computeConfidence(overrideCount: number): { ruleConfidence: LearnedRule['confidence']['ruleConfidence']; autoApply: boolean } {
  if (overrideCount >= 5) return { ruleConfidence: 'high', autoApply: false } // high requires admin approval
  if (overrideCount >= 2) return { ruleConfidence: 'medium', autoApply: false }
  return { ruleConfidence: 'low', autoApply: false }
}

function computeStatus(overrideCount: number): LearnedRule['administration']['status'] {
  if (overrideCount >= 5) return 'pending_review'
  return 'active'
}

export function LearnedRulesProvider({ children }: { children: ReactNode }) {
  const [rules, setRules] = useState<LearnedRule[]>(seedRules)

  /* ── Add or increment a learned rule from a user override ── */
  const addRuleFromOverride = useCallback((detail: OverrideDetail, wizardType: LearnedRule['wizardType']) => {
    setRules(prev => {
      // Check if a similar rule already exists (same formType + same wizard + similar pattern)
      const existingIdx = prev.findIndex(r =>
        r.wizardType === wizardType &&
        r.conditions.formType === detail.formType &&
        r.administration.status !== 'inactive'
      )

      if (existingIdx >= 0) {
        // Increment existing rule
        const existing = prev[existingIdx]
        const newCount = existing.provenance.overrideCount + 1
        const updated: LearnedRule = {
          ...existing,
          provenance: {
            ...existing.provenance,
            overrideCount: newCount,
            sourceOverrides: [
              ...existing.provenance.sourceOverrides,
              {
                overrideId: `OVR-${Date.now().toString(36).toUpperCase()}`,
                userId: 'usr-current',
                userName: 'Current User',
                engagementId: `ENG-${new Date().getFullYear()}-LIVE`,
                timestamp: new Date().toISOString(),
              },
            ],
          },
          confidence: computeConfidence(newCount),
          administration: {
            ...existing.administration,
            status: computeStatus(newCount),
          },
        }
        const next = [...prev]
        next[existingIdx] = updated
        return next
      }

      // Create new rule
      const fieldPatternParts = detail.fieldContext.filter(f => !f.match).map(f => `${f.field} changed`)
      const fieldPattern = fieldPatternParts.length > 0
        ? fieldPatternParts.join(' AND ')
        : `Classification reversed for ${detail.formType}`

      const newRule: LearnedRule = {
        ruleId: nextRuleId(),
        ruleSource: 'LEARNED',
        wizardType,
        appliedRuleSet: wizardType === 'superseded' ? 'SourceDocs' : wizardType === 'duplicate' ? 'DUP-SRC' : 'NFR',
        conditions: {
          formType: detail.formType,
          payerName: null,
          fieldPattern,
          valueRelationship: 'userOverride',
          correctedFlag: null,
        },
        action: {
          classification: detail.userOverrideDecision,
          overrideAIDecision: detail.originalAIDecision,
        },
        provenance: {
          sourceOverrides: [{
            overrideId: `OVR-${Date.now().toString(36).toUpperCase()}`,
            userId: 'usr-current',
            userName: 'Current User',
            engagementId: `ENG-${new Date().getFullYear()}-LIVE`,
            timestamp: new Date().toISOString(),
          }],
          overrideCount: 1,
          firstIdentifiedBy: 'Current User',
          firstIdentifiedDate: new Date().toISOString(),
        },
        confidence: computeConfidence(1),
        administration: {
          status: 'active',
          approvedBy: null,
          approvedDate: null,
          rejectedBy: null,
          rejectedDate: null,
          rejectionReason: null,
          lastTriggeredDate: null,
          triggerCount: 0,
          createdDate: new Date().toISOString(),
        },
      }

      return [...prev, newRule]
    })
  }, [])

  /* ── Admin actions ── */
  const approveRule = useCallback((ruleId: string) => {
    setRules(prev => prev.map(r => r.ruleId === ruleId ? {
      ...r,
      confidence: { ...r.confidence, ruleConfidence: 'high' as const, autoApply: true },
      administration: {
        ...r.administration,
        status: 'active' as const,
        approvedBy: 'Current Admin',
        approvedDate: new Date().toISOString(),
      },
    } : r))
  }, [])

  const rejectRule = useCallback((ruleId: string, reason: string) => {
    setRules(prev => prev.map(r => r.ruleId === ruleId ? {
      ...r,
      administration: {
        ...r.administration,
        status: 'inactive' as const,
        rejectedBy: 'Current Admin',
        rejectedDate: new Date().toISOString(),
        rejectionReason: reason || 'No reason provided',
      },
    } : r))
  }, [])

  const deactivateRule = useCallback((ruleId: string) => {
    setRules(prev => prev.map(r => r.ruleId === ruleId ? {
      ...r,
      administration: { ...r.administration, status: 'inactive' as const },
    } : r))
  }, [])

  const reactivateRule = useCallback((ruleId: string) => {
    setRules(prev => prev.map(r => r.ruleId === ruleId ? {
      ...r,
      administration: {
        ...r.administration,
        status: 'active' as const,
        rejectedBy: null,
        rejectedDate: null,
        rejectionReason: null,
      },
    } : r))
  }, [])

  return (
    <LearnedRulesContext value={{
      rules,
      addRuleFromOverride,
      approveRule,
      rejectRule,
      deactivateRule,
      reactivateRule,
    }}>
      {children}
    </LearnedRulesContext>
  )
}

export function useLearnedRules() {
  const ctx = useContext(LearnedRulesContext)
  if (!ctx) throw new Error('useLearnedRules must be used within LearnedRulesProvider')
  return ctx
}
