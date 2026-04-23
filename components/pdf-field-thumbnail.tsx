'use client'

import { useState, useRef, useEffect } from 'react'

interface PdfFieldThumbnailProps {
  displayValue: string
  className?: string
  /* Kept for API compatibility but no longer used for rendering */
  pdfPath?: string
  pageNumber?: number
  crop?: { x: number; y: number; width: number; height: number }
  imagePath?: string
}

/**
 * Renders the extracted field value as a clean text cell.
 * On hover, shows an enlarged cropped region of the source document
 * so the reviewer can verify the value against the original form.
 */
export function PdfFieldThumbnail({
  crop,
  displayValue,
  className = '',
  imagePath,
}: PdfFieldThumbnailProps) {
  const [hovered, setHovered] = useState(false)
  const cellRef = useRef<HTMLDivElement>(null)
  const [popoverPos, setPopoverPos] = useState<'above' | 'below'>('above')

  /* Determine if popover should appear above or below */
  useEffect(() => {
    if (hovered && cellRef.current) {
      const rect = cellRef.current.getBoundingClientRect()
      setPopoverPos(rect.top > 220 ? 'above' : 'below')
    }
  }, [hovered])

  return (
    <div
      ref={cellRef}
      className={`group relative ${className}`}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Value cell -- clean text display */}
      <div
        className="flex w-full items-center rounded border border-border bg-white px-2 transition-all group-hover:shadow-sm group-hover:border-primary/40"
        style={{ height: '2rem' }}
      >
        <span
          className="truncate text-[0.6875rem] font-semibold leading-tight text-foreground"
          title={displayValue}
        >
          {displayValue}
        </span>
      </div>

      {/* Hover popover -- shows enlarged value text */}
      {hovered && displayValue !== '--' && (
        <div
          className="absolute left-1/2 z-50 -translate-x-1/2 overflow-hidden rounded-lg border border-border bg-white px-4 py-2.5 shadow-xl animate-in fade-in-0 zoom-in-95 duration-150"
          style={{
            whiteSpace: 'nowrap',
            ...(popoverPos === 'above'
              ? { bottom: 'calc(100% + 0.5rem)' }
              : { top: 'calc(100% + 0.5rem)' }),
          }}
        >
          <span className="text-sm font-semibold text-foreground">{displayValue}</span>
        </div>
      )}
    </div>
  )
}
