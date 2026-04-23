'use client'

import { useEffect, useRef, useState } from 'react'

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
}

/**
 * Renders a cropped region of a PDF page using pdfjs-dist.
 * The component loads the PDF, renders the specified page to an offscreen canvas,
 * then draws only the cropped region to a visible canvas.
 */
export function PdfFieldThumbnail({
  pdfPath,
  pageNumber,
  crop,
  displayValue,
  className = '',
}: PdfFieldThumbnailProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading')

  useEffect(() => {
    let cancelled = false

    async function render() {
      try {
        const pdfjsLib = await import('pdfjs-dist')

        // Set worker source
        pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`

        const loadingTask = pdfjsLib.getDocument(pdfPath)
        const pdf = await loadingTask.promise

        if (cancelled) return

        const page = await pdf.getPage(pageNumber)
        if (cancelled) return

        // Render at 2x scale for crisp thumbnails
        const scale = 2
        const viewport = page.getViewport({ scale })

        // Create offscreen canvas for the full page
        const offscreen = document.createElement('canvas')
        offscreen.width = viewport.width
        offscreen.height = viewport.height
        const offCtx = offscreen.getContext('2d')
        if (!offCtx) { setStatus('error'); return }

        await page.render({ canvasContext: offCtx, viewport }).promise
        if (cancelled) return

        // Now crop the relevant region
        const srcX = Math.round(crop.x * viewport.width)
        const srcY = Math.round(crop.y * viewport.height)
        const srcW = Math.round(crop.width * viewport.width)
        const srcH = Math.round(crop.height * viewport.height)

        const canvas = canvasRef.current
        if (!canvas) return

        // Set canvas to match the crop dimensions
        canvas.width = srcW
        canvas.height = srcH
        const ctx = canvas.getContext('2d')
        if (!ctx) { setStatus('error'); return }

        ctx.drawImage(offscreen, srcX, srcY, srcW, srcH, 0, 0, srcW, srcH)
        setStatus('ready')
      } catch {
        if (!cancelled) setStatus('error')
      }
    }

    render()
    return () => { cancelled = true }
  }, [pdfPath, pageNumber, crop.x, crop.y, crop.width, crop.height])

  return (
    <div className={`relative overflow-hidden rounded border border-border bg-white ${className}`} title={displayValue} style={{ height: '2.5rem' }}>
      {status === 'loading' && (
        <div className="flex h-full w-full items-center justify-center">
          <div className="h-3 w-3 animate-spin rounded-full border-2 border-muted-foreground/30 border-t-muted-foreground" />
        </div>
      )}
      {status === 'error' && (
        <div className="flex h-full w-full items-center justify-center bg-muted/30">
          <span className="font-mono text-[0.5625rem] font-semibold text-foreground">{displayValue}</span>
        </div>
      )}
      <canvas
        ref={canvasRef}
        className="h-full w-full"
        style={{
          display: status === 'ready' ? 'block' : 'none',
          objectFit: 'cover',
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
