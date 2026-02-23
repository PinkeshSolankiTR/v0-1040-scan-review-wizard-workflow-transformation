"use client"

import { type ComparedValue } from "@/lib/types"

interface W2FormProps {
  stamp?: "ORIGINAL" | "SUPERSEDED" | "RETAIN"
  highlightFields?: string[]
  comparedValues?: ComparedValue[]
  variant?: "original" | "amended"
}

const DATA_ORIGINAL = {
  employerEin: "53-XXXXXXX",
  employerName: "WHYNOT STOP INC",
  employerAddress: "532 MAIN STREET\nWATERVILLE, ME 25570",
  employeeSsn: "***-**-1234",
  employeeName: "JILL ANDERSON",
  employeeAddress: "1234 MAIN STREET\nDALLAS, TX 75202",
  wagesTips: "52,340.00",
  fedTaxWithheld: "8,120.00",
  ssTaxWithheld: "3,245.08",
  ssWages: "52,340.00",
  medicareTaxWithheld: "758.93",
  medicareWages: "52,340.00",
  state: "TX",
  stateWages: "52,340.00",
  receivedDate: "01/15/2024",
}

const DATA_AMENDED = {
  ...DATA_ORIGINAL,
  wagesTips: "54,890.00",
  fedTaxWithheld: "8,510.00",
  ssTaxWithheld: "3,403.18",
  ssWages: "54,890.00",
  medicareTaxWithheld: "795.91",
  medicareWages: "54,890.00",
  stateWages: "54,890.00",
  receivedDate: "03/01/2024",
}

export function W2Form({ stamp, highlightFields = [], comparedValues, variant = "original" }: W2FormProps) {
  const data = variant === "amended" ? DATA_AMENDED : DATA_ORIGINAL
  const highlightSet = new Set(highlightFields)
  const mismatchFields = new Set(
    (comparedValues ?? []).filter((v) => !v.match).map((v) => v.field)
  )

  function cellClass(fieldName: string) {
    const base = "c-form-cell"
    if (mismatchFields.has(fieldName)) return `${base} c-form-cell--mismatch`
    if (highlightSet.has(fieldName)) return `${base} c-form-cell--highlight`
    return base
  }

  const stampColor =
    stamp === "ORIGINAL"
      ? "oklch(0.55 0.17 145)"
      : stamp === "SUPERSEDED"
        ? "oklch(0.55 0.22 25)"
        : "oklch(0.55 0.15 250)"

  const stampLabel =
    stamp === "ORIGINAL"
      ? "ORIGINAL"
      : stamp === "SUPERSEDED"
        ? "SUPERSEDED"
        : stamp === "RETAIN"
          ? "RETAIN BOTH"
          : null

  return (
    <article
      className="c-form-wrapper"
      style={{
        position: "relative",
        border: `0.0625rem solid oklch(0.85 0 0)`,
        borderRadius: "0.375rem",
        backgroundColor: "oklch(1 0 0)",
        padding: "1.25rem",
        fontFamily: "'Courier New', Courier, monospace",
        fontSize: "0.75rem",
        lineHeight: "1.4",
        overflow: "hidden",
        maxInlineSize: "36rem",
      }}
    >
      {/* Stamp overlay */}
      {stampLabel && (
        <div
          aria-label={`Document marked as ${stampLabel}`}
          style={{
            position: "absolute",
            insetBlockStart: "2.5rem",
            insetInlineEnd: "1rem",
            transform: "rotate(18deg)",
            border: `0.1875rem solid ${stampColor}`,
            borderRadius: "0.5rem",
            padding: "0.25rem 1rem",
            color: stampColor,
            fontSize: "1.25rem",
            fontWeight: 800,
            letterSpacing: "0.15em",
            opacity: 0.85,
            pointerEvents: "none",
            zIndex: 10,
            fontFamily: "sans-serif",
          }}
        >
          {stampLabel}
        </div>
      )}

      {/* Form header */}
      <header
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          borderBlockEnd: `0.125rem solid oklch(0.2 0 0)`,
          paddingBlockEnd: "0.5rem",
          marginBlockEnd: "0.75rem",
        }}
      >
        <div>
          <p style={{ fontSize: "0.625rem", color: "oklch(0.5 0 0)" }}>
            Department of the Treasury — Internal Revenue Service
          </p>
          <p style={{ fontSize: "1.125rem", fontWeight: 700, fontFamily: "sans-serif" }}>
            {variant === "amended" ? "W-2c" : "W-2"}{" "}
            <span style={{ fontSize: "0.75rem", fontWeight: 400 }}>
              Wage and Tax Statement
            </span>
          </p>
        </div>
        <div style={{ textAlign: "end" }}>
          <p style={{ fontSize: "0.625rem", color: "oklch(0.5 0 0)" }}>Tax Year</p>
          <p style={{ fontSize: "1rem", fontWeight: 700, fontFamily: "sans-serif" }}>2024</p>
        </div>
      </header>

      <p
        style={{
          fontSize: "0.625rem",
          color: "oklch(0.45 0 0)",
          marginBlockEnd: "0.5rem",
          fontFamily: "sans-serif",
        }}
      >
        Received: {data.receivedDate}
      </p>

      {/* Form grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "0.0625rem",
          backgroundColor: "oklch(0.8 0 0)",
          border: `0.0625rem solid oklch(0.8 0 0)`,
          borderRadius: "0.25rem",
          overflow: "hidden",
        }}
      >
        <FormCell label="a. Employee SSN" value={data.employeeSsn} className={cellClass("Employee SSN")} />
        <FormCell label="b. Employer EIN" value={data.employerEin} className={cellClass("Employer EIN")} />
        <FormCell label="c. Employer Name & Address" value={`${data.employerName}\n${data.employerAddress}`} className={cellClass("Employer Name")} span={2} />
        <FormCell label="e. Employee Name" value={data.employeeName} className={cellClass("Employee Name")} span={2} />
        <FormCell label="f. Employee Address" value={data.employeeAddress} className={cellClass("Employee Address")} span={2} />
        <FormCell label="1. Wages, Tips" value={`$${data.wagesTips}`} className={cellClass("Wages")} highlight={mismatchFields.has("Wages")} />
        <FormCell label="2. Federal Tax Withheld" value={`$${data.fedTaxWithheld}`} className={cellClass("Federal Tax Withheld")} highlight={mismatchFields.has("Federal Tax Withheld")} />
        <FormCell label="3. SS Wages" value={`$${data.ssWages}`} className={cellClass("SS Wages")} />
        <FormCell label="4. SS Tax Withheld" value={`$${data.ssTaxWithheld}`} className={cellClass("SS Tax Withheld")} />
        <FormCell label="5. Medicare Wages" value={`$${data.medicareWages}`} className={cellClass("Medicare Wages")} />
        <FormCell label="6. Medicare Tax Withheld" value={`$${data.medicareTaxWithheld}`} className={cellClass("Medicare Tax Withheld")} />
        <FormCell label="15. State" value={data.state} className={cellClass("State")} />
        <FormCell label="16. State Wages" value={`$${data.stateWages}`} className={cellClass("State Wages")} />
      </div>
    </article>
  )
}

function FormCell({
  label,
  value,
  className = "",
  span = 1,
  highlight = false,
}: {
  label: string
  value: string
  className?: string
  span?: number
  highlight?: boolean
}) {
  return (
    <div
      className={className}
      style={{
        gridColumn: span === 2 ? "1 / -1" : undefined,
        backgroundColor: highlight ? "oklch(0.95 0.05 25)" : "oklch(1 0 0)",
        padding: "0.375rem 0.5rem",
      }}
    >
      <p
        style={{
          fontSize: "0.5625rem",
          color: "oklch(0.45 0 0)",
          marginBlockEnd: "0.125rem",
          fontFamily: "sans-serif",
          textTransform: "uppercase",
          letterSpacing: "0.04em",
        }}
      >
        {label}
      </p>
      <p
        style={{
          fontSize: "0.8125rem",
          fontWeight: 600,
          whiteSpace: "pre-line",
          color: "oklch(0.15 0 0)",
        }}
      >
        {value}
      </p>
    </div>
  )
}
