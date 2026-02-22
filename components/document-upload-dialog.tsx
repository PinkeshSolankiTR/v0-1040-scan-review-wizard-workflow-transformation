'use client'

import { useCallback, useRef } from 'react'
import { Upload, FileText, ImageIcon } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { useDocuments } from '@/contexts/document-context'

export function DocumentUploadDialog({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const { addDocument, documents } = useDocuments()
  const inputRef = useRef<HTMLInputElement>(null)

  const handleFiles = useCallback(
    (files: FileList | null) => {
      if (!files) return
      for (const file of Array.from(files)) {
        if (
          file.type === 'application/pdf' ||
          file.type.startsWith('image/')
        ) {
          addDocument(file)
        }
      }
    },
    [addDocument]
  )

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      handleFiles(e.dataTransfer.files)
    },
    [handleFiles]
  )

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Upload Documents</DialogTitle>
          <DialogDescription>
            Upload PDF or image files to preview alongside AI decisions.
          </DialogDescription>
        </DialogHeader>

        <div
          className="flex flex-col items-center gap-3 rounded-lg border-2 border-dashed border-border p-8 transition-colors hover:border-muted-foreground/40"
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleDrop}
          role="region"
          aria-label="File drop zone"
        >
          <Upload className="size-8 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            Drag files here or click to browse
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => inputRef.current?.click()}
          >
            Browse Files
          </Button>
          <input
            ref={inputRef}
            type="file"
            accept=".pdf,image/*"
            multiple
            className="sr-only"
            onChange={(e) => handleFiles(e.target.files)}
            aria-label="Choose files to upload"
          />
        </div>

        {documents.length > 0 && (
          <div className="flex flex-col gap-2">
            <p className="text-xs font-medium text-muted-foreground">
              Uploaded ({documents.length})
            </p>
            <ul className="flex flex-col gap-1" aria-label="Uploaded documents">
              {documents.map((doc) => (
                <li
                  key={doc.id}
                  className="flex items-center gap-2 rounded-md bg-muted px-3 py-2 text-sm"
                >
                  {doc.type === 'pdf' ? (
                    <FileText className="size-4 shrink-0 text-muted-foreground" />
                  ) : (
                    <ImageIcon className="size-4 shrink-0 text-muted-foreground" />
                  )}
                  <span className="truncate">{doc.name}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
