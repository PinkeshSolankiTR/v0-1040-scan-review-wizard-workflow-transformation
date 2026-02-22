'use client'

import { createContext, useContext, useCallback, useState, type ReactNode } from 'react'
import type { UploadedDoc } from '@/lib/types'

interface DocumentContextValue {
  documents: UploadedDoc[]
  addDocument: (file: File) => void
  selectedDocId: string | null
  selectDocument: (id: string | null) => void
  selectedPageId: number | null
  selectPageId: (pageId: number | null) => void
  currentPage: number
  setCurrentPage: (page: number) => void
}

const DocumentContext = createContext<DocumentContextValue | null>(null)

export function DocumentProvider({ children }: { children: ReactNode }) {
  const [documents, setDocuments] = useState<UploadedDoc[]>([])
  const [selectedDocId, setSelectedDocId] = useState<string | null>(null)
  const [selectedPageId, setSelectedPageId] = useState<number | null>(null)
  const [currentPage, setCurrentPage] = useState(1)

  const addDocument = useCallback((file: File) => {
    const url = URL.createObjectURL(file)
    const isPdf = file.type === 'application/pdf'
    const doc: UploadedDoc = {
      id: `doc-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      name: file.name,
      type: isPdf ? 'pdf' : 'image',
      objectURL: url,
    }
    setDocuments(prev => [...prev, doc])
    setSelectedDocId(doc.id)
  }, [])

  const selectDocument = useCallback((id: string | null) => {
    setSelectedDocId(id)
    setCurrentPage(1)
  }, [])

  const selectPageId = useCallback((pageId: number | null) => {
    setSelectedPageId(pageId)
    // Auto-select first document if none selected and documents exist
    if (pageId !== null) {
      setDocuments(prev => {
        if (prev.length > 0 && !selectedDocId) {
          setSelectedDocId(prev[0].id)
        }
        return prev
      })
    }
  }, [selectedDocId])

  return (
    <DocumentContext value={{
      documents,
      addDocument,
      selectedDocId,
      selectDocument,
      selectedPageId,
      selectPageId,
      currentPage,
      setCurrentPage,
    }}>
      {children}
    </DocumentContext>
  )
}

export function useDocuments() {
  const ctx = useContext(DocumentContext)
  if (!ctx) throw new Error('useDocuments must be used within DocumentProvider')
  return ctx
}
