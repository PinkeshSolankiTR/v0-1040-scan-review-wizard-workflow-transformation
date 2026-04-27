'use client'

import { useState } from 'react'
import type { DocumentRef } from '@/lib/types'

type StampType = 'SUPERSEDED'

interface PdfPageViewerProps {
  documentRef: DocumentRef
  stamp?: StampType
  height?: string
}

/**
 * Renders a document page using a pre-rendered image (imagePath) when available.
 * Falls back to an iframe for actual PDF rendering.
 * Supports zoom and status stamp overlays.
 */
export function PdfPageViewer({ documentRef, stamp, height = '32rem' }: PdfPageViewerProps) {
  const { pageNumber, formLabel, imagePath } = documentRef
  const [zoom, setZoom] = useState(1)
  const [imgLoaded, setImgLoaded] = useState(false)

  const stampColor =
    stamp === 'SUPERSEDED'
      ? { bg: 'var(--status-error-subtle)', fg: 'var(--status-error)', border: 'var(--status-error-border)' }
      : null

  return (
    <figure
      style={{
        position: 'relative',
        borderRadius: '0.375rem',
        overflow: 'hidden',
        border: '0.0625rem solid var(--border)',
        backgroundColor: 'var(--surface-raised)',
      }}
    >
      {/* Header bar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0.5rem 0.75rem',
          backgroundColor: 'var(--foreground)',
          color: 'var(--card)',
          fontSize: '0.75rem',
          fontWeight: 600,
        }}
      >
        <span>{formLabel}</span>
        <span style={{ color: 'var(--muted-foreground)' }}>Page {pageNumber}</span>
      </div>

      {/* Document content */}
      <div
        style={{
          position: 'relative',
          height,
          overflow: 'auto',
          backgroundColor: '#e5e5e5',
        }}
      >
        {imagePath ? (
          <>
            {!imgLoaded && (
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  zIndex: 3,
                }}
              >
                <div
                  style={{
                    width: '2rem',
                    height: '2rem',
                    border: '3px solid var(--border)',
                    borderTopColor: 'var(--primary)',
                    borderRadius: '50%',
                    animation: 'spin 0.8s linear infinite',
                  }}
                />
              </div>
            )}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={imagePath}
              alt={`${formLabel} - Page ${pageNumber}`}
              onLoad={() => setImgLoaded(true)}
              style={{
                display: 'block',
                width: `${zoom * 100}%`,
                height: 'auto',
                margin: '0 auto',
                backgroundColor: '#ffffff',
                opacity: imgLoaded ? 1 : 0,
                transition: 'opacity 0.2s ease',
              }}
            />
          </>
        ) : (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              height: '100%',
              color: 'var(--muted-foreground)',
              fontSize: '0.875rem',
            }}
          >
            No document preview available
          </div>
        )}

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

      {/* Zoom controls */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '0.5rem',
          padding: '0.375rem 0.75rem',
          borderTop: '1px solid var(--border)',
          backgroundColor: 'var(--card)',
          fontSize: '0.6875rem',
        }}
      >
        <button
          type="button"
          onClick={() => setZoom(z => Math.max(0.5, z - 0.25))}
          disabled={zoom <= 0.5}
          style={{
            padding: '0.125rem 0.5rem',
            borderRadius: '0.25rem',
            border: '1px solid var(--border)',
            backgroundColor: 'var(--card)',
            cursor: zoom <= 0.5 ? 'not-allowed' : 'pointer',
            opacity: zoom <= 0.5 ? 0.4 : 1,
            fontSize: '0.75rem',
            fontWeight: 700,
            color: 'var(--foreground)',
          }}
          aria-label="Zoom out"
        >
          -
        </button>
        <span style={{ fontWeight: 600, color: 'var(--muted-foreground)', minWidth: '3rem', textAlign: 'center' }}>
          {Math.round(zoom * 100)}%
        </span>
        <button
          type="button"
          onClick={() => setZoom(z => Math.min(3, z + 0.25))}
          disabled={zoom >= 3}
          style={{
            padding: '0.125rem 0.5rem',
            borderRadius: '0.25rem',
            border: '1px solid var(--border)',
            backgroundColor: 'var(--card)',
            cursor: zoom >= 3 ? 'not-allowed' : 'pointer',
            opacity: zoom >= 3 ? 0.4 : 1,
            fontSize: '0.75rem',
            fontWeight: 700,
            color: 'var(--foreground)',
          }}
          aria-label="Zoom in"
        >
          +
        </button>
        <button
          type="button"
          onClick={() => setZoom(1)}
          style={{
            padding: '0.125rem 0.5rem',
            borderRadius: '0.25rem',
            border: '1px solid var(--border)',
            backgroundColor: zoom === 1 ? 'var(--muted)' : 'var(--card)',
            cursor: 'pointer',
            fontSize: '0.625rem',
            fontWeight: 600,
            color: 'var(--muted-foreground)',
          }}
          aria-label="Reset zoom"
        >
          Fit
        </button>
      </div>
    </figure>
  )
}
