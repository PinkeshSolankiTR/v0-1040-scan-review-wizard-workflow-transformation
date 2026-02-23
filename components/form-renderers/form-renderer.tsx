"use client"

import { type DocumentRef, type ComparedValue } from "@/lib/types"
import { W2Form } from "./w2-form"
import { ScheduleCForm } from "./schedule-c-form"
import { Form1099Misc } from "./form-1099-misc"
import { ScheduleK1Form } from "./schedule-k1-form"

export type StampType = "ORIGINAL" | "SUPERSEDED" | "RETAIN"

interface FormRendererProps {
  documentRef: DocumentRef
  stamp?: StampType
  comparedValues?: ComparedValue[]
  variant?: "original" | "amended"
}

export function FormRenderer({ documentRef, stamp, comparedValues, variant = "original" }: FormRendererProps) {
  const { formType } = documentRef

  if (formType === "W-2" || formType === "W-2c") {
    return <W2Form stamp={stamp} comparedValues={comparedValues} variant={variant} />
  }

  if (formType === "Schedule C") {
    return <ScheduleCForm stamp={stamp} comparedValues={comparedValues} variant={variant} />
  }

  if (formType === "1099-MISC") {
    return <Form1099Misc stamp={stamp} comparedValues={comparedValues} />
  }

  if (formType === "Schedule K-1" || formType === "K-1") {
    return <ScheduleK1Form stamp={stamp} comparedValues={comparedValues} variant={variant} />
  }

  /* Fallback for unknown form types */
  return (
    <article style={{
      border: "0.0625rem solid oklch(0.85 0 0)", borderRadius: "0.375rem",
      backgroundColor: "oklch(1 0 0)", padding: "1.5rem", textAlign: "center",
    }}>
      <p style={{ fontSize: "0.875rem", color: "oklch(0.4 0 0)" }}>
        Form preview not available for: <strong>{formType}</strong>
      </p>
      <p style={{ fontSize: "0.75rem", color: "oklch(0.55 0 0)", marginBlockStart: "0.5rem" }}>
        {documentRef.formLabel}
      </p>
    </article>
  )
}
