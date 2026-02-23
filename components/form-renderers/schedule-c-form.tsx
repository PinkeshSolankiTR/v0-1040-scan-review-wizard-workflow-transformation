"use client"

import { type ComparedValue } from "@/lib/types"

interface ScheduleCFormProps {
  stamp?: "ORIGINAL" | "SUPERSEDED" | "RETAIN"
  highlightFields?: string[]
  comparedValues?: ComparedValue[]
  variant?: "original" | "amended"
}

const DATA_ORIGINAL = {
  proprietorName: "JILL ANDERSON",
  businessName: "Jill's Craft Shop",
  businessCode: "453998",
  ein: "Applied For",
  businessAddress: "4523 OAK LANE\nDALLAS, TX 75201",
  accountingMethod: "Cash",
  craftSales: "41,200.00",
  otherSales: "7,450.00",
  totalIncome: "48,650.00",
  advertising: "1,200.00",
  supplies: "8,350.00",
  utilities: "960.00",
  otherExpenses: "2,570.15",
  totalExpenses: "13,080.15",
  tentativeProfit: "35,569.85",
  homeExpense: "7,450.00",
  netProfit: "28,119.85",
  receivedDate: "02/10/2024",
}

const DATA_AMENDED = {
  ...DATA_ORIGINAL,
  craftSales: "40,800.00",
  otherSales: "7,400.00",
  totalIncome: "48,200.00",
  supplies: "8,100.00",
  otherExpenses: "3,850.00",
  totalExpenses: "14,500.00",
  tentativeProfit: "33,700.00",
  homeExpense: "0.00",
  netProfit: "33,700.00",
  receivedDate: "02/12/2024",
}

export function ScheduleCForm({ stamp, highlightFields = [], comparedValues, variant = "original" }: ScheduleCFormProps) {
  const data = variant === "amended" ? DATA_AMENDED : DATA_ORIGINAL
  const mismatchFields = new Set(
    (comparedValues ?? []).filter((v) => !v.match).map((v) => v.field)
  )

  const stampColor =
    stamp === "ORIGINAL" ? "oklch(0.55 0.17 145)" :
    stamp === "SUPERSEDED" ? "oklch(0.55 0.22 25)" :
    "oklch(0.55 0.15 250)"

  const stampLabel =
    stamp === "ORIGINAL" ? "ORIGINAL" :
    stamp === "SUPERSEDED" ? "SUPERSEDED" :
    stamp === "RETAIN" ? "RETAIN BOTH" : null

  return (
    <article
      style={{
        position: "relative",
        border: "0.0625rem solid oklch(0.85 0 0)",
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

      <header
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          borderBlockEnd: "0.125rem solid oklch(0.2 0 0)",
          paddingBlockEnd: "0.5rem",
          marginBlockEnd: "0.75rem",
        }}
      >
        <div>
          <p style={{ fontSize: "0.625rem", color: "oklch(0.5 0 0)" }}>
            Department of the Treasury — Internal Revenue Service
          </p>
          <p style={{ fontSize: "1.125rem", fontWeight: 700, fontFamily: "sans-serif" }}>
            Schedule C{" "}
            <span style={{ fontSize: "0.75rem", fontWeight: 400 }}>
              (Form 1040) Profit or Loss From Business
            </span>
          </p>
        </div>
        <div style={{ textAlign: "end" }}>
          <p style={{ fontSize: "0.625rem", color: "oklch(0.5 0 0)" }}>Tax Year</p>
          <p style={{ fontSize: "1rem", fontWeight: 700, fontFamily: "sans-serif" }}>2024</p>
        </div>
      </header>

      <p style={{ fontSize: "0.625rem", color: "oklch(0.45 0 0)", marginBlockEnd: "0.5rem", fontFamily: "sans-serif" }}>
        Received: {data.receivedDate}
      </p>

      {/* Business Info */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.0625rem", backgroundColor: "oklch(0.8 0 0)", border: "0.0625rem solid oklch(0.8 0 0)", borderRadius: "0.25rem", overflow: "hidden", marginBlockEnd: "0.75rem" }}>
        <FieldCell label="Proprietor Name" value={data.proprietorName} mismatch={mismatchFields.has("Proprietor Name") || mismatchFields.has("Business Name")} />
        <FieldCell label="Business Name" value={data.businessName} mismatch={mismatchFields.has("Business Name")} />
        <FieldCell label="Business Code" value={data.businessCode} />
        <FieldCell label="Accounting Method" value={data.accountingMethod} />
        <FieldCell label="Business Address" value={data.businessAddress} span={2} />
      </div>

      {/* Income */}
      <p style={{ fontSize: "0.6875rem", fontWeight: 700, fontFamily: "sans-serif", color: "oklch(0.3 0 0)", marginBlockEnd: "0.375rem", textTransform: "uppercase", letterSpacing: "0.06em" }}>Part I — Income</p>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "0.0625rem", backgroundColor: "oklch(0.8 0 0)", border: "0.0625rem solid oklch(0.8 0 0)", borderRadius: "0.25rem", overflow: "hidden", marginBlockEnd: "0.75rem" }}>
        <FieldCell label="Craft Sales" value={`$${data.craftSales}`} mismatch={mismatchFields.has("Total Income")} />
        <FieldCell label="Other Sales" value={`$${data.otherSales}`} mismatch={mismatchFields.has("Total Income")} />
        <FieldCell label="7. Total Income" value={`$${data.totalIncome}`} mismatch={mismatchFields.has("Total Income")} bold />
      </div>

      {/* Expenses */}
      <p style={{ fontSize: "0.6875rem", fontWeight: 700, fontFamily: "sans-serif", color: "oklch(0.3 0 0)", marginBlockEnd: "0.375rem", textTransform: "uppercase", letterSpacing: "0.06em" }}>Part II — Expenses</p>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: "0.0625rem", backgroundColor: "oklch(0.8 0 0)", border: "0.0625rem solid oklch(0.8 0 0)", borderRadius: "0.25rem", overflow: "hidden", marginBlockEnd: "0.75rem" }}>
        <FieldCell label="8. Advertising" value={`$${data.advertising}`} />
        <FieldCell label="22. Supplies" value={`$${data.supplies}`} mismatch={mismatchFields.has("Total Expenses")} />
        <FieldCell label="25. Utilities" value={`$${data.utilities}`} />
        <FieldCell label="27. Other" value={`$${data.otherExpenses}`} mismatch={mismatchFields.has("Total Expenses")} />
      </div>

      {/* Totals */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "0.0625rem", backgroundColor: "oklch(0.8 0 0)", border: "0.0625rem solid oklch(0.8 0 0)", borderRadius: "0.25rem", overflow: "hidden" }}>
        <FieldCell label="28. Total Expenses" value={`$${data.totalExpenses}`} mismatch={mismatchFields.has("Total Expenses")} bold />
        <FieldCell label="30. Home Expense" value={`$${data.homeExpense}`} />
        <FieldCell label="31. Net Profit" value={`$${data.netProfit}`} mismatch={mismatchFields.has("Net Income")} bold />
      </div>
    </article>
  )
}

function FieldCell({ label, value, span = 1, mismatch = false, bold = false }: { label: string; value: string; span?: number; mismatch?: boolean; bold?: boolean }) {
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
