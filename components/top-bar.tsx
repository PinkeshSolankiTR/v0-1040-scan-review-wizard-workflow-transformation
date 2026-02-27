'use client'

import { useRouter, useParams, usePathname } from 'next/navigation'
import Link from 'next/link'
import { Upload, LayoutDashboard } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb'
import { DocumentUploadDialog } from '@/components/document-upload-dialog'
import { useState } from 'react'
import type { Binder } from '@/lib/types'

const SEGMENT_LABELS: Record<string, string> = {
  'review-queue': 'Review Queue',
  superseded: 'Superseded',
  duplicate: 'Duplicate',
  cfa: 'CFA',
  nfr: 'NFR',
  audit: 'Audit',
}

export function TopBar({ binder }: { binder: Binder }) {
  const router = useRouter()
  const params = useParams()
  const pathname = usePathname()
  const binderId = params.binderId as string
  const [uploadOpen, setUploadOpen] = useState(false)

  const segments = pathname.split('/').filter(Boolean)
  const currentSegment = segments.length > 2 ? segments[segments.length - 1] : null

  return (
    <header className="flex h-14 shrink-0 items-center justify-between border-b border-border bg-card px-6">
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink href="/">1040Scan</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbLink href={`/binder/${binderId}`}>
              {binder.label}
            </BreadcrumbLink>
          </BreadcrumbItem>
          {currentSegment && (
            <>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <span className="text-foreground font-medium">
                  {SEGMENT_LABELS[currentSegment] ?? currentSegment}
                </span>
              </BreadcrumbItem>
            </>
          )}
        </BreadcrumbList>
      </Breadcrumb>

      <div className="flex items-center gap-3">
        <span className="hidden text-sm text-muted-foreground sm:inline">
          {binder.taxpayerName}{' | TY '}{binder.taxYear}
        </span>
        <Select
          value={binderId}
          onValueChange={(v) => {
            const suffix = currentSegment ? `/${currentSegment}` : ''
            router.push(`/binder/${v}${suffix}`)
          }}
        >
          <SelectTrigger className="w-44" aria-label="Select binder">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="demo-a">Demo Binder</SelectItem>
          </SelectContent>
        </Select>

        <Button variant="outline" size="sm" onClick={() => setUploadOpen(true)}>
          <Upload className="size-4" />
          <span className="hidden sm:inline">Upload</span>
        </Button>

        <Button variant="ghost" size="sm" asChild>
          <Link href="/">
            <LayoutDashboard className="size-4" />
            <span className="hidden sm:inline">Presentation Hub</span>
          </Link>
        </Button>
      </div>

      <DocumentUploadDialog open={uploadOpen} onOpenChange={setUploadOpen} />
    </header>
  )
}
