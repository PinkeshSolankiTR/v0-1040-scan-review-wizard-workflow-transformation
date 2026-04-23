'use client'

import { useState } from 'react'

interface CropRegion {
  x: number      // 0-1 fraction from left
  y: number      // 0-1 fraction from top
  width: number  // 0-1 fraction width
  height: number // 0-1 fraction height
}

interface PdfFieldThumbnailProps {
  pdfPath: string
  pageNumber: number
  crop: CropRegion
  displayValue: string
  className?: string
  /** Pre-rendered page image path (used instead of pdfjs rendering) */
  imagePath?: string
}

/**
 * Renders a cropped region of a document page as a field-level thumbnail.
 * Uses a pre-rendered image with CSS object-position cropping for reliable rendering.
 * Falls back to showing the display value as text if no image is available.
 */
export function PdfFieldThumbnail({
  crop,
  displayValue,
  className = '',
  imagePath,
}: PdfFieldThumbnailProps) {
  const [loaded, setLoaded] = useState(false)
  const [errored, setErrored] = useState(false)

  // Calculate CSS object-position for cropping
  // The image needs to be scaled up so the crop region fills the container
  const scaleX = 1 / crop.width
  const scaleY = 1 / crop.height
  const scale = Math.min(scaleX, scaleY)

  // Object position as percentage to center the crop region
  const posX = crop.width < 1 ? (crop.x / (1 - crop.width)) * 100 : 50
  const posY = crop.height < 1 ? (crop.y / (1 - crop.height)) * 100 : 50

  if (!imagePath || errored) {
    // Fallback: show value as styled text
    return (
      <div className={`relative overflow-hidden rounded border border-border bg-white ${className}`} title={displayValue} style={{ height: '2.5rem' }}>
        <div className="flex h-full w-full items-center justify-center bg-muted/20 px-1.5">
          <span className="truncate font-mono text-[0.625rem] font-semibold text-foreground">{displayValue}</span>
        </div>
      </div>
    )
  }

  return (
    <div className={`relative overflow-hidden rounded border border-border bg-white ${className}`} title={displayValue} style={{ height: '2.5rem' }}>
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
        style={{
          display: loaded ? 'block' : 'none',
          width: `${scale * 100}%`,
          height: `${scale * 100}%`,
          objectFit: 'cover',
          objectPosition: `${posX}% ${posY}%`,
          maxWidth: 'none',
        }}
      />
      {/* Value overlay */}
      <div
        className="absolute inset-x-0 bottom-0 px-1.5 py-0.5"
        style={{ backgroundColor: 'color-mix(in srgb, var(--foreground) 80%, transparent)' }}
      >
        <span className="font-mono text-[0.5625rem] font-semibold" style={{ color: 'var(--card)' }}>
          {displayValue}
        </span>
      </div>
    </div>
  )
}
