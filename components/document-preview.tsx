'use client'

import { useState } from 'react'
import { FileText, X, Maximize2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { DocumentRef } from '@/lib/types'

/**
 * Inline "View Document" button that expands to show an embedded PDF viewer.
 * Supports page-specific navigation via #page= fragment.
 */
export function DocumentPreviewButton({ docRef }: { docRef: DocumentRef }) {
  const [open, setOpen] = useState(false)

  const pdfUrl = `${docRef.pdfPath}#page=${docRef.pageNumber}&view=FitH`

  return (
    <div className="flex flex-col gap-1.5">
      <button
        onClick={() => setOpen(!open)}
        className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium transition-colors"
        style={{
          backgroundColor: open ? 'oklch(0.5 0.15 250 / 0.12)' : 'oklch(0.96 0.005 250)',
          color: 'oklch(0.4 0.12 250)',
        }}
        type="button"
        aria-expanded={open}
      >
        <FileText className="size-3.5" />
        {open ? 'Hide' : 'View'} {docRef.formLabel}
      </button>

      {open && (
        <div
          className="overflow-hidden rounded-md border"
          style={{ borderColor: 'oklch(0.88 0.01 250)' }}
        >
          <div
            className="flex items-center justify-between px-3 py-1.5"
            style={{ backgroundColor: 'oklch(0.22 0.03 250)', color: 'oklch(0.92 0 0)' }}
          >
            <span className="text-xs font-medium">
              {docRef.formType} — Page {docRef.pageNumber}
            </span>
            <div className="flex items-center gap-1">
              <a
                href={docRef.pdfPath}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded p-0.5 transition-colors hover:bg-white/10"
                aria-label="Open PDF in new tab"
              >
                <Maximize2 className="size-3.5" />
              </a>
              <button
                onClick={() => setOpen(false)}
                className="rounded p-0.5 transition-colors hover:bg-white/10"
                aria-label="Close document preview"
              >
                <X className="size-3.5" />
              </button>
            </div>
          </div>
          <object
            data={pdfUrl}
            type="application/pdf"
            className="w-full"
            style={{ height: '20rem' }}
            aria-label={`PDF preview of ${docRef.formLabel}, page ${docRef.pageNumber}`}
          >
            <div className="flex flex-col items-center justify-center gap-2 py-8" style={{ backgroundColor: 'oklch(0.97 0.003 250)' }}>
              <FileText className="size-8" style={{ color: 'oklch(0.6 0.01 250)' }} />
              <p className="text-sm" style={{ color: 'oklch(0.5 0.01 250)' }}>
                PDF preview unavailable in this browser.
              </p>
              <a
                href={docRef.pdfPath}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-md px-3 py-1.5 text-xs font-medium text-white"
                style={{ backgroundColor: 'oklch(0.5 0.15 250)' }}
              >
                Open PDF in New Tab
              </a>
            </div>
          </object>
        </div>
      )}
    </div>
  )
}

/**
 * Side-by-side dual document preview for Duplicate records.
 */
export function DualDocumentPreview({
  docRefA,
  docRefB,
}: {
  docRefA: DocumentRef
  docRefB: DocumentRef
}) {
  const [open, setOpen] = useState(false)

  return (
    <div className="flex flex-col gap-1.5">
      <button
        onClick={() => setOpen(!open)}
        className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium transition-colors"
        style={{
          backgroundColor: open ? 'oklch(0.5 0.15 250 / 0.12)' : 'oklch(0.96 0.005 250)',
          color: 'oklch(0.4 0.12 250)',
        }}
        type="button"
        aria-expanded={open}
      >
        <FileText className="size-3.5" />
        {open ? 'Hide' : 'Compare'} Documents
      </button>

      {open && (
        <div className="grid grid-cols-2 gap-2">
          {[docRefA, docRefB].map((ref, idx) => (
            <div
              key={idx}
              className="overflow-hidden rounded-md border"
              style={{ borderColor: 'oklch(0.88 0.01 250)' }}
            >
              <div
                className="flex items-center justify-between px-2 py-1"
                style={{ backgroundColor: 'oklch(0.22 0.03 250)', color: 'oklch(0.92 0 0)' }}
              >
                <span className="text-xs font-medium">{ref.formLabel}</span>
                <span className="text-xs opacity-70">Pg {ref.pageNumber}</span>
              </div>
              <object
                data={`${ref.pdfPath}#page=${ref.pageNumber}&view=FitH`}
                type="application/pdf"
                className="w-full"
                style={{ height: '16rem' }}
                aria-label={`PDF preview of ${ref.formLabel}`}
              >
                <div className="flex flex-col items-center justify-center gap-2 py-6" style={{ backgroundColor: 'oklch(0.97 0.003 250)' }}>
                  <FileText className="size-6" style={{ color: 'oklch(0.6 0.01 250)' }} />
                  <a
                    href={ref.pdfPath}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs underline"
                    style={{ color: 'oklch(0.5 0.15 250)' }}
                  >
                    Open PDF
                  </a>
                </div>
              </object>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
