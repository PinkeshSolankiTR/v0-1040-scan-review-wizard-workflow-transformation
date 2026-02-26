'use client'

import type { ReactNode } from 'react'
import { LearnedRulesProvider } from '@/contexts/learned-rules-context'

export function Providers({ children }: { children: ReactNode }) {
  return (
    <LearnedRulesProvider>
      {children}
    </LearnedRulesProvider>
  )
}
