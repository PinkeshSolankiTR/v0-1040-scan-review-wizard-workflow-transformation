import { Sparkles } from 'lucide-react'

export function AiIndicator() {
  return (
    <span className="inline-flex items-center gap-1 text-[var(--ai-accent)]" aria-hidden="true">
      <Sparkles className="size-3.5" />
      <span className="text-xs font-medium">AI</span>
    </span>
  )
}
