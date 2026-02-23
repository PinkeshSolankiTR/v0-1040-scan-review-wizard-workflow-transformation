"use client"

import { type ComparedValue } from "@/lib/types"

interface Form1099MiscProps {
  stamp?: "ORIGINAL" | "SUPERSEDED" | "RETAIN"
  comparedValues?: ComparedValue[]
}

export function Form1099Misc({ stamp, comparedValues }: Form1099MiscProps) {
  const mismatchFields = new Set(
    (comparedValues ?? []).filter((v) => !v.match).map((v) => v.field)
  )

  const stampColor =
    stamp === "ORIGINAL" ? "oklch(0.55 0.17 145)" :
    "oklch(0.55 0.22 25)"

  const stampLabel =
    stamp === "ORIGINAL" ? "ORIGINAL" :
    stamp === "SUPERSEDED" ? "SUPERSEDED" : null

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
            1099-MISC <span style={{ fontSize: "0.75rem", fontWeight: 400 }}>Miscellaneous Information</span>
          </p>
        </div>
        <div style={{ textAlign: "end" }}>
          <p style={{ fontSize: "0.625rem", color: "oklch(0.5 0 0)" }}>Tax Year</p>
          <p style={{ fontSize: "1rem", fontWeight: 700, fontFamily: "sans-serif" }}>2024</p>
        </div>
      </header>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.0625rem", backgroundColor: "oklch(0.8 0 0)", border: "0.0625rem solid oklch(0.8 0 0)", borderRadius: "0.25rem", overflow: "hidden", marginBlockEnd: "0.75rem" }}>
        <Cell label="Payer's Name" value="RICHMONT NORTH AMERICA, INC" mismatch={mismatchFields.has("Payer Name")} />
        <Cell label="Payer's TIN" value="13-2852910" mismatch={mismatchFields.has("Payer TIN")} />
        <Cell label="Payer's Address" value="1125 S 103RD ST STE 200\nOMHAHA NE 68124-1071" span={2} />
        <Cell label="Recipient's Name" value="JACK ANDERSON" mismatch={mismatchFields.has("Recipient Name")} />
        <Cell label="Recipient's TIN" value="111-11-1111" mismatch={mismatchFields.has("Recipient TIN")} />
        <Cell label="Recipient's Address" value="1234 MAIN STREET\nDALLAS TX 75202" span={2} />
      </div>

      <p style={{ fontSize: "0.6875rem", fontWeight: 700, fontFamily: "sans-serif", color: "oklch(0.3 0 0)", marginBlockEnd: "0.375rem", textTransform: "uppercase", letterSpacing: "0.06em" }}>Income Boxes</p>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "0.0625rem", backgroundColor: "oklch(0.8 0 0)", border: "0.0625rem solid oklch(0.8 0 0)", borderRadius: "0.25rem", overflow: "hidden" }}>
        <Cell label="1. Rents" value="$0.00" />
        <Cell label="2. Royalties" value="$0.00" />
        <Cell label="3. Other Income" value="$14,921.24" mismatch={mismatchFields.has("Box 3 (Other Income)")} bold />
        <Cell label="4. Fed Tax Withheld" value="$0.00" />
        <Cell label="10. Crop Insurance" value="$0.00" />
        <Cell label="Account Number" value="500551212" />
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
