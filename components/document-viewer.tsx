'use client'

import { ChevronLeft, ChevronRight, FileText, ImageIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useDocuments } from '@/contexts/document-context'
import { cn } from '@/lib/utils'

export function DocumentViewer() {
  const { documents, selectedDocId, selectDocument, currentPage, setCurrentPage } =
    useDocuments()

  const selectedDoc = documents.find((d) => d.id === selectedDocId)

  return (
    <aside className="flex w-80 shrink-0 flex-col border-l border-border bg-card" aria-label="Document viewer">
      <div className="flex h-10 items-center justify-between border-b border-border px-4">
        <h2 className="text-xs font-semibold text-foreground">
          Document Viewer
        </h2>
        {selectedDoc && (
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
              disabled={currentPage <= 1}
              aria-label="Previous page"
            >
              <ChevronLeft className="size-3.5" />
            </Button>
            <span className="text-xs tabular-nums text-muted-foreground">
              {'Page '}{currentPage}
            </span>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => setCurrentPage(currentPage + 1)}
              aria-label="Next page"
            >
              <ChevronRight className="size-3.5" />
            </Button>
          </div>
        )}
      </div>

      <div className="flex flex-1 flex-col">
        {selectedDoc ? (
          <div className="flex-1 overflow-hidden bg-muted">
            {selectedDoc.type === 'pdf' ? (
              <iframe
                src={`${selectedDoc.objectURL}#page=${currentPage}`}
                className="h-full w-full"
                title={`Preview of ${selectedDoc.name}`}
              />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={selectedDoc.objectURL}
                alt={`Preview of ${selectedDoc.name}`}
                className="h-full w-full object-contain"
              />
            )}
          </div>
        ) : (
          <div className="flex flex-1 flex-col items-center justify-center gap-2 p-6 text-center">
            <FileText className="size-10 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">
              No document selected
            </p>
            <p className="text-xs text-muted-foreground/70">
              Upload documents and click a table row to preview
            </p>
          </div>
        )}
      </div>

      {documents.length > 0 && (
        <div className="border-t border-border p-3">
          <p className="mb-2 text-xs font-medium text-muted-foreground">
            Thumbnails
          </p>
          <div className="flex gap-2 overflow-x-auto" role="list" aria-label="Document thumbnails">
            {documents.map((doc) => (
              <button
                key={doc.id}
                onClick={() => selectDocument(doc.id)}
                className={cn(
                  'flex size-12 shrink-0 items-center justify-center rounded-md border transition-colors',
                  doc.id === selectedDocId
                    ? 'border-ring bg-accent'
                    : 'border-border bg-muted hover:border-muted-foreground/30'
                )}
                aria-label={`Select ${doc.name}`}
                aria-pressed={doc.id === selectedDocId}
              >
                {doc.type === 'pdf' ? (
                  <FileText className="size-5 text-muted-foreground" />
                ) : (
                  <ImageIcon className="size-5 text-muted-foreground" />
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </aside>
  )
}
