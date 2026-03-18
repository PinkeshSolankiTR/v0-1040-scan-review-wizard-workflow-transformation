'use client'

import Link from 'next/link'
import { useState, useMemo } from 'react'
import {
  ArrowLeft,
  Search,
  ChevronRight,
  FileText,
  CheckCircle,
  AlertTriangle,
  User,
  Trash2,
  ExternalLink,
  ChevronLeft,
  ChevronsLeft,
  ChevronsRight,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { Progress } from '@/components/ui/progress'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  ENGAGEMENT_SUMMARY,
  DOCUMENTS_SUMMARY,
  DOCUMENT_ITEMS,
  FORM_TYPE_FILTER_OPTIONS,
  STATUS_FILTER_OPTIONS,
} from '@/lib/initial-draft-data'

export default function InitialDraftPage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [formTypeFilter, setFormTypeFilter] = useState('All')
  const [statusFilter, setStatusFilter] = useState('All')
  const [selectedDocs, setSelectedDocs] = useState<Set<string>>(new Set())

  const filteredDocs = useMemo(() => {
    return DOCUMENT_ITEMS.filter(doc => {
      const matchesSearch = !searchQuery || doc.name.toLowerCase().includes(searchQuery.toLowerCase())
      const matchesFormType = formTypeFilter === 'All' || doc.formType === formTypeFilter
      const matchesStatus = statusFilter === 'All' || doc.status === statusFilter
      return matchesSearch && matchesFormType && matchesStatus
    })
  }, [searchQuery, formTypeFilter, statusFilter])

  const toggleDoc = (id: string) => {
    setSelectedDocs(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const toggleAll = () => {
    if (selectedDocs.size === filteredDocs.length) {
      setSelectedDocs(new Set())
    } else {
      setSelectedDocs(new Set(filteredDocs.map(d => d.id)))
    }
  }

  const completionPct = 78

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Top bar */}
      <header className="border-b border-border bg-card px-6 py-4">
        <div className="mx-auto flex max-w-[1280px] items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-foreground">
              1040SCAN Quick Validation Dashboard
            </h1>
            <p className="text-sm text-muted-foreground">
              Automated Tax Processing Platform
            </p>
          </div>
          <div className="flex items-center gap-4">
            {/* Progress */}
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <AlertTriangle className="size-3.5" style={{ color: 'oklch(0.65 0.18 45)' }} />
                <span>{completionPct}% Complete</span>
              </div>
              <Progress value={completionPct} className="h-2 w-28" />
            </div>
            {/* Submit */}
            <Button className="gap-1.5" style={{ backgroundColor: 'oklch(0.25 0.01 260)', color: 'oklch(0.98 0 0)' }}>
              <CheckCircle className="size-3.5" />
              Submit
            </Button>
            {/* Open Review Wizard */}
            <Link
              href="/initial-draft"
              className="flex items-center gap-1 text-sm font-medium text-foreground hover:underline"
            >
              Open Review Wizard
              <ChevronRight className="size-4" />
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1 bg-background">
        <div className="mx-auto max-w-[1280px] px-6 py-6">
          {/* Back link */}
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-5"
          >
            <ArrowLeft className="size-3.5" />
            Back to Home
          </Link>

          {/* Engagement + Documents Summary */}
          <div className="grid grid-cols-5 gap-5 mb-6">
            {/* Engagement Summary */}
            <div className="col-span-3 rounded-lg border border-border bg-card p-5">
              <div className="flex items-center gap-2 mb-4">
                <User className="size-4 text-muted-foreground" />
                <span className="text-sm font-semibold text-foreground">Engagement Summary</span>
              </div>
              <div className="grid grid-cols-4 gap-x-8 gap-y-3">
                {[
                  { label: 'Tax Year', value: ENGAGEMENT_SUMMARY.taxYear },
                  { label: 'Engagement ID', value: ENGAGEMENT_SUMMARY.engagementId },
                  { label: 'Client Number', value: ENGAGEMENT_SUMMARY.clientNumber },
                  { label: 'Pages Uploaded', value: ENGAGEMENT_SUMMARY.pagesUploaded },
                  { label: 'Tax Software', value: ENGAGEMENT_SUMMARY.taxSoftware },
                  { label: 'Office Location', value: ENGAGEMENT_SUMMARY.officeLocation },
                  { label: 'Resident State', value: ENGAGEMENT_SUMMARY.residentState },
                  { label: 'Filing Status', value: ENGAGEMENT_SUMMARY.filingStatus },
                ].map(item => (
                  <div key={item.label}>
                    <p className="text-xs text-muted-foreground">{item.label}</p>
                    <p className="text-sm font-semibold text-foreground">{item.value}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Documents Summary */}
            <div className="col-span-2 rounded-lg border border-border bg-card p-5">
              <div className="flex items-center gap-2 mb-4">
                <FileText className="size-4 text-muted-foreground" />
                <span className="text-sm font-semibold text-foreground">Documents Summary</span>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="rounded-lg border border-border px-3 py-4 text-center">
                  <p className="text-xs text-muted-foreground mb-1">Total Pages</p>
                  <div className="flex items-center justify-center gap-1.5">
                    <FileText className="size-4 text-muted-foreground" />
                    <span className="text-lg font-bold text-foreground">{DOCUMENTS_SUMMARY.totalPages}</span>
                  </div>
                </div>
                <div className="rounded-lg border border-border px-3 py-4 text-center">
                  <p className="text-xs text-muted-foreground mb-1">Confident</p>
                  <div className="flex items-center justify-center gap-1.5">
                    <CheckCircle className="size-4" style={{ color: 'oklch(0.55 0.17 145)' }} />
                    <span className="text-lg font-bold text-foreground">{DOCUMENTS_SUMMARY.confident}</span>
                  </div>
                </div>
                <div className="rounded-lg border border-border px-3 py-4 text-center">
                  <p className="text-xs text-muted-foreground mb-1">Needs Review</p>
                  <div className="flex items-center justify-center gap-1.5">
                    <AlertTriangle className="size-4" style={{ color: 'oklch(0.65 0.18 45)' }} />
                    <span className="text-lg font-bold text-foreground">{DOCUMENTS_SUMMARY.needsReview}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Warning banner */}
          <div
            className="rounded-lg border px-5 py-3.5 mb-6 flex items-start gap-3"
            style={{
              backgroundColor: 'oklch(0.98 0.02 85)',
              borderColor: 'oklch(0.88 0.08 85)',
            }}
          >
            <AlertTriangle className="size-5 mt-0.5 shrink-0" style={{ color: 'oklch(0.6 0.18 60)' }} />
            <div>
              <p className="text-sm font-bold text-foreground">7 fields need review.</p>
              <p className="text-sm text-muted-foreground">
                6 fields with low confidence and 1 field missing from documents.
              </p>
            </div>
          </div>

          {/* Documents review section */}
          <div>
            <h2 className="text-lg font-bold text-foreground mb-4">Documents review</h2>

            {/* Filters + Delete */}
            <div className="flex items-end gap-4 mb-4">
              <div className="flex-1 max-w-xs">
                <label className="text-sm font-semibold text-foreground mb-1 block">Search</label>
                <div className="relative">
                  <Input
                    placeholder="Search by document name"
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className="pr-9"
                  />
                  <Search className="absolute right-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                </div>
              </div>
              <div className="w-40">
                <label className="text-sm font-semibold text-foreground mb-1 block">Form Type</label>
                <Select value={formTypeFilter} onValueChange={setFormTypeFilter}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {FORM_TYPE_FILTER_OPTIONS.map(opt => (
                      <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="w-40">
                <label className="text-sm font-semibold text-foreground mb-1 block">Status</label>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUS_FILTER_OPTIONS.map(opt => (
                      <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="ml-auto">
                <Button variant="outline" size="sm" className="gap-1.5" disabled={selectedDocs.size === 0}>
                  <Trash2 className="size-3.5" />
                  Delete
                </Button>
              </div>
            </div>

            {/* Table */}
            <div className="rounded-lg border border-border overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border" style={{ backgroundColor: 'oklch(0.98 0 0)' }}>
                    <th className="px-4 py-3 text-left w-10">
                      <Checkbox
                        checked={selectedDocs.size === filteredDocs.length && filteredDocs.length > 0}
                        onCheckedChange={toggleAll}
                      />
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Name</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Form Type</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                      <span className="inline-flex items-center gap-1">
                        {'Status'}
                        <span className="text-xs text-muted-foreground/60">{'↑↓'}</span>
                      </span>
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Fields to Review</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredDocs.map(doc => (
                    <tr key={doc.id} className="border-b border-border last:border-b-0 hover:bg-accent/30 transition-colors">
                      <td className="px-4 py-3.5">
                        <Checkbox
                          checked={selectedDocs.has(doc.id)}
                          onCheckedChange={() => toggleDoc(doc.id)}
                        />
                      </td>
                      <td className="px-4 py-3.5 text-sm text-foreground">{doc.name}</td>
                      <td className="px-4 py-3.5 text-sm text-foreground">{doc.formType}</td>
                      <td className="px-4 py-3.5">
                        <StatusBadge status={doc.status} />
                      </td>
                      <td className="px-4 py-3.5 text-sm text-foreground">{doc.fieldsToReview}</td>
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-2">
                          <Button variant="outline" size="sm" className="gap-1 h-7 text-xs" asChild>
                            <Link href={`/initial-draft/document/${doc.id}`}>
                              <ExternalLink className="size-3" />
                              View
                            </Link>
                          </Button>
                          <Button variant="outline" size="sm" className="gap-1 h-7 text-xs text-muted-foreground">
                            <Trash2 className="size-3" />
                            Delete
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-between mt-4">
              <p className="text-sm text-muted-foreground">
                Showing 1 to <strong className="text-foreground">{filteredDocs.length}</strong> of <strong className="text-foreground">{DOCUMENT_ITEMS.length}</strong> items
              </p>
              <div className="flex items-center gap-1">
                <span className="text-sm text-muted-foreground mr-2">Page 1 of 1</span>
                <Button variant="outline" size="icon" className="size-8" disabled>
                  <ChevronsLeft className="size-3.5" />
                </Button>
                <Button variant="outline" size="icon" className="size-8" disabled>
                  <ChevronLeft className="size-3.5" />
                </Button>
                <Button variant="outline" size="icon" className="size-8" disabled>
                  <ChevronRight className="size-3.5" />
                </Button>
                <Button variant="outline" size="icon" className="size-8" disabled>
                  <ChevronsRight className="size-3.5" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  let bgColor: string
  let textColor: string
  let borderColor: string

  switch (status) {
    case 'Incorrect tax year':
      bgColor = 'oklch(0.97 0.02 25)'
      textColor = 'oklch(0.5 0.2 25)'
      borderColor = 'oklch(0.88 0.08 25)'
      break
    case 'Needs review':
      bgColor = 'oklch(0.97 0.02 60)'
      textColor = 'oklch(0.55 0.18 50)'
      borderColor = 'oklch(0.88 0.08 60)'
      break
    case 'Reviewed':
      bgColor = 'oklch(0.97 0.02 145)'
      textColor = 'oklch(0.45 0.16 145)'
      borderColor = 'oklch(0.88 0.08 145)'
      break
    default:
      bgColor = 'oklch(0.96 0 0)'
      textColor = 'oklch(0.5 0 0)'
      borderColor = 'oklch(0.9 0 0)'
  }

  return (
    <span
      className="inline-flex items-center rounded px-2 py-0.5 text-xs font-medium"
      style={{ backgroundColor: bgColor, color: textColor, border: `1px solid ${borderColor}` }}
    >
      {status}
    </span>
  )
}
