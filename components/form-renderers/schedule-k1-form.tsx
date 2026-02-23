"use client"

import { type ComparedValue } from "@/lib/types"

interface ScheduleK1FormProps {
  stamp?: "ORIGINAL" | "SUPERSEDED" | "RETAIN"
  comparedValues?: ComparedValue[]
  variant?: "original" | "amended"
}

const DATA_ORIGINAL = {
  trustName: "CHAPMAN IRREVOCABLE TRUST",
  trustEin: "34-3353535",
  trustAddress: "1520 ROYAL COURT\nDALLAS, TX 75225",
  beneficiaryName: "JILL BAKER FAMILY TRUST",
  beneficiaryId: "12-3674289",
  beneficiaryAddress: "1234 MAIN STREET\nDALLAS, TX 75202",
  interestIncome: "2,575",
  ordinaryDividends: "62,565",
  qualifiedDividends: "60,525",
  netSTCapGain: "0",
  netLTCapGain: "5,975",
  businessIncome: "8,748",
  otherPortfolio: "0",
  taxExemptInterest: "15,050",
}

const DATA_AMENDED = {
  ...DATA_ORIGINAL,
  beneficiaryName: "JILL B. FAMILY TRUST",
  beneficiaryId: "12-3674290",
  ordinaryDividends: "62,890",
}

export function ScheduleK1Form({ stamp, comparedValues, variant = "original" }: ScheduleK1FormProps) {
  const data = variant === "amended" ? DATA_AMENDED : DATA_ORIGINAL
  const mismatchFields = new Set(
    (comparedValues ?? []).filter((v) => !v.match).map((v) => v.field)
  )

  const stampColor = stamp === "ORIGINAL" ? "oklch(0.55 0.17 145)" : stamp === "SUPERSEDED" ? "oklch(0.55 0.22 25)" : "oklch(0.55 0.15 250)"
  const stampLabel = stamp === "ORIGINAL" ? "ORIGINAL" : stamp === "SUPERSEDED" ? "SUPERSEDED" : stamp === "RETAIN" ? "RETAIN BOTH" : null

  return (
    <article style={{
      position: "relative", border: "0.0625rem solid oklch(0.85 0 0)", borderRadius: "0.375rem",
      backgroundColor: "oklch(1 0 0)", padding: "1.25rem", fontFamily: "'Courier New', Courier, monospace",
      fontSize: "0.75rem", lineHeight: "1.4", overflow: "hidden", maxInlineSize: "36rem",
    }}>
      {stampLabel && (
        <div aria-label={`Document marked as ${stampLabel}`} style={{
          position: "absolute", insetBlockStart: "2.5rem", insetInlineEnd: "1rem", transform: "rotate(18deg)",
          border: `0.1875rem solid ${stampColor}`, borderRadius: "0.5rem", padding: "0.25rem 1rem",
          color: stampColor, fontSize: "1.25rem", fontWeight: 800, letterSpacing: "0.15em",
          opacity: 0.85, pointerEvents: "none", zIndex: 10, fontFamily: "sans-serif",
        }}>
          {stampLabel}
        </div>
      )}

      <header style={{
        display: "flex", justifyContent: "space-between", alignItems: "flex-start",
        borderBlockEnd: "0.125rem solid oklch(0.2 0 0)", paddingBlockEnd: "0.5rem", marginBlockEnd: "0.75rem",
      }}>
        <div>
          <p style={{ fontSize: "0.625rem", color: "oklch(0.5 0 0)" }}>Department of the Treasury — Internal Revenue Service</p>
          <p style={{ fontSize: "1.125rem", fontWeight: 700, fontFamily: "sans-serif" }}>
            Schedule K-1 <span style={{ fontSize: "0.75rem", fontWeight: 400 }}>(Form 1041) Beneficiary{"'"}s Share</span>
          </p>
        </div>
        <div style={{ textAlign: "end" }}>
          <p style={{ fontSize: "0.625rem", color: "oklch(0.5 0 0)" }}>Tax Year</p>
          <p style={{ fontSize: "1rem", fontWeight: 700, fontFamily: "sans-serif" }}>2024</p>
        </div>
      </header>

      {/* Trust / Beneficiary */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.0625rem", backgroundColor: "oklch(0.8 0 0)", border: "0.0625rem solid oklch(0.8 0 0)", borderRadius: "0.25rem", overflow: "hidden", marginBlockEnd: "0.75rem" }}>
        <Cell label="Trust/Estate Name" value={data.trustName} mismatch={mismatchFields.has("Trust Name")} />
        <Cell label="Trust EIN" value={data.trustEin} mismatch={mismatchFields.has("Trust EIN")} />
        <Cell label="Trust Address" value={data.trustAddress} span={2} />
        <Cell label="Beneficiary Name" value={data.beneficiaryName} mismatch={mismatchFields.has("Beneficiary Name")} />
        <Cell label="Beneficiary ID" value={data.beneficiaryId} mismatch={mismatchFields.has("Beneficiary ID")} />
        <Cell label="Beneficiary Address" value={data.beneficiaryAddress} span={2} />
      </div>

      {/* Income */}
      <p style={{ fontSize: "0.6875rem", fontWeight: 700, fontFamily: "sans-serif", color: "oklch(0.3 0 0)", marginBlockEnd: "0.375rem", textTransform: "uppercase", letterSpacing: "0.06em" }}>Part III — Beneficiary{"'"}s Share of Current Year Income</p>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "0.0625rem", backgroundColor: "oklch(0.8 0 0)", border: "0.0625rem solid oklch(0.8 0 0)", borderRadius: "0.25rem", overflow: "hidden" }}>
        <Cell label="1. Interest Income" value={`$${data.interestIncome}`} mismatch={mismatchFields.has("Interest Income")} />
        <Cell label="2a. Ordinary Dividends" value={`$${data.ordinaryDividends}`} mismatch={mismatchFields.has("Ordinary Dividends")} bold />
        <Cell label="2b. Qualified Dividends" value={`$${data.qualifiedDividends}`} />
        <Cell label="4a. Net ST Cap Gain" value={`$${data.netSTCapGain}`} />
        <Cell label="4b. Net LT Cap Gain" value={`$${data.netLTCapGain}`} />
        <Cell label="5. Business Income" value={`$${data.businessIncome}`} mismatch={mismatchFields.has("Business Income")} />
        <Cell label="6. Other Portfolio" value={`$${data.otherPortfolio}`} />
        <Cell label="13. Tax-Exempt Interest" value={`$${data.taxExemptInterest}`} />
        <Cell label="" value="" />
      </div>
    </article>
  )
}

function Cell({ label, value, span = 1, mismatch = false, bold = false }: { label: string; value: string; span?: number; mismatch?: boolean; bold?: boolean }) {
  return (
    <div style={{
      gridColumn: span === 2 ? "1 / -1" : undefined,
      backgroundColor: mismatch ? "oklch(0.95 0.05 25)" : "oklch(1 0 0)",
      padding: "0.375rem 0.5rem",
    }}>
      <p style={{ fontSize: "0.5625rem", color: "oklch(0.45 0 0)", marginBlockEnd: "0.125rem", fontFamily: "sans-serif", textTransform: "uppercase", letterSpacing: "0.04em" }}>{label}</p>
      <p style={{ fontSize: "0.8125rem", fontWeight: bold ? 700 : 600, whiteSpace: "pre-line", color: mismatch ? "oklch(0.45 0.2 25)" : "oklch(0.15 0 0)" }}>{value}</p>
    </div>
  )
}
