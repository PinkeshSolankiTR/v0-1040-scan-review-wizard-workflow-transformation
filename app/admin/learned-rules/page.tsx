'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import {
  ArrowLeft,
  Brain,
  Check,
  ChevronDown,
  ChevronRight,
  Clock,
  Filter,
  Search,
  ShieldCheck,
  Sparkles,
  X,
  AlertTriangle,
  XCircle,
  History,
  BarChart3,
} from 'lucide-react'
import { learnedRules, type LearnedRule } from '@/lib/mock-data/learned-rules'

/* ── Helpers ── */
function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime()
  const days = Math.floor(diff / 86400000)
  if (days === 0) return 'Today'
  if (days === 1) return 'Yesterday'
  if (days < 30) return `${days}d ago`
  return `${Math.floor(days / 30)}mo ago`
}

type StatusFilter = 'all' | 'active' | 'pending_review' | 'inactive'
type ConfFilter = 'all' | 'high' | 'medium' | 'low'

/* ── Status badge styles ── */
const STATUS_STYLES: Record<string, { bg: string; color: string; label: string }> = {
  active: { bg: 'oklch(0.94 0.04 145)', color: 'oklch(0.35 0.14 145)', label: 'Active' },
  pending_review: { bg: 'oklch(0.94 0.06 60)', color: 'oklch(0.45 0.16 60)', label: 'Pending Review' },
  inactive: { bg: 'oklch(0.94 0.01 260)', color: 'oklch(0.45 0.01 260)', label: 'Inactive' },
}

const CONF_STYLES: Record<string, { bg: string; color: string }> = {
  high: { bg: 'oklch(0.94 0.04 145)', color: 'oklch(0.40 0.16 145)' },
  medium: { bg: 'oklch(0.94 0.06 75)', color: 'oklch(0.50 0.16 75)' },
  low: { bg: 'oklch(0.94 0.04 25)', color: 'oklch(0.45 0.16 25)' },
}

/* ── Main page ── */
export default function LearnedRulesPage() {
  const [rules, setRules] = useState<LearnedRule[]>(learnedRules)
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [confFilter, setConfFilter] = useState<ConfFilter>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [expandedRuleId, setExpandedRuleId] = useState<string | null>(null)
  const [rejectingRuleId, setRejectingRuleId] = useState<string | null>(null)
  const [rejectionReason, setRejectionReason] = useState('')

  /* Filtered rules */
  const filtered = useMemo(() => {
    return rules.filter(r => {
      if (statusFilter !== 'all' && r.administration.status !== statusFilter) return false
      if (confFilter !== 'all' && r.confidence.ruleConfidence !== confFilter) return false
      if (searchQuery) {
        const q = searchQuery.toLowerCase()
        return (
          r.ruleId.toLowerCase().includes(q) ||
          r.conditions.formType.toLowerCase().includes(q) ||
          r.conditions.fieldPattern.toLowerCase().includes(q) ||
          (r.conditions.payerName?.toLowerCase().includes(q) ?? false)
        )
      }
      return true
    })
  }, [rules, statusFilter, confFilter, searchQuery])

  /* Summary stats */
  const stats = useMemo(() => ({
    total: rules.length,
    active: rules.filter(r => r.administration.status === 'active').length,
    pending: rules.filter(r => r.administration.status === 'pending_review').length,
    inactive: rules.filter(r => r.administration.status === 'inactive').length,
    totalOverrides: rules.reduce((s, r) => s + r.provenance.overrideCount, 0),
    totalTriggers: rules.reduce((s, r) => s + r.administration.triggerCount, 0),
  }), [rules])

  /* Actions */
  const handleApprove = (ruleId: string) => {
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
  }

  const handleReject = (ruleId: string) => {
    setRules(prev => prev.map(r => r.ruleId === ruleId ? {
      ...r,
      administration: {
        ...r.administration,
        status: 'inactive' as const,
        rejectedBy: 'Current Admin',
        rejectedDate: new Date().toISOString(),
        rejectionReason: rejectionReason || 'No reason provided',
      },
    } : r))
    setRejectingRuleId(null)
    setRejectionReason('')
  }

  const handleDeactivate = (ruleId: string) => {
    setRules(prev => prev.map(r => r.ruleId === ruleId ? {
      ...r,
      administration: {
        ...r.administration,
        status: 'inactive' as const,
      },
    } : r))
  }

  const handleReactivate = (ruleId: string) => {
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
  }

  return (
    <div style={{
      minBlockSize: '100vh',
      backgroundColor: 'oklch(0.97 0.003 260)',
      fontFamily: 'var(--font-sans)',
    }}>
      {/* ── Header ── */}
      <header style={{
        display: 'flex', alignItems: 'center', gap: '1rem',
        padding: '0.875rem 1.5rem',
        backgroundColor: 'oklch(0.2 0.01 260)',
        color: 'oklch(0.92 0 0)',
      }}>
        <Link href="/binder/demo-a" style={{ display: 'flex', alignItems: 'center', color: 'oklch(0.65 0.01 260)', textDecoration: 'none' }}>
          <ArrowLeft style={{ inlineSize: '1.125rem', blockSize: '1.125rem' }} />
        </Link>
        <Brain style={{ inlineSize: '1.25rem', blockSize: '1.25rem', color: 'oklch(0.7 0.15 250)' }} />
        <h1 style={{ fontSize: '1rem', fontWeight: 700, margin: 0, letterSpacing: '-0.01em' }}>
          AI Learned Rules Administration
        </h1>
        <span style={{
          fontSize: '0.625rem', fontWeight: 600, fontFamily: 'var(--font-mono)',
          padding: '0.125rem 0.375rem', borderRadius: '0.1875rem',
          backgroundColor: 'oklch(0.3 0.015 260)', color: 'oklch(0.65 0.01 260)',
          textTransform: 'uppercase', letterSpacing: '0.05em',
        }}>
          Admin
        </span>
        {stats.pending > 0 && (
          <span style={{
            marginInlineStart: 'auto',
            display: 'flex', alignItems: 'center', gap: '0.375rem',
            fontSize: '0.75rem', fontWeight: 600,
            padding: '0.25rem 0.625rem', borderRadius: '1rem',
            backgroundColor: 'oklch(0.45 0.16 60)', color: 'oklch(1 0 0)',
          }}>
            <AlertTriangle style={{ inlineSize: '0.75rem', blockSize: '0.75rem' }} />
            {stats.pending} pending review
          </span>
        )}
      </header>

      <div style={{ padding: '1.5rem', maxInlineSize: '80rem', marginInline: 'auto' }}>
        {/* ── Summary Stats ── */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(10rem, 1fr))',
          gap: '0.75rem',
          marginBlockEnd: '1.5rem',
        }}>
          {[
            { label: 'Total Rules', value: stats.total, icon: Brain, color: 'oklch(0.55 0.15 250)' },
            { label: 'Active', value: stats.active, icon: Check, color: 'oklch(0.45 0.16 145)' },
            { label: 'Pending Review', value: stats.pending, icon: Clock, color: 'oklch(0.55 0.16 60)' },
            { label: 'Inactive', value: stats.inactive, icon: XCircle, color: 'oklch(0.5 0.01 260)' },
            { label: 'Total Overrides', value: stats.totalOverrides, icon: History, color: 'oklch(0.55 0.15 250)' },
            { label: 'Total Triggers', value: stats.totalTriggers, icon: BarChart3, color: 'oklch(0.55 0.17 145)' },
          ].map(stat => (
            <div key={stat.label} style={{
              display: 'flex', alignItems: 'center', gap: '0.75rem',
              padding: '0.875rem 1rem',
              backgroundColor: 'oklch(1 0 0)',
              borderRadius: '0.375rem',
              border: '0.0625rem solid oklch(0.91 0.005 260)',
            }}>
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                inlineSize: '2.25rem', blockSize: '2.25rem', borderRadius: '0.375rem',
                backgroundColor: `${stat.color} / 0.08`,
              }}>
                <stat.icon style={{ inlineSize: '1.125rem', blockSize: '1.125rem', color: stat.color }} />
              </div>
              <div>
                <p style={{ fontSize: '1.375rem', fontWeight: 800, fontFamily: 'var(--font-mono)', color: 'oklch(0.2 0.01 260)', margin: 0, lineHeight: 1.1 }}>
                  {stat.value}
                </p>
                <p style={{ fontSize: '0.6875rem', fontWeight: 500, color: 'oklch(0.5 0.01 260)', margin: 0 }}>
                  {stat.label}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* ── Filters ── */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: '0.75rem',
          padding: '0.75rem 1rem',
          backgroundColor: 'oklch(1 0 0)',
          borderRadius: '0.375rem 0.375rem 0 0',
          border: '0.0625rem solid oklch(0.91 0.005 260)',
          borderBlockEnd: 'none',
          flexWrap: 'wrap',
        }}>
          <Filter style={{ inlineSize: '0.875rem', blockSize: '0.875rem', color: 'oklch(0.5 0.01 260)' }} />

          {/* Status filter */}
          <div style={{ display: 'flex', gap: '0.25rem' }}>
            {(['all', 'active', 'pending_review', 'inactive'] as StatusFilter[]).map(s => (
              <button
                key={s}
                type="button"
                onClick={() => setStatusFilter(s)}
                style={{
                  padding: '0.25rem 0.5rem', borderRadius: '0.25rem', border: 'none',
                  fontSize: '0.6875rem', fontWeight: 600, cursor: 'pointer',
                  backgroundColor: statusFilter === s ? 'oklch(0.2 0.01 260)' : 'oklch(0.96 0.005 260)',
                  color: statusFilter === s ? 'oklch(1 0 0)' : 'oklch(0.45 0.01 260)',
                }}
              >
                {s === 'all' ? 'All Status' : s === 'pending_review' ? 'Pending' : s.charAt(0).toUpperCase() + s.slice(1)}
              </button>
            ))}
          </div>

          {/* Confidence filter */}
          <div style={{ display: 'flex', gap: '0.25rem', borderInlineStart: '0.0625rem solid oklch(0.91 0.005 260)', paddingInlineStart: '0.75rem' }}>
            {(['all', 'high', 'medium', 'low'] as ConfFilter[]).map(c => (
              <button
                key={c}
                type="button"
                onClick={() => setConfFilter(c)}
                style={{
                  padding: '0.25rem 0.5rem', borderRadius: '0.25rem', border: 'none',
                  fontSize: '0.6875rem', fontWeight: 600, cursor: 'pointer',
                  backgroundColor: confFilter === c ? 'oklch(0.2 0.01 260)' : 'oklch(0.96 0.005 260)',
                  color: confFilter === c ? 'oklch(1 0 0)' : 'oklch(0.45 0.01 260)',
                }}
              >
                {c === 'all' ? 'All Confidence' : c.charAt(0).toUpperCase() + c.slice(1)}
              </button>
            ))}
          </div>

          {/* Search */}
          <div style={{
            marginInlineStart: 'auto',
            display: 'flex', alignItems: 'center', gap: '0.375rem',
            padding: '0.25rem 0.5rem',
            border: '0.0625rem solid oklch(0.88 0.01 260)', borderRadius: '0.25rem',
            backgroundColor: 'oklch(0.98 0.003 260)',
          }}>
            <Search style={{ inlineSize: '0.8125rem', blockSize: '0.8125rem', color: 'oklch(0.55 0.01 260)' }} />
            <input
              type="search"
              placeholder="Search rules..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              style={{
                border: 'none', outline: 'none', background: 'transparent',
                fontSize: '0.75rem', color: 'oklch(0.2 0.01 260)',
                inlineSize: '10rem',
              }}
            />
          </div>
        </div>

        {/* ── Rules Table ── */}
        <div style={{
          backgroundColor: 'oklch(1 0 0)',
          border: '0.0625rem solid oklch(0.91 0.005 260)',
          borderRadius: '0 0 0.375rem 0.375rem',
          overflow: 'hidden',
        }}>
          {/* Table Header */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '5.5rem 1fr 7rem 5rem 5rem 5.5rem 5.5rem 10rem',
            gap: '0.5rem',
            padding: '0.625rem 1rem',
            backgroundColor: 'oklch(0.97 0.003 260)',
            borderBlockEnd: '0.0625rem solid oklch(0.91 0.005 260)',
            fontSize: '0.625rem', fontWeight: 700,
            color: 'oklch(0.45 0.01 260)',
            textTransform: 'uppercase', letterSpacing: '0.05em',
          }}>
            <span>Rule ID</span>
            <span>Pattern</span>
            <span>Form Type</span>
            <span>Overrides</span>
            <span>Confidence</span>
            <span>Status</span>
            <span>Last Trigger</span>
            <span>Actions</span>
          </div>

          {/* Table Rows */}
          {filtered.length === 0 && (
            <div style={{ padding: '2rem', textAlign: 'center', color: 'oklch(0.5 0.01 260)', fontSize: '0.875rem' }}>
              No rules match the current filters.
            </div>
          )}

          {filtered.map(rule => {
            const isExpanded = expandedRuleId === rule.ruleId
            const isPending = rule.administration.status === 'pending_review'
            const isInactive = rule.administration.status === 'inactive'
            const statusStyle = STATUS_STYLES[rule.administration.status]
            const confStyle = CONF_STYLES[rule.confidence.ruleConfidence]

            return (
              <div key={rule.ruleId}>
                {/* Row */}
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '5.5rem 1fr 7rem 5rem 5rem 5.5rem 5.5rem 10rem',
                    gap: '0.5rem',
                    padding: '0.75rem 1rem',
                    alignItems: 'center',
                    borderBlockEnd: '0.0625rem solid oklch(0.95 0.003 260)',
                    backgroundColor: isPending ? 'oklch(0.99 0.01 60)' : 'oklch(1 0 0)',
                    cursor: 'pointer',
                    opacity: isInactive ? 0.6 : 1,
                  }}
                  onClick={() => setExpandedRuleId(isExpanded ? null : rule.ruleId)}
                >
                  {/* Rule ID */}
                  <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                    {isExpanded
                      ? <ChevronDown style={{ inlineSize: '0.75rem', blockSize: '0.75rem', color: 'oklch(0.5 0.01 260)', flexShrink: 0 }} />
                      : <ChevronRight style={{ inlineSize: '0.75rem', blockSize: '0.75rem', color: 'oklch(0.5 0.01 260)', flexShrink: 0 }} />
                    }
                    <span style={{ fontSize: '0.75rem', fontWeight: 700, fontFamily: 'var(--font-mono)', color: 'oklch(0.35 0.15 250)' }}>
                      {rule.ruleId}
                    </span>
                  </span>

                  {/* Pattern */}
                  <span style={{
                    fontSize: '0.75rem', color: 'oklch(0.25 0.01 260)', fontWeight: 500,
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  }}>
                    {rule.conditions.fieldPattern}
                  </span>

                  {/* Form Type */}
                  <span style={{
                    fontSize: '0.6875rem', fontWeight: 600, fontFamily: 'var(--font-mono)',
                    padding: '0.125rem 0.375rem', borderRadius: '0.1875rem',
                    backgroundColor: 'oklch(0.96 0.005 260)', color: 'oklch(0.35 0.01 260)',
                    textAlign: 'center',
                  }}>
                    {rule.conditions.formType}
                  </span>

                  {/* Override count */}
                  <span style={{ fontSize: '0.8125rem', fontWeight: 700, fontFamily: 'var(--font-mono)', color: 'oklch(0.3 0.01 260)', textAlign: 'center' }}>
                    {rule.provenance.overrideCount}
                  </span>

                  {/* Confidence */}
                  <span style={{
                    fontSize: '0.625rem', fontWeight: 700,
                    padding: '0.125rem 0.375rem', borderRadius: '0.1875rem',
                    backgroundColor: confStyle.bg, color: confStyle.color,
                    textAlign: 'center', textTransform: 'uppercase',
                  }}>
                    {rule.confidence.ruleConfidence}
                  </span>

                  {/* Status */}
                  <span style={{
                    fontSize: '0.625rem', fontWeight: 700,
                    padding: '0.125rem 0.375rem', borderRadius: '0.1875rem',
                    backgroundColor: statusStyle.bg, color: statusStyle.color,
                    textAlign: 'center',
                  }}>
                    {statusStyle.label}
                  </span>

                  {/* Last Triggered */}
                  <span style={{ fontSize: '0.6875rem', color: 'oklch(0.5 0.01 260)', textAlign: 'center' }}>
                    {rule.administration.lastTriggeredDate ? timeAgo(rule.administration.lastTriggeredDate) : 'Never'}
                  </span>

                  {/* Actions */}
                  <div style={{ display: 'flex', gap: '0.375rem' }} onClick={e => e.stopPropagation()}>
                    {isPending && (
                      <>
                        <button
                          type="button"
                          onClick={() => handleApprove(rule.ruleId)}
                          style={{
                            display: 'flex', alignItems: 'center', gap: '0.25rem',
                            padding: '0.25rem 0.5rem', border: 'none', borderRadius: '0.25rem',
                            backgroundColor: 'oklch(0.45 0.18 145)', color: 'oklch(1 0 0)',
                            fontSize: '0.6875rem', fontWeight: 600, cursor: 'pointer',
                          }}
                        >
                          <ShieldCheck style={{ inlineSize: '0.75rem', blockSize: '0.75rem' }} />
                          Approve
                        </button>
                        <button
                          type="button"
                          onClick={() => { setRejectingRuleId(rule.ruleId); setRejectionReason('') }}
                          style={{
                            display: 'flex', alignItems: 'center', gap: '0.25rem',
                            padding: '0.25rem 0.5rem', borderRadius: '0.25rem',
                            border: '0.0625rem solid oklch(0.85 0.04 25)',
                            backgroundColor: 'oklch(1 0 0)', color: 'oklch(0.5 0.16 25)',
                            fontSize: '0.6875rem', fontWeight: 600, cursor: 'pointer',
                          }}
                        >
                          <X style={{ inlineSize: '0.75rem', blockSize: '0.75rem' }} />
                          Reject
                        </button>
                      </>
                    )}
                    {rule.administration.status === 'active' && (
                      <button
                        type="button"
                        onClick={() => handleDeactivate(rule.ruleId)}
                        style={{
                          display: 'flex', alignItems: 'center', gap: '0.25rem',
                          padding: '0.25rem 0.5rem', borderRadius: '0.25rem',
                          border: '0.0625rem solid oklch(0.88 0.01 260)',
                          backgroundColor: 'oklch(1 0 0)', color: 'oklch(0.45 0.01 260)',
                          fontSize: '0.6875rem', fontWeight: 600, cursor: 'pointer',
                        }}
                      >
                        Deactivate
                      </button>
                    )}
                    {isInactive && (
                      <button
                        type="button"
                        onClick={() => handleReactivate(rule.ruleId)}
                        style={{
                          display: 'flex', alignItems: 'center', gap: '0.25rem',
                          padding: '0.25rem 0.5rem', borderRadius: '0.25rem',
                          border: '0.0625rem solid oklch(0.88 0.01 260)',
                          backgroundColor: 'oklch(1 0 0)', color: 'oklch(0.45 0.15 250)',
                          fontSize: '0.6875rem', fontWeight: 600, cursor: 'pointer',
                        }}
                      >
                        Reactivate
                      </button>
                    )}
                  </div>
                </div>

                {/* Rejection reason input */}
                {rejectingRuleId === rule.ruleId && (
                  <div style={{
                    padding: '0.75rem 1rem 0.75rem 2.5rem',
                    backgroundColor: 'oklch(0.98 0.01 25)',
                    borderBlockEnd: '0.0625rem solid oklch(0.92 0.03 25)',
                    display: 'flex', alignItems: 'center', gap: '0.5rem',
                  }}>
                    <label htmlFor={`reject-${rule.ruleId}`} style={{ fontSize: '0.75rem', fontWeight: 600, color: 'oklch(0.4 0.12 25)', flexShrink: 0 }}>
                      Rejection reason:
                    </label>
                    <input
                      id={`reject-${rule.ruleId}`}
                      type="text"
                      value={rejectionReason}
                      onChange={e => setRejectionReason(e.target.value)}
                      placeholder="Why is this rule being rejected?"
                      style={{
                        flex: 1, padding: '0.375rem 0.5rem', border: '0.0625rem solid oklch(0.85 0.04 25)',
                        borderRadius: '0.25rem', fontSize: '0.75rem', outline: 'none',
                        backgroundColor: 'oklch(1 0 0)',
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => handleReject(rule.ruleId)}
                      style={{
                        padding: '0.375rem 0.75rem', border: 'none', borderRadius: '0.25rem',
                        backgroundColor: 'oklch(0.5 0.2 25)', color: 'oklch(1 0 0)',
                        fontSize: '0.6875rem', fontWeight: 600, cursor: 'pointer',
                      }}
                    >
                      Confirm Reject
                    </button>
                    <button
                      type="button"
                      onClick={() => setRejectingRuleId(null)}
                      style={{
                        padding: '0.375rem', border: 'none', borderRadius: '0.25rem',
                        backgroundColor: 'transparent', color: 'oklch(0.5 0.01 260)',
                        cursor: 'pointer',
                      }}
                    >
                      <X style={{ inlineSize: '0.875rem', blockSize: '0.875rem' }} />
                    </button>
                  </div>
                )}

                {/* ── Expanded Detail Panel ── */}
                {isExpanded && (
                  <div style={{
                    padding: '1rem 1rem 1rem 2.5rem',
                    backgroundColor: 'oklch(0.98 0.003 260)',
                    borderBlockEnd: '0.125rem solid oklch(0.88 0.01 260)',
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: '1rem',
                  }}>
                    {/* Left: Conditions + Action */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
                      {/* Conditions */}
                      <div>
                        <h4 style={{
                          fontSize: '0.625rem', fontWeight: 700, margin: '0 0 0.5rem',
                          color: 'oklch(0.45 0.01 260)', textTransform: 'uppercase', letterSpacing: '0.05em',
                        }}>
                          Conditions
                        </h4>
                        <dl style={{ margin: 0, display: 'grid', gridTemplateColumns: '7rem 1fr', gap: '0.25rem 0.5rem' }}>
                          {[
                            ['Form Type', rule.conditions.formType],
                            ['Payer', rule.conditions.payerName ?? 'Any'],
                            ['Field Pattern', rule.conditions.fieldPattern],
                            ['Value Relationship', rule.conditions.valueRelationship],
                            ['Corrected Flag', rule.conditions.correctedFlag === null ? 'N/A' : rule.conditions.correctedFlag ? 'Yes' : 'No'],
                          ].map(([label, val]) => (
                            <div key={label} style={{ display: 'contents' }}>
                              <dt style={{ fontSize: '0.6875rem', fontWeight: 600, color: 'oklch(0.45 0.01 260)' }}>{label}</dt>
                              <dd style={{ fontSize: '0.6875rem', color: 'oklch(0.25 0.01 260)', margin: 0 }}>{val}</dd>
                            </div>
                          ))}
                        </dl>
                      </div>

                      {/* Action */}
                      <div>
                        <h4 style={{
                          fontSize: '0.625rem', fontWeight: 700, margin: '0 0 0.5rem',
                          color: 'oklch(0.45 0.01 260)', textTransform: 'uppercase', letterSpacing: '0.05em',
                        }}>
                          Action
                        </h4>
                        <div style={{
                          padding: '0.5rem 0.625rem', borderRadius: '0.25rem',
                          border: '0.0625rem solid oklch(0.91 0.005 260)',
                          backgroundColor: 'oklch(1 0 0)',
                        }}>
                          <p style={{ fontSize: '0.75rem', fontWeight: 600, color: 'oklch(0.35 0.14 145)', margin: '0 0 0.25rem' }}>
                            {rule.action.classification}
                          </p>
                          <p style={{ fontSize: '0.6875rem', color: 'oklch(0.5 0.01 260)', margin: 0 }}>
                            {rule.action.overrideAIDecision}
                          </p>
                        </div>
                      </div>

                      {/* Admin Info */}
                      <div>
                        <h4 style={{
                          fontSize: '0.625rem', fontWeight: 700, margin: '0 0 0.5rem',
                          color: 'oklch(0.45 0.01 260)', textTransform: 'uppercase', letterSpacing: '0.05em',
                        }}>
                          Administration
                        </h4>
                        <dl style={{ margin: 0, display: 'grid', gridTemplateColumns: '7rem 1fr', gap: '0.25rem 0.5rem' }}>
                          {[
                            ['Wizard', rule.wizardType],
                            ['Rule Set', rule.appliedRuleSet],
                            ['Auto-Apply', rule.confidence.autoApply ? 'Yes' : 'No'],
                            ['Created', formatDate(rule.administration.createdDate)],
                            ['Trigger Count', String(rule.administration.triggerCount)],
                            ...(rule.administration.approvedBy ? [['Approved By', `${rule.administration.approvedBy} on ${formatDate(rule.administration.approvedDate!)}`]] : []),
                            ...(rule.administration.rejectedBy ? [['Rejected By', `${rule.administration.rejectedBy} on ${formatDate(rule.administration.rejectedDate!)}`]] : []),
                          ].map(([label, val]) => (
                            <div key={label} style={{ display: 'contents' }}>
                              <dt style={{ fontSize: '0.6875rem', fontWeight: 600, color: 'oklch(0.45 0.01 260)' }}>{label}</dt>
                              <dd style={{ fontSize: '0.6875rem', color: 'oklch(0.25 0.01 260)', margin: 0 }}>{val}</dd>
                            </div>
                          ))}
                        </dl>
                        {rule.administration.rejectionReason && (
                          <div style={{
                            marginBlockStart: '0.5rem',
                            padding: '0.375rem 0.5rem', borderRadius: '0.25rem',
                            backgroundColor: 'oklch(0.96 0.03 25)',
                            border: '0.0625rem solid oklch(0.88 0.06 25)',
                          }}>
                            <p style={{ fontSize: '0.625rem', fontWeight: 700, color: 'oklch(0.45 0.14 25)', margin: '0 0 0.125rem', textTransform: 'uppercase' }}>
                              Rejection Reason
                            </p>
                            <p style={{ fontSize: '0.6875rem', color: 'oklch(0.35 0.1 25)', margin: 0 }}>
                              {rule.administration.rejectionReason}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Right: Override History */}
                    <div>
                      <h4 style={{
                        fontSize: '0.625rem', fontWeight: 700, margin: '0 0 0.5rem',
                        color: 'oklch(0.45 0.01 260)', textTransform: 'uppercase', letterSpacing: '0.05em',
                        display: 'flex', alignItems: 'center', gap: '0.375rem',
                      }}>
                        <History style={{ inlineSize: '0.75rem', blockSize: '0.75rem' }} />
                        Override History ({rule.provenance.overrideCount} overrides)
                      </h4>

                      <div style={{
                        border: '0.0625rem solid oklch(0.91 0.005 260)',
                        borderRadius: '0.25rem', overflow: 'hidden',
                        backgroundColor: 'oklch(1 0 0)',
                      }}>
                        {/* Override table header */}
                        <div style={{
                          display: 'grid', gridTemplateColumns: '5rem 1fr 1fr 1fr',
                          gap: '0.5rem', padding: '0.375rem 0.625rem',
                          backgroundColor: 'oklch(0.97 0.003 260)',
                          borderBlockEnd: '0.0625rem solid oklch(0.91 0.005 260)',
                          fontSize: '0.5625rem', fontWeight: 700,
                          color: 'oklch(0.5 0.01 260)',
                          textTransform: 'uppercase', letterSpacing: '0.04em',
                        }}>
                          <span>ID</span>
                          <span>User</span>
                          <span>Engagement</span>
                          <span>Date</span>
                        </div>

                        {rule.provenance.sourceOverrides.map(ovr => (
                          <div key={ovr.overrideId} style={{
                            display: 'grid', gridTemplateColumns: '5rem 1fr 1fr 1fr',
                            gap: '0.5rem', padding: '0.375rem 0.625rem',
                            borderBlockEnd: '0.0625rem solid oklch(0.96 0.003 260)',
                            fontSize: '0.6875rem',
                          }}>
                            <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, color: 'oklch(0.4 0.12 250)' }}>
                              {ovr.overrideId}
                            </span>
                            <span style={{ color: 'oklch(0.3 0.01 260)', fontWeight: 500 }}>
                              {ovr.userName}
                            </span>
                            <span style={{ fontFamily: 'var(--font-mono)', color: 'oklch(0.4 0.01 260)' }}>
                              {ovr.engagementId}
                            </span>
                            <span style={{ color: 'oklch(0.5 0.01 260)' }}>
                              {formatDateTime(ovr.timestamp)}
                            </span>
                          </div>
                        ))}
                      </div>

                      {/* Provenance footer */}
                      <div style={{
                        marginBlockStart: '0.5rem',
                        padding: '0.375rem 0.625rem',
                        backgroundColor: 'oklch(0.97 0.005 240)',
                        borderRadius: '0.25rem',
                        border: '0.0625rem solid oklch(0.92 0.01 240)',
                        display: 'flex', alignItems: 'center', gap: '0.375rem',
                      }}>
                        <Sparkles style={{ inlineSize: '0.75rem', blockSize: '0.75rem', color: 'oklch(0.55 0.15 250)' }} />
                        <span style={{ fontSize: '0.6875rem', color: 'oklch(0.4 0.01 260)' }}>
                          First identified by <strong>{rule.provenance.firstIdentifiedBy}</strong> on {formatDate(rule.provenance.firstIdentifiedDate)}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
