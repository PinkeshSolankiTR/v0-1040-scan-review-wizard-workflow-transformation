'use client'

import { useEffect, useRef, useState } from 'react'
import * as pdfjsLib from 'pdfjs-dist'

pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`

const PDF_PATH = '/documents/1TDI-CCH-2024-binder.pdf'

export default function PdfInventoryPage() {
  const [pageImages, setPageImages] = useState<string[]>([])
  const [totalPages, setTotalPages] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function renderAllPages() {
      const loadingTask = pdfjsLib.getDocument(PDF_PATH)
      const pdf = await loadingTask.promise
      setTotalPages(pdf.numPages)
      console.log(`[v0] PDF loaded: ${pdf.numPages} pages`)

      const images: string[] = []
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i)
        const viewport = page.getViewport({ scale: 1.0 })
        
        const canvas = document.createElement('canvas')
        canvas.width = viewport.width
        canvas.height = viewport.height
        const ctx = canvas.getContext('2d')!
        
        await page.render({ canvasContext: ctx, viewport }).promise
        images.push(canvas.toDataURL('image/png'))
        console.log(`[v0] Rendered page ${i}/${pdf.numPages}`)
      }
      
      setPageImages(images)
      setLoading(false)
    }
    
    renderAllPages().catch(err => {
      console.error('[v0] Error rendering PDF:', err)
      setLoading(false)
    })
  }, [])

  return (
    <main style={{ padding: '2rem', fontFamily: 'system-ui, sans-serif' }}>
      <h1 style={{ fontSize: '1.5rem', fontWeight: 700, marginBlockEnd: '1rem' }}>
        PDF Page Inventory ({totalPages} pages)
      </h1>
      {loading && <p>Loading and rendering all {totalPages || '...'} pages...</p>}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(18rem, 1fr))', gap: '1rem' }}>
        {pageImages.map((src, i) => (
          <figure key={i} style={{ border: '1px solid #ccc', borderRadius: '0.5rem', overflow: 'hidden', margin: 0 }}>
            <figcaption style={{
              padding: '0.5rem', backgroundColor: '#f5f5f5', fontWeight: 600, fontSize: '0.875rem',
              borderBlockEnd: '1px solid #ccc'
            }}>
              Page {i + 1}
            </figcaption>
            <img
              src={src}
              alt={`Page ${i + 1} of tax binder PDF`}
              style={{ inlineSize: '100%', blockSize: 'auto', display: 'block' }}
            />
          </figure>
        ))}
      </div>
    </main>
  )
}
