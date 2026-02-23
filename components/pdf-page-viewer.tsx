'use client'

import type { DocumentRef } from '@/lib/types'

type StampType = 'ORIGINAL' | 'SUPERSEDED'

interface PdfPageViewerProps {
  documentRef: DocumentRef
  stamp?: StampType
  height?: string
}

/**
 * Renders a single page of a PDF inside an iframe using the #page=N fragment.
 * A CSS-positioned stamp overlay indicates the document status.
 *
 * The iframe toolbar is hidden via the &toolbar=0&navpanes=0&scrollbar=0 params
 * so the user sees only the rendered page content.
 */
export function PdfPageViewer({ documentRef, stamp, height = '32rem' }: PdfPageViewerProps) {
  const { pdfPath, pageNumber, formLabel } = documentRef
  const iframeSrc = `${pdfPath}#page=${pageNumber}&toolbar=0&navpanes=0&scrollbar=0&view=FitH`

  const stampColor =
    stamp === 'ORIGINAL' ? { bg: 'oklch(0.92 0.06 145)', fg: 'oklch(0.35 0.17 145)', border: 'oklch(0.78 0.12 145)' } :
    stamp === 'SUPERSEDED' ? { bg: 'oklch(0.92 0.06 25)', fg: 'oklch(0.40 0.22 25)', border: 'oklch(0.78 0.14 25)' } :
    null

  return (
    <figure
      style={{
        position: 'relative',
        borderRadius: '0.375rem',
        overflow: 'hidden',
        border: '0.0625rem solid oklch(0.88 0.005 260)',
        backgroundColor: 'oklch(0.97 0.003 260)',
      }}
    >
      {/* Header bar with form label and page number */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0.5rem 0.75rem',
        backgroundColor: 'oklch(0.17 0.01 260)',
        color: 'oklch(0.92 0 0)',
        fontSize: '0.75rem',
        fontWeight: 600,
      }}>
        <span>{formLabel}</span>
        <span style={{ color: 'oklch(0.65 0 0)' }}>Page {pageNumber}</span>
      </div>

      {/* PDF iframe — single page view */}
      <div style={{ position: 'relative' }}>
        <iframe
          src={iframeSrc}
          title={`${formLabel} - Page ${pageNumber}`}
          style={{
            display: 'block',
            inlineSize: '100%',
            blockSize: height,
            border: 'none',
          }}
        />

        {/* Stamp overlay */}
        {stamp && stampColor && (
          <div
            aria-hidden="true"
            style={{
              position: 'absolute',
              insetBlockStart: '1.5rem',
              insetInlineEnd: '-2rem',
              transform: 'rotate(30deg)',
              padding: '0.375rem 3rem',
              backgroundColor: stampColor.bg,
              color: stampColor.fg,
              border: `0.1875rem solid ${stampColor.border}`,
              fontSize: '0.875rem',
              fontWeight: 800,
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              opacity: 0.92,
              pointerEvents: 'none',
              zIndex: 2,
              whiteSpace: 'nowrap',
            }}
          >
            {stamp}
          </div>
        )}
      </div>
    </figure>
  )
}
