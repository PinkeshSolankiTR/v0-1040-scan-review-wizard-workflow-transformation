'use client'

import type { ReactNode } from 'react'
import { usePathname } from 'next/navigation'
import type { Binder } from '@/lib/types'
import { DecisionProvider } from '@/contexts/decision-context'
import { DocumentProvider } from '@/contexts/document-context'
import { WizardPipelineProvider } from '@/contexts/wizard-pipeline-context'
import { TopBar } from '@/components/top-bar'

export function BinderShell({ binder, children }: { binder: Binder; children: ReactNode }) {
  const pathname = usePathname()
  const isFullBleed = pathname.endsWith('/superseded')

  return (
    <DecisionProvider>
      <DocumentProvider>
        <WizardPipelineProvider>
          <div className="flex h-screen flex-col overflow-hidden bg-background">
            <TopBar binder={binder} />
            <main className={isFullBleed ? 'flex-1 overflow-hidden' : 'flex-1 overflow-y-auto p-6'}>
              {children}
            </main>
          </div>
        </WizardPipelineProvider>
      </DocumentProvider>
    </DecisionProvider>
  )
}
