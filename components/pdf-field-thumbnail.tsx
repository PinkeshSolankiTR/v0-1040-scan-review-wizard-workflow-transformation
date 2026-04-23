'use client'

import { useState, useRef, useEffect } from 'react'

interface CropRegion {
  x: number
  y: number
  width: number
  height: number
}

interface PdfFieldThumbnailProps {
  pdfPath: string
  pageNumber: number
  crop: CropRegion
  displayValue: string
  className?: string
  imagePath?: string
}

/**
 * Renders a cropped region of a document page as a field-level thumbnail.
 * Shows only the extracted field value (e.g. payer name, SSN, dollar amount).
 * On hover, enlarges into a floating popover for inspection.
 */
export function PdfFieldThumbnail({
  crop,
  displayValue,
  className = '',
  imagePath,
}: PdfFieldThumbnailProps) {
  const [loaded, setLoaded] = useState(false)
  const [errored, setErrored] = useState(false)
  const [hovered, setHovered] = useState(false)
  const cellRef = useRef<HTMLDivElement>(null)
  const [popoverPos, setPopoverPos] = useState<'above' | 'below'>('above')

  // Calculate CSS object-position for cropping
  const scaleX = 1 / crop.width
  const scaleY = 1 / crop.height
  const scale = Math.min(scaleX, scaleY)
  const posX = crop.width < 1 ? (crop.x / (1 - crop.width)) * 100 : 50
  const posY = crop.height < 1 ? (crop.y / (1 - crop.height)) * 100 : 50

  // Determine if popover should appear above or below
  useEffect(() => {
    if (hovered && cellRef.current) {
      const rect = cellRef.current.getBoundingClientRect()
      const spaceAbove = rect.top
      setPopoverPos(spaceAbove > 220 ? 'above' : 'below')
    }
  }, [hovered])

  if (!imagePath || errored) {
    return (
      <div className={`flex flex-col items-center gap-0.5 ${className}`}>
        <div
          className="flex w-full items-center justify-center rounded border border-border bg-muted/20 px-2"
          style={{ height: '2rem' }}
        >
          <span className="truncate text-[0.6875rem] font-semibold text-foreground">{displayValue}</span>
        </div>
      </div>
    )
  }

  return (
    <div
      ref={cellRef}
      className={`group relative ${className}`}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Thumbnail -- cropped image region */}
      <div
        className="relative overflow-hidden rounded border border-border bg-white cursor-pointer transition-all group-hover:shadow-md group-hover:border-primary/50"
        style={{ height: '2.25rem' }}
      >
        {!loaded && (
          <div className="flex h-full w-full items-center justify-center">
            <div className="h-3 w-3 animate-spin rounded-full border-2 border-muted-foreground/30 border-t-muted-foreground" />
          </div>
        )}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={imagePath}
          alt={displayValue}
          onLoad={() => setLoaded(true)}
          onError={() => setErrored(true)}
          className="absolute inset-0"
          style={{
            display: loaded ? 'block' : 'none',
            width: `${scale * 100}%`,
            height: `${scale * 100}%`,
            objectFit: 'cover',
            objectPosition: `${posX}% ${posY}%`,
            maxWidth: 'none',
          }}
        />
      </div>

      {/* Extracted value shown below thumbnail */}
      <span
        className="mt-0.5 block truncate font-mono text-[0.625rem] font-semibold leading-tight text-foreground"
        title={displayValue}
      >
        {displayValue}
      </span>

      {/* Hover popover -- enlarged preview */}
      {hovered && loaded && (
        <div
          className="absolute left-1/2 z-50 w-[20rem] -translate-x-1/2 overflow-hidden rounded-lg border border-border bg-card shadow-xl animate-in fade-in-0 zoom-in-95 duration-150"
          style={{
            ...(popoverPos === 'above'
              ? { bottom: 'calc(100% + 0.5rem)' }
              : { top: 'calc(100% + 0.5rem)' }),
          }}
        >
          {/* Enlarged cropped image */}
          <div className="relative overflow-hidden bg-white" style={{ height: '8rem' }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={imagePath}
              alt={displayValue}
              className="absolute inset-0"
              style={{
                width: `${scale * 100}%`,
                height: `${scale * 100}%`,
                objectFit: 'cover',
                objectPosition: `${posX}% ${posY}%`,
                maxWidth: 'none',
              }}
            />
          </div>
          {/* Value label inside popover */}
          <div className="border-t border-border bg-muted/30 px-3 py-1.5">
            <span className="font-mono text-xs font-bold text-foreground">{displayValue}</span>
          </div>
        </div>
      )}
    </div>
  )
}
