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
  const [imgLoaded, setImgLoaded] = useState(false)
  const [imgErrored, setImgErrored] = useState(false)
  const [hovered, setHovered] = useState(false)
  const cellRef = useRef<HTMLDivElement>(null)
  const [popoverPos, setPopoverPos] = useState<'above' | 'below'>('above')

  /* Pre-load the image so the hover popover appears instantly */
  useEffect(() => {
    if (!imagePath) return
    const img = new window.Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => setImgLoaded(true)
    img.onerror = () => setImgErrored(true)
    img.src = imagePath
  }, [imagePath])

  /* Calculate crop positioning for the hover popover */
  const scaleX = 1 / crop.width
  const scaleY = 1 / crop.height
  const scale = Math.min(scaleX, scaleY)
  const posX = crop.width < 1 ? (crop.x / (1 - crop.width)) * 100 : 50
  const posY = crop.height < 1 ? (crop.y / (1 - crop.height)) * 100 : 50

  /* Determine if popover should appear above or below */
  useEffect(() => {
    if (hovered && cellRef.current) {
      const rect = cellRef.current.getBoundingClientRect()
      setPopoverPos(rect.top > 220 ? 'above' : 'below')
    }
  }, [hovered])

  const hasPopoverImage = imagePath && imgLoaded && !imgErrored

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
        style={{ height: '2rem', cursor: hasPopoverImage ? 'pointer' : 'default' }}
      >
        <span
          className="truncate text-[0.6875rem] font-semibold leading-tight text-foreground"
          title={displayValue}
        >
          {displayValue}
        </span>
      </div>

      {/* Hover popover -- shows the actual document crop for verification */}
      {hovered && hasPopoverImage && (
        <div
          className="absolute left-1/2 z-50 w-[20rem] -translate-x-1/2 overflow-hidden rounded-lg border border-border bg-card shadow-xl animate-in fade-in-0 zoom-in-95 duration-150"
          style={{
            ...(popoverPos === 'above'
              ? { bottom: 'calc(100% + 0.5rem)' }
              : { top: 'calc(100% + 0.5rem)' }),
          }}
        >
          {/* Enlarged cropped region from the source document */}
          <div className="relative overflow-hidden bg-white" style={{ height: '8rem' }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={imagePath}
              alt={`Source document showing ${displayValue}`}
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
          {/* Value confirmation footer */}
          <div className="border-t border-border bg-muted/30 px-3 py-1.5">
            <span className="font-mono text-xs font-bold text-foreground">{displayValue}</span>
          </div>
        </div>
      )}
    </div>
  )
}
