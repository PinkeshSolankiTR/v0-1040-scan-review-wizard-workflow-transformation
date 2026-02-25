import { Download } from 'lucide-react'

export default function DownloadSpecPage() {
  return (
    <main style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      minBlockSize: '100vh',
      backgroundColor: 'oklch(0.97 0.003 260)',
      fontFamily: 'var(--font-sans)',
    }}>
      <article style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '1.5rem',
        padding: '3rem',
        backgroundColor: 'oklch(1 0 0)',
        borderRadius: '0.5rem',
        border: '0.0625rem solid oklch(0.91 0.005 260)',
        boxShadow: '0 0.25rem 1rem oklch(0 0 0 / 0.06)',
        maxInlineSize: '28rem',
        textAlign: 'center',
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          inlineSize: '3.5rem',
          blockSize: '3.5rem',
          borderRadius: '0.75rem',
          backgroundColor: 'oklch(0.95 0.04 240)',
        }}>
          <Download style={{ inlineSize: '1.5rem', blockSize: '1.5rem', color: 'oklch(0.45 0.18 240)' }} />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <h1 style={{
            fontSize: '1.25rem',
            fontWeight: 700,
            color: 'oklch(0.2 0.01 260)',
            margin: 0,
          }}>
            AI Learning Feedback Loop Spec
          </h1>
          <p style={{
            fontSize: '0.875rem',
            lineHeight: 1.6,
            color: 'oklch(0.5 0.01 260)',
            margin: 0,
          }}>
            Word document containing the complete specification for AI Learning from User Overrides (Feedback Loop) for the Superseded Wizard.
          </p>
        </div>

        <a
          href="/api/download-spec"
          download="AI-Learning-Feedback-Loop-Spec.docx"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.75rem 1.5rem',
            fontSize: '0.875rem',
            fontWeight: 600,
            color: 'oklch(1 0 0)',
            backgroundColor: 'oklch(0.45 0.18 240)',
            borderRadius: '0.375rem',
            textDecoration: 'none',
            cursor: 'pointer',
            border: 'none',
          }}
        >
          <Download style={{ inlineSize: '1rem', blockSize: '1rem' }} />
          Download .docx
        </a>

        <p style={{
          fontSize: '0.75rem',
          color: 'oklch(0.6 0.01 260)',
          margin: 0,
        }}>
          Sections included: User Override Workflow, Learning Pipeline, Learned Rule Structure, Confidence Ramp, UI Presentation, Administration, Example Scenario
        </p>
      </article>
    </main>
  )
}
