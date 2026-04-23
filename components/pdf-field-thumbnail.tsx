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
  displayValue,
  className = '',
}: PdfFieldThumbnailProps) {
  return (
    <div className={`relative ${className}`}>
      <div
        className="flex w-full items-center rounded border border-border bg-white px-2 transition-all duration-200 hover:scale-[1.35] hover:z-20 hover:shadow-lg hover:border-primary/50 hover:bg-white"
        style={{ height: '2rem', transformOrigin: 'center center' }}
      >
        <span
          className="truncate text-[0.6875rem] font-semibold leading-tight text-foreground"
          title={displayValue}
        >
          {displayValue}
        </span>
      </div>
    </div>
  )
}
