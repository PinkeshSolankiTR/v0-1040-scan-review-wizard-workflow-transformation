'use client'

import Link from 'next/link'
import { useParams, usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  ListChecks,
  FileStack,
  Copy,
  Link2,
  FileSearch,
  ClipboardList,
  Sparkles,
  Home,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Binder } from '@/lib/types'

const NAV_ITEMS = [
  { label: 'Dashboard', icon: LayoutDashboard, path: '' },
  { label: 'Review Queue', icon: ListChecks, path: '/review-queue' },
  { label: 'Superseded', icon: FileStack, path: '/superseded' },
  { label: 'Duplicate', icon: Copy, path: '/duplicate' },
  { label: 'CFA', icon: Link2, path: '/cfa' },
  { label: 'NFR', icon: FileSearch, path: '/nfr' },
  { label: 'Audit', icon: ClipboardList, path: '/audit' },
]

export function LeftRail({ binder }: { binder: Binder }) {
  const params = useParams()
  const pathname = usePathname()
  const binderId = params.binderId as string
  const basePath = `/binder/${binderId}`

  const reviewCount = binder.summary.reduce(
    (sum, s) => sum + s.mediumConfidence + s.lowConfidence,
    0
  )

  return (
    <aside className="flex w-64 shrink-0 flex-col bg-sidebar text-sidebar-foreground">
      <div className="flex items-center gap-2 px-5 py-5">
        <Sparkles className="size-5 text-sidebar-primary" />
        <span className="text-base font-semibold tracking-tight">1040Scan AI</span>
      </div>

      <nav aria-label="Main navigation" className="flex flex-1 flex-col gap-1 px-3">
        <Link
          href="/"
          className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground transition-colors mb-2 border-b border-sidebar-border pb-3"
        >
          <Home className="size-4 shrink-0" />
          <span className="flex-1">Home</span>
        </Link>
        {NAV_ITEMS.map((item) => {
          const href = `${basePath}${item.path}`
          const isActive = item.path === ''
            ? pathname === basePath
            : pathname.startsWith(href)

          return (
            <Link
              key={item.path}
              href={href}
              className={cn(
                'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                  : 'text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground'
              )}
              aria-current={isActive ? 'page' : undefined}
            >
              <item.icon className="size-4 shrink-0" />
              <span className="flex-1">{item.label}</span>
              {item.label === 'Review Queue' && reviewCount > 0 && (
                <span className="flex min-w-5 items-center justify-center rounded-full bg-sidebar-primary px-1.5 py-0.5 text-xs font-semibold text-sidebar-primary-foreground">
                  {reviewCount}
                </span>
              )}
            </Link>
          )
        })}
      </nav>

      <div className="border-t border-sidebar-border px-5 py-4">
        <p className="text-xs text-sidebar-foreground/50">
          {binder.taxpayerName}
        </p>
        <p className="text-xs text-sidebar-foreground/50">
          {'TY '}
          {binder.taxYear}
        </p>
      </div>
    </aside>
  )
}
