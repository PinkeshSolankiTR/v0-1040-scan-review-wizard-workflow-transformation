'use client'

import type { ReactNode } from 'react'
import type { Binder } from '@/lib/types'
import { DecisionProvider } from '@/contexts/decision-context'
import { DocumentProvider } from '@/contexts/document-context'
import { LeftRail } from '@/components/left-rail'
import { TopBar } from '@/components/top-bar'
import { DocumentViewer } from '@/components/document-viewer'

export function BinderShell({ binder, children }: { binder: Binder; children: ReactNode }) {
  return (
    <DecisionProvider>
      <DocumentProvider>
        <div className="flex h-screen overflow-hidden bg-background">
          <LeftRail binder={binder} />
          <div className="flex flex-1 flex-col overflow-hidden">
            <TopBar binder={binder} />
            <div className="flex flex-1 overflow-hidden">
              <main className="flex-1 overflow-y-auto p-6">
                {children}
              </main>
              <DocumentViewer />
            </div>
          </div>
        </div>
      </DocumentProvider>
    </DecisionProvider>
  )
}
