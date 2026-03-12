'use client'

import Link from 'next/link'
import { useState } from 'react'
import {
  Sparkles,
  ArrowLeft,
  ChevronDown,
  ChevronRight,
  Layers,
  Hash,
  Crosshair,
  Wrench,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { ROADMAP, type Feature, type Spike } from './roadmap-data'

/* ── Spike Row ── */
function SpikeRow({ spike }: { spike: Spike }) {
  const [open, setOpen] = useState(false)

  return (
    <div className="border-b border-border last:border-b-0">
      <button
        type="button"
        onClick={() => setOpen((p) => !p)}
        className="flex w-full items-start gap-3 px-4 py-3 text-left hover:bg-muted/40 transition-colors"
      >
        <div className="mt-0.5 shrink-0">
          {open ? (
            <ChevronDown className="size-3.5 text-muted-foreground" />
          ) : (
            <ChevronRight className="size-3.5 text-muted-foreground" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge
              variant="outline"
              className="shrink-0 text-[0.625rem] font-mono px-1.5 py-0"
            >
              {spike.id}
            </Badge>
            <span className="text-sm font-medium text-foreground leading-snug">
              {spike.title}
            </span>
          </div>
        </div>
      </button>
      {open && (
        <div className="px-4 pb-3 pl-10">
          <p className="text-xs text-muted-foreground leading-relaxed whitespace-pre-line">
            {spike.description}
          </p>
        </div>
      )}
    </div>
  )
}

/* ── Feature Card ── */
function FeatureCard({ feature }: { feature: Feature }) {
  const [expanded, setExpanded] = useState(false)
  const [showDescription, setShowDescription] = useState(false)

  const spikeCount = feature.spikes.length
  const categoryIcon =
    feature.category === 'wizard' ? (
      <Crosshair className="size-3.5" />
    ) : (
      <Wrench className="size-3.5" />
    )
  const categoryLabel =
    feature.category === 'wizard' ? 'Wizard-Specific' : 'Cross-Cutting'

  return (
    <Card
      className="border-l-4 overflow-hidden"
      style={{ borderLeftColor: feature.accentColor }}
    >
      <CardHeader className="pb-0">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            {/* Category + ID */}
            <div className="flex items-center gap-2 mb-1.5 flex-wrap">
              <Badge
                variant="secondary"
                className="text-[0.625rem] gap-1 py-0"
              >
                {categoryIcon}
                {categoryLabel}
              </Badge>
              {feature.id && (
                <span className="text-[0.625rem] font-mono text-muted-foreground">
                  ID: {feature.id}
                </span>
              )}
            </div>

            {/* Title */}
            <h3 className="text-base font-semibold text-foreground leading-snug text-balance">
              {feature.title}
            </h3>
          </div>

          {/* Spike count badge */}
          <div
            className="flex shrink-0 items-center gap-1.5 rounded-md px-2.5 py-1.5"
            style={{
              backgroundColor: `color-mix(in oklch, ${feature.accentColor} 10%, transparent)`,
            }}
          >
            <Hash
              className="size-3.5"
              style={{ color: feature.accentColor }}
            />
            <span
              className="text-sm font-bold"
              style={{ color: feature.accentColor }}
            >
              {spikeCount}
            </span>
            <span className="text-[0.625rem] text-muted-foreground">
              {spikeCount === 1 ? 'spike' : 'spikes'}
            </span>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-3">
        {/* Description toggle */}
        <div className="mb-3">
          <button
            type="button"
            onClick={() => setShowDescription((p) => !p)}
            className="text-xs font-medium text-[var(--ai-accent)] hover:underline flex items-center gap-1"
          >
            {showDescription ? (
              <ChevronDown className="size-3" />
            ) : (
              <ChevronRight className="size-3" />
            )}
            {showDescription ? 'Hide description' : 'View description'}
          </button>
          {showDescription && (
            <div className="mt-2 rounded-md border border-border bg-muted/30 p-3">
              <p className="text-xs text-muted-foreground leading-relaxed whitespace-pre-line">
                {feature.description}
              </p>
            </div>
          )}
        </div>

        {/* Spikes section */}
        {spikeCount > 0 && (
          <div>
            <button
              type="button"
              onClick={() => setExpanded((p) => !p)}
              className="flex w-full items-center justify-between rounded-md border border-border bg-muted/30 px-3 py-2 text-left hover:bg-muted/50 transition-colors"
            >
              <span className="text-xs font-semibold text-foreground uppercase tracking-wider">
                Spikes ({spikeCount})
              </span>
              {expanded ? (
                <ChevronDown className="size-3.5 text-muted-foreground" />
              ) : (
                <ChevronRight className="size-3.5 text-muted-foreground" />
              )}
            </button>
            {expanded && (
              <div className="mt-1 rounded-md border border-border overflow-hidden">
                {feature.spikes.map((spike) => (
                  <SpikeRow key={spike.id} spike={spike} />
                ))}
              </div>
            )}
          </div>
        )}

        {spikeCount === 0 && (
          <div className="rounded-md border border-dashed border-border bg-muted/20 px-3 py-2">
            <p className="text-xs text-muted-foreground italic">
              No spikes defined yet -- tasks to be created.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

/* ── Main Page ── */
export default function DeliveryRoadmapPage() {
  const wizardFeatures = ROADMAP.features.filter(
    (f) => f.category === 'wizard'
  )
  const crossCuttingFeatures = ROADMAP.features.filter(
    (f) => f.category === 'cross-cutting'
  )

  const totalFeatures = ROADMAP.features.length
  const totalSpikes = ROADMAP.features.reduce(
    (sum, f) => sum + f.spikes.length,
    0
  )

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <Sparkles className="size-7 text-[var(--ai-accent)]" />
            <span className="text-lg font-bold text-foreground">1040SCAN</span>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" asChild>
              <Link href="/phase-1">
                <ArrowLeft className="size-3.5" />
                Back to Phase 1
              </Link>
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-1">
        <div className="mx-auto max-w-6xl px-6 py-10">
          {/* Page header */}
          <div className="flex flex-col gap-1 mb-2">
            <div className="flex items-center gap-2">
              <Badge className="bg-[var(--ai-accent)] text-white">
                Delivery Roadmap
              </Badge>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground text-balance">
              Phase 1: Delivery Roadmap
            </h1>
            <p className="text-sm text-muted-foreground">
              Epic, Feature & Spike tracking for Wizard Elimination
            </p>
          </div>

          {/* Epic card */}
          <Card className="mb-8 border-l-4 border-l-[var(--ai-accent)]">
            <CardHeader>
              <div className="flex items-start gap-3">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-[var(--ai-accent)]/10">
                  <Layers className="size-5 text-[var(--ai-accent)]" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <Badge variant="outline" className="text-[0.625rem] font-mono px-1.5 py-0">
                      Epic: {ROADMAP.id}
                    </Badge>
                    <Badge className="bg-[var(--confidence-high)] text-white text-[0.625rem]">
                      Active
                    </Badge>
                  </div>
                  <h2 className="text-lg font-bold text-foreground leading-snug text-balance">
                    {ROADMAP.title}
                  </h2>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground leading-relaxed mb-4">
                {ROADMAP.description}
              </p>
              {/* Summary metrics */}
              <div className="grid grid-cols-3 gap-3">
                <div className="flex flex-col items-center rounded-md bg-muted/50 px-2 py-3 text-center">
                  <p className="text-lg font-bold text-foreground">
                    {totalFeatures}
                  </p>
                  <p className="text-xs text-muted-foreground leading-tight mt-0.5">
                    Features
                  </p>
                </div>
                <div className="flex flex-col items-center rounded-md bg-muted/50 px-2 py-3 text-center">
                  <p className="text-lg font-bold text-foreground">
                    {totalSpikes}
                  </p>
                  <p className="text-xs text-muted-foreground leading-tight mt-0.5">
                    Spikes
                  </p>
                </div>
                <div className="flex flex-col items-center rounded-md bg-muted/50 px-2 py-3 text-center">
                  <p className="text-lg font-bold text-foreground">
                    {wizardFeatures.length}
                  </p>
                  <p className="text-xs text-muted-foreground leading-tight mt-0.5">
                    Wizards
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Wizard-Specific Features */}
          <div className="mb-10">
            <div className="flex items-center gap-2 mb-4">
              <Crosshair className="size-4 text-foreground" />
              <h2 className="text-lg font-bold text-foreground">
                Wizard-Specific Features
              </h2>
              <Badge variant="secondary" className="text-[0.625rem]">
                {wizardFeatures.length}
              </Badge>
            </div>
            <div className="grid gap-4">
              {wizardFeatures.map((feature) => (
                <FeatureCard key={feature.id} feature={feature} />
              ))}
            </div>
          </div>

          {/* Cross-Cutting Features */}
          <div className="mb-10">
            <div className="flex items-center gap-2 mb-4">
              <Wrench className="size-4 text-foreground" />
              <h2 className="text-lg font-bold text-foreground">
                Cross-Cutting Features
              </h2>
              <Badge variant="secondary" className="text-[0.625rem]">
                {crossCuttingFeatures.length}
              </Badge>
            </div>
            <div className="grid gap-4">
              {crossCuttingFeatures.map((feature) => (
                <FeatureCard key={feature.id} feature={feature} />
              ))}
            </div>
          </div>

          {/* Footer note */}
          <p className="text-center text-xs text-muted-foreground/60">
            Delivery Roadmap -- Data sourced from Azure DevOps. Spike
            descriptions reflect current work item definitions.
          </p>
        </div>
      </main>
    </div>
  )
}
