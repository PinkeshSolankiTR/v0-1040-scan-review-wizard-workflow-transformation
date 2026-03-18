'use client'

import Link from 'next/link'
import Image from 'next/image'
import { useState } from 'react'
import { use } from 'react'
import {
  ArrowLeft,
  Search,
  RefreshCw,
  ZoomIn,
  ZoomOut,
  Download,
  Printer,
  Maximize2,
  X,
  Clock,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  DOCUMENT_ITEMS,
  DOCUMENT_TYPE_OPTIONS,
  FIELD_TYPE_OPTIONS,
  type ExtractedField,
} from '@/lib/initial-draft-data'

export default function DocumentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const doc = DOCUMENT_ITEMS.find(d => d.id === id) ?? DOCUMENT_ITEMS[0]

  const [documentType, setDocumentType] = useState(doc.documentType)
  const [formType, setFormType] = useState(doc.formTypeDetail)
  const [fieldSearch, setFieldSearch] = useState('')
  const [fieldTypeFilter, setFieldTypeFilter] = useState('All fields')
  const [showChangeModal, setShowChangeModal] = useState(false)
  const [zoom, setZoom] = useState(100)

  // Determine if template is applied
  const isTemplateApplied = documentType !== '' && formType !== ''

  // Filter fields
  const filteredFields = doc.extractedFields.filter(field => {
    const matchesSearch = !fieldSearch || field.label.toLowerCase().includes(fieldSearch.toLowerCase())
    let matchesType = true
    if (fieldTypeFilter !== 'All fields') {
      const filterMap: Record<string, string> = {
        'Uncertain Fields': 'uncertain',
        'Mandatory Fields': 'mandatory',
        'Proforma Fields': 'proforma',
        'Missing Fields': 'missing',
        'Fully Confident Fields': 'fully-confident',
      }
      matchesType = field.status === filterMap[fieldTypeFilter]
    }
    return matchesSearch && matchesType
  })

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Back navigation */}
      <div className="px-6 py-3 border-b border-border bg-card">
        <Link
          href="/initial-draft"
          className="inline-flex items-center gap-1.5 text-sm hover:underline"
          style={{ color: 'oklch(0.5 0.15 250)' }}
        >
          <ArrowLeft className="size-3.5" />
          Back to Dashboard
        </Link>
      </div>

      {/* Document title + type selectors */}
      <div className="px-6 py-4 border-b border-border bg-card">
        <h1 className="text-lg font-bold text-foreground mb-3">{doc.documentTitle}</h1>
        <div className="flex items-center gap-4">
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Document Type</label>
            <Select value={documentType} onValueChange={setDocumentType}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Select" />
              </SelectTrigger>
              <SelectContent>
                {DOCUMENT_TYPE_OPTIONS.filter(o => o !== 'All').map(opt => (
                  <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                ))}
                <SelectItem value="Source Document">Source Document</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Form Type</label>
            <Select value={formType} onValueChange={setFormType}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Select" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="W-2 wages">W-2 wages</SelectItem>
                <SelectItem value="1099-DIV dividends">1099-DIV dividends</SelectItem>
                <SelectItem value="1099-INT interest">1099-INT interest</SelectItem>
                <SelectItem value="K-1 income">K-1 income</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="pt-4">
            <Button
              className="gap-1.5"
              style={{ backgroundColor: 'oklch(0.25 0.01 260)', color: 'oklch(0.98 0 0)' }}
              onClick={() => setShowChangeModal(true)}
            >
              <RefreshCw className="size-3.5" />
              Change Type
            </Button>
          </div>
        </div>
      </div>

      {/* Main content: split view */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left panel: Extracted Fields */}
        <div className="w-[520px] shrink-0 border-r border-border overflow-y-auto bg-card">
          {isTemplateApplied ? (
            <div className="p-5">
              <h2 className="text-base font-bold text-foreground mb-4">Extracted Fields</h2>

              {/* Search + Field Type filter */}
              <div className="flex items-center gap-3 mb-5">
                <div className="relative flex-1">
                  <Input
                    placeholder="Search by field name"
                    value={fieldSearch}
                    onChange={e => setFieldSearch(e.target.value)}
                    className="pr-9"
                  />
                  <Search className="absolute right-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                </div>
                <Select value={fieldTypeFilter} onValueChange={setFieldTypeFilter}>
                  <SelectTrigger className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {FIELD_TYPE_OPTIONS.map(opt => (
                      <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Field cards */}
              <div className="flex flex-col gap-4">
                {filteredFields.map(field => (
                  <FieldCard key={field.id} field={field} />
                ))}
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-full">
              <div className="text-center px-8">
                <h3 className="text-base font-bold text-foreground mb-2">Template Not Applied</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Choose a Document Type and Form Type to use a template for the document (if applicable).
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Right panel: Document viewer */}
        <div className="flex-1 flex flex-col bg-background">
          {/* Viewer toolbar */}
          <div className="flex items-center justify-between px-5 py-3 border-b border-border bg-card">
            <div className="flex items-center gap-2">
              <Search className="size-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Search document</span>
              <div className="flex items-center gap-1 ml-4">
                <span className="inline-flex items-center rounded border border-border px-1.5 py-0.5 text-[0.625rem] font-mono text-muted-foreground bg-muted">CTRL</span>
                <span className="text-xs text-muted-foreground">+</span>
                <span className="inline-flex items-center rounded border border-border px-1.5 py-0.5 text-[0.625rem] font-mono text-muted-foreground bg-muted">F</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Select value={String(zoom)} onValueChange={v => setZoom(Number(v))}>
                <SelectTrigger className="w-24 h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="50">50%</SelectItem>
                  <SelectItem value="75">75%</SelectItem>
                  <SelectItem value="100">100%</SelectItem>
                  <SelectItem value="125">125%</SelectItem>
                  <SelectItem value="150">150%</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="ghost" size="icon" className="size-8" onClick={() => setZoom(z => Math.min(z + 25, 200))}>
                <ZoomIn className="size-4" />
              </Button>
              <Button variant="ghost" size="icon" className="size-8" onClick={() => setZoom(z => Math.max(z - 25, 25))}>
                <ZoomOut className="size-4" />
              </Button>
              <Button variant="ghost" size="icon" className="size-8">
                <Download className="size-4" />
              </Button>
              <Button variant="ghost" size="icon" className="size-8">
                <Printer className="size-4" />
              </Button>
              <Button variant="ghost" size="icon" className="size-8">
                <Maximize2 className="size-4" />
              </Button>
            </div>
          </div>

          {/* Document image */}
          <div className="flex-1 overflow-auto flex items-start justify-center p-6" style={{ backgroundColor: 'oklch(0.96 0 0)' }}>
            {isTemplateApplied ? (
              <div
                className="bg-card shadow-lg rounded border border-border"
                style={{ transform: `scale(${zoom / 100})`, transformOrigin: 'top center' }}
              >
                <Image
                  src="/images/w2-form-sample.jpg"
                  alt="W-2 Wage and Tax Statement form"
                  width={800}
                  height={600}
                  className="block"
                  priority
                />
              </div>
            ) : (
              <div className="flex items-center justify-center h-full w-full">
                <p className="text-sm text-muted-foreground">No document preview available</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Change Form Type modal */}
      <Dialog open={showChangeModal} onOpenChange={setShowChangeModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Change Form Type?</DialogTitle>
            <DialogDescription>
              If you do, all current data on page will be deleted. Do you want to proceed?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowChangeModal(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => setShowChangeModal(false)}
              style={{ backgroundColor: 'oklch(0.25 0.01 260)', color: 'oklch(0.98 0 0)' }}
            >
              Yes, Change
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ── Field Card Component ──

function FieldCard({ field }: { field: ExtractedField }) {
  const statusConfig: Record<string, { label: string; bg: string; text: string; border: string }> = {
    'mandatory': {
      label: 'Mandatory Field',
      bg: 'oklch(0.97 0.02 60)',
      text: 'oklch(0.5 0.16 50)',
      border: 'oklch(0.88 0.08 60)',
    },
    'proforma': {
      label: 'Proforma Field',
      bg: 'oklch(0.96 0.02 250)',
      text: 'oklch(0.5 0.14 250)',
      border: 'oklch(0.88 0.06 250)',
    },
    'uncertain': {
      label: 'Uncertain Field',
      bg: 'oklch(0.96 0 0)',
      text: 'oklch(0.45 0 0)',
      border: 'oklch(0.88 0 0)',
    },
    'missing': {
      label: 'Missing Field',
      bg: 'oklch(0.97 0.02 25)',
      text: 'oklch(0.5 0.2 25)',
      border: 'oklch(0.88 0.08 25)',
    },
    'fully-confident': {
      label: 'Fully Confident Field',
      bg: 'oklch(0.97 0.02 145)',
      text: 'oklch(0.45 0.16 145)',
      border: 'oklch(0.88 0.08 145)',
    },
  }

  const config = statusConfig[field.status]

  return (
    <div className="rounded-lg border border-border bg-card p-4">
      {/* Status badge + source + override */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span
            className="inline-flex items-center rounded px-2 py-0.5 text-[0.6875rem] font-medium"
            style={{ backgroundColor: config.bg, color: config.text, border: `1px solid ${config.border}` }}
          >
            {config.label}
          </span>
          <span className="text-xs text-muted-foreground">{field.source}</span>
        </div>
        {field.hasOverride && (
          <Button variant="outline" size="sm" className="h-6 gap-1 text-[0.6875rem] px-2">
            <Clock className="size-3" />
            Overriding
          </Button>
        )}
      </div>

      {/* Field label */}
      <p className="text-sm text-foreground mb-2">
        {field.id}. {field.label}
      </p>

      {/* Field value input */}
      <div className="relative">
        <Input
          value={field.value}
          readOnly
          className="pr-8 bg-background"
        />
        <button className="absolute right-2.5 top-1/2 -translate-y-1/2">
          <X className="size-3.5 text-muted-foreground hover:text-foreground" />
        </button>
      </div>
    </div>
  )
}
