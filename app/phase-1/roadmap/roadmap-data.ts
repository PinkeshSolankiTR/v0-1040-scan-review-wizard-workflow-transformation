/* ── Delivery Roadmap Data ──
   Epic > Feature > Spike hierarchy for Phase 1: Wizard Elimination
   ─────────────────────────────────────────────────────────────── */

export interface Spike {
  id: string
  title: string
  description: string
}

export interface Feature {
  id: string
  title: string
  description: string
  accentColor: string
  category: 'wizard' | 'cross-cutting'
  spikes: Spike[]
}

export interface Epic {
  id: string
  title: string
  description: string
  features: Feature[]
}

export const ROADMAP: Epic = {
  id: '4651627',
  title: 'Verification Experience - Eliminate Review Wizards via AI (Phase 1)',
  description:
    'This Epic aims to modernize and streamline the verification workflow by removing Review Wizard steps where the system can replace user actions with AI-powered automation. By analysing current usage patterns, identifying automation opportunities, and integrating decision guidelines into a self-learning AI module, the goal is to reduce manual intervention, improve processing time, and enhance user experience while maintaining accuracy and transparency through confidence-level scoring.',
  features: [
    /* ─── Wizard-Specific Features ─── */
    {
      id: '1',
      title: 'Superseded Wizard - End-to-End Automation',
      category: 'wizard',
      accentColor: 'oklch(0.55 0.18 290)',
      description:
        'This feature consolidates all analysis, architecture, AI design, and implementation work required to fully automate the Superseded Wizard -- one of the core review steps in the binder verification workflow. The Superseded Wizard currently requires manual reviewer intervention to determine which version of a document (e.g., W-2, 1099, K-1) is the most current and should be retained, and which prior versions should be marked as superseded.\n\nScope includes: Comprehensive code analysis and documentation of existing Superseded logic across both RW 1.0 and RW 2.0 (trigger conditions, decision guidelines, decision points, data flow, DB dependencies); Gap analysis comparing current system behavior against the finalized SOP\'s sequential guideline framework (payer/issuer name, ID matching, recipient validation, account numbers, tax year, amounts, maximum-data tie-breaks); Technical architecture definition for a self-learning AI reasoning engine, including backend components for guideline evaluation order, tie-breaking logic, and evidence logging; AI Prompt design, Decision Specification, and architectural blueprint for the AI model; Usage data analysis identifying top 100 binders with highest superseded document occurrences; SOP-aligned AI logic encoding: sequential guideline evaluation with stop conditions, consolidated statement handling, corrected/amended form precedence, and short-year K-1 exception handling.\n\nGoal: Replace manual superseded screening with an AI-assisted, self-learning automation layer that reduces reviewer effort, improves consistency, and delivers transparent reasoning with confidence scoring -- targeting accuracy improvement beyond the previous ~70-80% AI baseline.',
      spikes: [
        {
          id: '4904669',
          title: 'Code Analysis and Documentation - Superseded Wizard Functionality',
          description:
            'Comprehensive documentation of how Superseded wizard type currently functions in our system (both RW 1.0 and 2.0). This analysis will help us understand wizard trigger patterns, decision guidelines and usage statistics; identify optimization opportunities; support the Wizards Usage Analysis initiative; facilitate knowledge transfer and onboarding. Deliverables: Overview (purpose, triggers, outcomes), Technical Implementation (entry points, dependencies, DB tables/procedures, APIs), Trigger Conditions (activation conditions, decision guidelines, user/system events, error handling), Workflow/Process Flow (step-by-step execution, decision points, validation guidelines), Data Flow (input, transformations, output, persistence), Version Differences (RW 1.0 vs 2.0).',
        },
        {
          id: '4963387',
          title: 'Gap Analysis - Superseded Wizard',
          description:
            "Assess extracted guidelines for the Superseded Wizard versus the SOP's sequential guideline framework (payer/issuer name, IDs, recipient name, account numbers, amounts, tax year, maximum data). Identify missing or mismatched guideline implementations, incorrect stop-conditions, and any deviations in comparison logic.",
        },
        {
          id: '4963365',
          title: 'Technical Architecture Analysis - Superseded Wizard',
          description:
            'Evaluate the technical architecture for handling Superseded document identification based on the newly prepared SOP guidelines. Define how guideline-based evaluation (payer name, ID, amounts, account matching, etc.) integrates with AI reasoning to reduce manual screening. Identify backend components required to implement guideline evaluation order, tie-breaking logic, and evidence logging.',
        },
        {
          id: '4963411',
          title: 'Document Superseded AI Prompt, Decision Specification, and Technical Architecture',
          description:
            'Create three interconnected documentation deliverables: (1) AI Prompt Document - system prompt, instruction set, context framing, expected output structure, few-shot examples, guardrails; (2) AI Decision Specification - SOP-to-rule mapping, execution order, confidence scoring methodology, tie-breaking logic, escalation criteria, accept/reject/override feedback schema, Reject flow; (3) Technical Architecture Document - backend components, integration points, data flow, API contracts, UI rendering, override/rejection workflows, comparison with previous AI (~70-80% confidence), evidence logging schema.',
        },
        {
          id: '4904466',
          title: 'Identify Top 100 Binders with Highest Superseded Document Occurrences (Phase 1 - RAW DATA)',
          description:
            'Data-driven analysis. Using historical production data, identify the top 100 binders with the highest number of documents marked as superseded. Step 1: Binder-Level Identification (count superseded docs per binder, rank, select top 100). Step 2: Document-Level Frequency Analysis (list all docs triggering Superseded per binder, group by document name/form type). Step 3: Behavioral Root-Cause Classification (classify likely behavioral reasons based on current business logic).',
        },
        {
          id: '5121176',
          title: 'Identify Top 100 Binders with Highest Superseded Document Occurrences (Phase 2)',
          description:
            'Same scope as Phase 1 but extended analysis. Using historical production data, identify the top 100 binders with the highest number of documents marked as superseded. Step 1: Binder-Level Identification. Step 2: Document-Level Frequency Analysis. Step 3: Behavioral Root-Cause Classification for the highest-frequency documents.',
        },
        {
          id: '5153088',
          title: 'Consolidate Superseded SOP rules into decision logic',
          description:
            'Superseded behavior matches documented SOP outcomes for known scenarios.',
        },
        {
          id: '5153091',
          title: 'Encode sequential rule evaluation and stop logic',
          description:
            'Rules are evaluated sequentially and processing stops once an outcome is determined.',
        },
        {
          id: '5153092',
          title: 'Add consolidated statement rule branch',
          description:
            'Consolidated statement scenarios are handled distinctly from standard forms.',
        },
        {
          id: '5153093',
          title: 'Handle corrected and short-year exceptions',
          description:
            'Corrected documents and short-year are handled consistently with existing behavior. If document does not contain date range then tax year should be considered.',
        },
      ],
    },
    {
      id: '2',
      title: 'Duplicate Wizard - End-to-End Automation',
      category: 'wizard',
      accentColor: 'oklch(0.55 0.15 250)',
      description:
        'This feature consolidates all analysis, architecture, AI design, and implementation work required to fully automate the Duplicate Data Wizard. The Duplicate Wizard currently requires reviewers to manually identify and resolve duplicate documents within a binder -- comparing documents by payer name, taxpayer ID, recipient details, account numbers, and amounts to determine which copy should be marked as Original and which as Duplicate.\n\nScope includes: Comprehensive code analysis and documentation of existing Duplicate detection logic across both RW 1.0 and RW 2.0 (entry points, matching algorithms, decision trees, DB tables/procedures, API dependencies); Gap analysis validating current system guidelines against SOP-defined duplicate-detection criteria; Technical architecture definition mapping SOP guidelines to system behavior; AI/ML evaluation of previous duplicate detection capabilities; AI Prompt design, Decision Specification, and architectural blueprint for the duplicate detection AI model; SOP-aligned AI implementation.\n\nGoal: Replace manual duplicate screening with automated, guideline-driven detection augmented by AI for ambiguous cases -- delivering transparent match reasoning, confidence-based auto-apply thresholds, and a reviewer accept/reject/override workflow with feedback capture for continuous model improvement.',
      spikes: [
        {
          id: '4904672',
          title: 'Code Analysis and Documentation - Duplicate Wizard Functionality',
          description:
            'Comprehensive documentation of how Duplicate wizard type currently functions in the system (both RW 1.0 and 2.0). Deliverables: Overview, Technical Implementation, Trigger Conditions, Workflow/Process Flow, Data Flow, Version Differences.',
        },
        {
          id: '4963391',
          title: 'Gap Analysis - Duplicate Wizard',
          description:
            'Review extracted rules from the Duplicate Wizard and validate them against SOP-defined duplicate-detection criteria (payer match, ID match, recipient match, account match, amount thresholds). Document gaps, missing field comparisons, incorrect rule prioritization, and ambiguity-handling inconsistencies.',
        },
        {
          id: '4963367',
          title: 'Technical Architecture Analysis - Duplicate Wizard',
          description:
            'Document the technical architecture required for the Duplicate Wizard, mapping SOP rules to system behavior. Define how deterministic rules (payer match, recipient match, account match, amount thresholds) are orchestrated and where AI may enhance detection of non-standard or edge-case duplicates. Establish workflow, data model, and reasoning-output requirements.',
        },
        {
          id: '4963415',
          title: 'AI/ML Evaluation & Reuse - Duplicate Wizard',
          description:
            'Evaluate AI duplicate detection against SOP criteria (payer/ID/recipient/account/amount tolerance). Identify reusable similarity measures, thresholds, and match scoring. Record gaps (false positives on near-match names, account mismatches) and define remediation (strict rule filters first, AI for fuzzy cases). Specify payloads needed to display reasoning and confidence in the consolidated verification screen.',
        },
        {
          id: 'NEW-DUP-1',
          title: 'Document Duplicate AI Prompt, Decision Specification, and Technical Architecture',
          description:
            'Create AI Prompt Document, Decision Specification, and Technical Architecture Document for the Duplicate Wizard -- same structure as the Superseded deliverable but tailored to duplicate detection rules, matching logic, and confidence thresholds.',
        },
      ],
    },
    {
      id: '3',
      title: 'Pre-Verification Wizard - End-to-End Automation',
      category: 'wizard',
      accentColor: 'oklch(0.55 0.17 200)',
      description:
        'This feature consolidates all analysis, architecture, and AI design work required to eliminate the Pre-Verification Wizard as a manual step and replace it with automated, AI-driven pre-checks that run silently in the background before binder verification begins. The Pre-Verification Wizard currently requires reviewers to manually confirm document presence, completeness, and consistency before the main verification workflow can proceed -- adding time and manual effort to every binder.\n\nScope includes: Comprehensive code analysis and documentation (Phase 1 and Phase 2); Technical architecture definition for restructuring rule-based checks into a unified automation framework; AI/ML evaluation of prior pre-verification capabilities.\n\nGoal: Remove the Pre-Verification wizard entirely from the reviewer workflow by automating all pre-checks as a background process -- reducing binder setup time, eliminating a manual gate, and surfacing only exceptions that genuinely require human attention.',
      spikes: [
        {
          id: '4904450',
          title: 'Code Analysis and Documentation - Pre-verification Functionality (Phase 1)',
          description:
            'Comprehensive documentation of how Pre-Verification wizard type currently functions (both RW 1.0 and 2.0). Deliverables: Overview, Technical Implementation, Trigger Conditions, Workflow/Process Flow, Data Flow, Version Differences.',
        },
        {
          id: '5122222',
          title: 'Code Analysis and Documentation - Pre-verification Functionality (Phase 2)',
          description:
            'Phase 2 continuation of Pre-verification code analysis and documentation. Same deliverable structure as Phase 1 with deeper coverage.',
        },
        {
          id: '4963361',
          title: 'Technical Architecture Analysis - Pre-Verification Wizard',
          description:
            'Document the technical architecture needs for the Pre-Verification Wizard, including how existing guideline-based checks and validations will be restructured into a unified automation framework. Identify which components should remain guideline-based and where AI reasoning may enhance ambiguity handling (e.g., missing documents, consistency validation). Define API, data, and workflow dependencies needed for modernization.',
        },
        {
          id: '4963406',
          title: 'AI/ML Evaluation & Reuse - Pre-Verification Wizard',
          description:
            'Assess prior AI/ML behavior for Pre-Verification (document presence/consistency checks) and identify reusable components (models, feature engineering, APIs). Validate how predictions align with SOP pre-checks, where confidence is acceptable, and what is required to surface reasoning. Document gaps (e.g., missing fields, low recall on edge cases) and specify remediation (feature tweaks, thresholds, or fallback to rules).',
        },
      ],
    },
    {
      id: '4',
      title: 'Verification Wizard - End-to-End Automation',
      category: 'wizard',
      accentColor: 'oklch(0.55 0.17 145)',
      description:
        'This feature consolidates all analysis, architecture, and AI design work for the Verification Wizard -- the highest-impact wizard in the binder verification workflow, responsible for approximately 70% of total verification processing time. The Verification Wizard requires reviewers to manually perform sequential checks across document data, validating extracted values against expected outcomes through a multi-step review process.\n\nScope includes: Comprehensive code analysis and documentation; Technical architecture analysis focused on shifting from sequential manual checks to a consolidated rule/AI-driven evaluation model; AI/ML evaluation of earlier AI outputs targeting high-volume verification steps.\n\nGoal: Dramatically reduce the 70% time burden of the Verification Wizard by transitioning from sequential manual checks to an AI-assisted consolidated review model -- where AI pre-validates data, surfaces reasoning, and enables reviewers to accept or override decisions rather than performing checks from scratch.',
      spikes: [
        {
          id: '4904633',
          title: 'Code Analysis and Documentation - Verification Wizard Functionality',
          description:
            'Comprehensive documentation of how Verification wizard type currently functions (both RW 1.0 and 2.0). Deliverables: Overview, Technical Implementation, Trigger Conditions, Workflow/Process Flow, Data Flow, Version Differences.',
        },
        {
          id: '4963362',
          title: 'Technical Architecture Analysis - Verification Wizard',
          description:
            'Analyze the Verification Wizard workflow, focusing on the high-cost steps responsible for 70% of total verification time. Document how the logic can shift from sequential manual checks to a consolidated rule/AI-driven evaluation model. Provide architecture requirements for surfacing AI reasoning, enabling accept/reject patterns, and supporting confidence scoring.',
        },
        {
          id: '4963407',
          title: 'AI/ML Evaluation & Reuse - Verification Wizard',
          description:
            'Evaluate earlier AI outputs that targeted high-volume verification steps. Determine which parts reduce handling time (e.g., auto-suggest validations) and can be reused. Map predictions to SOP validations, confirm confidence scoring, and define how to expose explanation/why-this-match. Identify failure modes and define actions (model retraining with synthetic data, additional features, or rule precedence).',
        },
      ],
    },
    {
      id: '5',
      title: 'CFA Wizard - End-to-End Automation',
      category: 'wizard',
      accentColor: 'oklch(0.55 0.17 165)',
      description:
        'This feature consolidates all analysis, architecture, and AI design work required to automate the CFA (Corrected Forms Automation) Wizard. The CFA Wizard currently requires reviewers to manually identify corrected forms within a binder, determine parent-child relationships between original and corrected versions, and ensure the correct version is used for verification -- a process complicated by multiple revision cycles and varying form formats.\n\nScope includes: Comprehensive code analysis and documentation; Technical architecture definition for structured rule execution, document comparison, form-type recognition, and AI-assisted reasoning; AI/ML evaluation of prior CFA capabilities; SOP-aligned AI implementation.\n\nGoal: Automate corrected form identification and parent-child association through a hybrid rule + AI approach aligned with CFA SOPs -- reducing manual effort in multi-revision binders and ensuring the correct document version is consistently selected with transparent reasoning.',
      spikes: [
        {
          id: '4904649',
          title: 'Code Analysis and Documentation - CFA Wizard Functionality',
          description:
            'Comprehensive documentation of how CFA wizard type currently functions (both RW 1.0 and 2.0). Deliverables: Overview, Technical Implementation, Trigger Conditions, Workflow/Process Flow, Data Flow, Version Differences.',
        },
        {
          id: '4963366',
          title: 'Technical Architecture Analysis - CFA Wizard',
          description:
            'Analyze the CFA Wizard and document how current logic identifies corrected forms. Define architectural needs for structured rule execution, document comparison, form-type recognition, and AI-assisted reasoning when multiple corrected versions exist. Specify required changes to support automation across multiple corrected input formats.',
        },
        {
          id: '4963413',
          title: 'AI/ML Evaluation & Reuse - CFA Wizard',
          description:
            'Analyze prior AI handling of CFA. Determine reusable components for multi-revision detection and field variance analysis. Document confidence behavior across form types; define improvements and when rules should supersede AI. Provide integration notes for hybrid orchestration.',
        },
      ],
    },
    {
      id: '6',
      title: 'NFR Wizard - End-to-End Automation',
      category: 'wizard',
      accentColor: 'oklch(0.6 0.15 60)',
      description:
        'This feature consolidates all analysis, architecture, and AI design work required to automate the NFR (New Form Review) Wizard. The NFR Wizard currently requires reviewers to manually classify unknown or unmatched documents that the system could not automatically categorize during ingestion -- determining whether they should be associated with an existing proforma input form, left unmatched, or flagged for further review.\n\nScope includes: Comprehensive code analysis and documentation; Technical architecture assessment for classification logic, taxonomy mapping, and AI reasoning support; AI/ML evaluation of classification capabilities; SOP-aligned AI implementation.\n\nGoal: Reduce manual document classification effort by introducing AI-driven decision support that auto-classifies known document types with high confidence and routes genuinely ambiguous documents for human review -- improving throughput while maintaining classification accuracy aligned with NFR SOPs.',
      spikes: [
        {
          id: '4904654',
          title: 'Code Analysis and Documentation - NFR Wizard Functionality',
          description:
            'Comprehensive documentation of how NFR wizard type currently functions (both RW 1.0 and 2.0). Deliverables: Overview, Technical Implementation, Trigger Conditions, Workflow/Process Flow, Data Flow, Version Differences.',
        },
        {
          id: '4963371',
          title: 'Technical Architecture Analysis - NFR Wizard',
          description:
            'Perform architecture assessment for the NFR Wizard, identifying how current logic determines unknown/missing document types. Outline the future-state approach for classification logic (guideline-based), taxonomy mapping, and AI reasoning support for misclassified or incomplete data. Document integration requirements with extraction services and metadata processors.',
        },
        {
          id: '4963424',
          title: 'AI/ML Evaluation & Reuse - NFR Wizard',
          description:
            'Assess AI\'s role in classifying unknown/misaligned documents. Identify reusable taxonomy inference or metadata enrichment steps. Document accuracy by document family, note where misclassifications occur, and propose improvements (feature extraction from headers/footers, layout cues). Define when rules must take precedence and how to surface "uncertain" predictions with human-in-the-loop review.',
        },
      ],
    },
    {
      id: '7',
      title: 'Finalization Wizard - End-to-End Automation',
      category: 'wizard',
      accentColor: 'oklch(0.55 0.15 330)',
      description:
        'This feature consolidates all analysis, architecture, and AI design work required to eliminate the Finalization Wizard as a manual step and enable automatic finalization and export. The Finalization Wizard currently serves as the last gate in the binder verification workflow, requiring reviewers to manually confirm binder completeness, validate all prior wizard decisions, resolve any remaining issues, and approve the binder for final export -- a process that adds time to every binder regardless of complexity.\n\nScope includes: Comprehensive code analysis and documentation; Gap analysis comparing current system behavior against SOP expectations; Technical architecture definition for unifying rule-based logic and AI-derived suggestions; AI/ML evaluation of prior AI contributions to final binder checks.\n\nGoal: Remove the Finalization Wizard as a manual gate by enabling automatic finalization for binders that pass all validation checks -- surfacing only genuine exceptions for human review, with full audit trail and reasoning transparency for compliance requirements.',
      spikes: [
        {
          id: '4904674',
          title: 'Code Analysis and Documentation - Finalization Wizard Functionality',
          description:
            'Comprehensive documentation of how Finalization wizard type currently functions (both RW 1.0 and 2.0). Deliverables: Overview, Technical Implementation, Trigger Conditions, Workflow/Process Flow, Data Flow, Version Differences.',
        },
        {
          id: '4963394',
          title: 'Gap Analysis - Finalization Wizard',
          description:
            'Review extracted rules from the Finalization Wizard and compare them with expectations for binder completeness, document validation, and final decision checks. Identify missing steps, incorrect validation dependencies, and areas lacking reasoning output that SOP mandates.',
        },
        {
          id: '4963375',
          title: 'Technical Architecture Analysis - Finalization Wizard',
          description:
            'Analyze the Finalization Wizard workflow and define how guideline-based logic and AI-derived suggestions can unify into a single automation layer. Identify dependencies for producing final binder assessments, guideline sequencing, and AI validation checks. Document structure for returning a clean, auditable reasoning output prior to finalization.',
        },
        {
          id: '4963432',
          title: 'AI/ML Evaluation & Reuse - Finalization Wizard',
          description:
            'Review AI contributions to final binder checks (readiness, unresolved issues). Identify reusable components that summarize pass/fail states and risk signals. Document gaps where AI lacked determinism; propose hybrid approach (rules for deterministics, AI for recommendation/triage). Specify outputs required for auditable reasoning before finalization (including rejection reasons capture).',
        },
      ],
    },
    {
      id: '8',
      title: 'Tax Exempt Wizard - End-to-End Automation',
      category: 'wizard',
      accentColor: 'oklch(0.55 0.17 110)',
      description:
        'This feature consolidates all analysis, architecture, and AI design work required to automate the Tax Exempt Income Wizard. The Tax Exempt Wizard currently requires reviewers to manually validate tax-exempt documentation within a binder -- confirming that entities claiming tax-exempt status have proper supporting documentation, that exempt income amounts are correctly identified, and that any mismatches between claimed and documented exemptions are flagged and resolved.\n\nScope includes: Comprehensive code analysis and documentation; Technical architecture definition for automating tax-exempt validation; AI/ML evaluation of AI assistance for tax-exempt identification.\n\nGoal: Automate tax-exempt documentation validation through a combination of rule-based matching and AI-assisted entity/document recognition -- reducing manual review effort while ensuring compliance accuracy and providing transparent, field-level reasoning for reviewer confidence.',
      spikes: [
        {
          id: '4904693',
          title: 'Code Analysis and Documentation - Tax Exempt Income Wizard Functionality',
          description:
            'Comprehensive documentation of how Tax Exempt Income wizard type currently functions (both RW 1.0 and 2.0). Deliverables: Overview, Technical Implementation, Trigger Conditions, Workflow/Process Flow, Data Flow, Version Differences.',
        },
        {
          id: '4963374',
          title: 'Technical Architecture Analysis - Tax Exempt Wizard',
          description:
            'Define the architectural needs for automating the Tax Exempt Wizard, including how guideline-based logic validates tax-exempt documentation and identifies mismatches. Specify where AI can assist (e.g., entity recognition, document-type inference). Outline API and data-processing requirements for automated decisioning and user validation.',
        },
        {
          id: '4963431',
          title: 'AI/ML Evaluation & Reuse - Tax Exempt Wizard',
          description:
            'Evaluate AI assistance for tax-exempt identification (entity recognition, supporting doc validation). Identify reusable models and confidence thresholds that were effective. Document limitations and propose enhancements. Define how reasoning (e.g., field-level evidence) appears in UI and when to defer to rule checks.',
        },
      ],
    },
    {
      id: '9',
      title: 'CBD Wizard - End-to-End Automation',
      category: 'wizard',
      accentColor: 'oklch(0.55 0.15 20)',
      description:
        'This feature consolidates all analysis, architecture, and AI design work required to automate the CBD (Cross-Binder Detection) Wizard. The CBD Wizard currently requires reviewers to manually identify and resolve inconsistencies across multiple binders -- comparing entities, accounts, and document data across binder boundaries to detect conflicts, duplications, or missing information that could affect verification accuracy at scale.\n\nScope includes: Comprehensive code analysis and documentation; Technical architecture definition including rule-based logic for inter-binder inconsistency detection and AI opportunities for contextual matching; AI/ML evaluation of AI capabilities for cross-binder inconsistency detection.\n\nGoal: Automate cross-binder inconsistency detection through scalable AI-assisted matching and anomaly detection -- enabling reviewers to resolve genuine conflicts efficiently rather than manually scanning across binders, with transparent evidence and confidence-based auto-resolution where appropriate.',
      spikes: [
        {
          id: '4907946',
          title: 'Code Analysis and Documentation - CBD Wizard Functionality',
          description:
            'Comprehensive documentation of how CBD wizard type currently functions (both RW 1.0 and 2.0). Deliverables: Overview, Technical Implementation, Trigger Conditions, Workflow/Process Flow, Data Flow, Version Differences.',
        },
        {
          id: '4963379',
          title: 'Technical Architecture Analysis - CBD Wizard',
          description:
            'Document architectural requirements for the CBD Wizard, including guideline-based logic to detect inter-binder inconsistencies and AI opportunities for contextual matching across large datasets. Define technical needs for multi-binder comparison, data retrieval layers, caching, and conflict-resolution workflows.',
        },
        {
          id: '4963433',
          title: 'AI/ML Evaluation & Reuse - CBD Wizard',
          description:
            'Assess AI capabilities for cross-binder inconsistency detection (entity/account cross-linking, anomaly spotting). Identify reusable similarity/graph techniques and caching strategies. Document scalability/confidence behavior on larger datasets and propose improvements (indexing, embeddings, batched inference). Define how AI suggestions and evidence are presented, with clear accept/reject pathways.',
        },
      ],
    },

    /* ─── Cross-Cutting Features ─── */
    {
      id: '5152688',
      title: 'Direct LLM Integration from RW API',
      category: 'cross-cutting',
      accentColor: 'oklch(0.5 0.01 260)',
      description:
        'This feature enables direct integration between the Review Wizard (RW) API and the Open Arena LLM platform, eliminating the existing Lambda-based intermediary layer. The current architecture routes AI requests through a multi-hop path (RW API -> Lambda -> LLM), introducing unnecessary latency, complexity, and points of failure. By centralizing AI orchestration directly within the RW API, this feature simplifies the execution architecture, reduces response time, improves reliability, and provides a single point of control for prompt management, model selection, and version configuration.\n\nGoal: Establish a streamlined, maintainable AI execution pipeline by removing the Lambda intermediary -- reducing latency, simplifying debugging, and enabling rapid model iteration through configuration-driven model selection.',
      spikes: [
        {
          id: '5153070',
          title: 'Document current AI call flow (RW API -> Lambda -> LLM)',
          description:
            'Document the existing AI call flow from RW API through Lambda to the LLM endpoint. Map all integration points, data transformations, and failure modes.',
        },
        {
          id: '5153082',
          title: 'Implement Open Arena LLM client in RW API',
          description:
            'RW API successfully calls the LLM endpoint and receives structured JSON responses.',
        },
        {
          id: '5153084',
          title: 'Move prompt injection logic from Lambda to RW API',
          description:
            'Prompt data preparation and injection occur within RW API without Lambda dependency.',
        },
        {
          id: '5153086',
          title: 'Externalize model selection via configuration',
          description:
            'Model and version can be changed via configuration without code changes.',
        },
      ],
    },
    {
      id: '5152692',
      title: 'AI Explainability & Reasoning',
      category: 'cross-cutting',
      accentColor: 'oklch(0.5 0.01 260)',
      description:
        'This feature ensures that every AI-generated decision across all wizard types (Superseded, Duplicate, CFA, NFR, and beyond) is fully explainable to end users and auditable by internal stakeholders. The AI output schema is extended to include standardized reasoning fields -- such as applied rule identifiers, decision rationale, fields compared, and evidence references -- that follow a consistent structure across all wizards. The UI is updated to surface these explanations alongside suggested actions with clear confidence indicators (High / Medium / Low). This is critical for reviewer trust and adoption, QA validation workflows, compliance with Responsible AI principles, and enabling meaningful accept/reject/override decisions.\n\nGoal: Deliver full transparency into AI decision-making across all wizards -- enabling reviewers to understand why a suggestion was made, QA teams to validate AI behavior against SOPs, and leadership to demonstrate Responsible AI compliance.',
      spikes: [
        {
          id: '5153096',
          title: 'Extend AI JSON output with reasoning fields',
          description:
            'AI responses include additional fields that explain suggested actions.',
        },
        {
          id: '5153097',
          title: 'Define standardized explanation format per wizard',
          description:
            'Explanation fields follow a consistent structure across all wizards.',
        },
        {
          id: '5153099',
          title: 'UI changes to display AI reasoning',
          description:
            'UI displays AI explanations alongside suggested actions. Labels: High confidence, Medium confidence, Low confidence.',
        },
      ],
    },
    {
      id: '5152694',
      title: 'Confidence & Accuracy Measurement',
      category: 'cross-cutting',
      accentColor: 'oklch(0.5 0.01 260)',
      description:
        'This feature introduces a formal confidence and accuracy measurement framework for AI-generated suggestions across all post-verification wizards. Each AI decision is assigned a confidence score based on defined thresholds and bands, which determines whether the decision can be auto-applied (high confidence), requires human review (medium confidence), or is escalated for careful examination (low confidence). The framework also captures and persists AI suggestions alongside subsequent user actions (accept, reject, override) to enable accuracy computation over time. Additionally, the feature supports experimentation by allowing multiple prompt variations to be executed and compared for accuracy and consistency.\n\nGoal: Establish a measurable, data-driven confidence framework that enables intelligent automation (auto-apply high-confidence decisions), tracks AI accuracy over time against user actions, and supports continuous improvement through prompt experimentation and comparison.',
      spikes: [
        {
          id: '5153101',
          title: 'Define confidence bands and thresholds',
          description:
            'Confidence values are grouped into clearly defined ranges used by the system.',
        },
        {
          id: '5153102',
          title: 'Persist AI suggestions and user overrides',
          description:
            'System stores AI suggestions and subsequent user actions for analysis.',
        },
        {
          id: '5153103',
          title: 'Compute accuracy metrics',
          description:
            'Basic accuracy metrics can be calculated from stored AI and user actions.',
        },
        {
          id: '5153105',
          title: 'Generate multiple responses using different prompts to compare accuracy',
          description:
            'Multiple prompt variations can be executed and their outputs compared for accuracy and consistency.',
        },
      ],
    },
    {
      id: '5152696',
      title: 'Scalability & Performance',
      category: 'cross-cutting',
      accentColor: 'oklch(0.5 0.01 260)',
      description:
        'This feature focuses on ensuring that AI-driven analysis and suggestion generation can scale efficiently across large binders with high page counts, complex document mixes, and concurrent user loads. It evaluates and optimizes the performance characteristics of LLM calls -- including response time, throughput, token consumption, and system stability under load. The goal is to ensure that AI automation does not introduce performance bottlenecks as adoption scales across the production user base, and that the system maintains acceptable response times even for the most complex binders.\n\nGoal: Validate and optimize AI pipeline performance to ensure sub-second to low-second response times at production scale -- identifying and resolving bottlenecks in LLM calls, data preparation, and response processing before full rollout.',
      spikes: [
        {
          id: '5153106',
          title: 'Scalability & performance of LLM suggestions / AI analysis',
          description:
            'Evaluate and optimize the performance characteristics of LLM calls, including response time, throughput, and system stability.',
        },
      ],
    },
    {
      id: '4726615',
      title: 'Verification Experience Redesign (UI/UX)',
      category: 'cross-cutting',
      accentColor: 'oklch(0.5 0.01 260)',
      description:
        'This feature encompasses the redesign of the verification user experience to unify AI suggestions, rule-based outputs, reasoning transparency, confidence indicators, and accept/reject/override actions into a single, efficient interface. The current wizard-based workflow forces reviewers through sequential steps; the redesigned experience consolidates all relevant information and AI recommendations into a streamlined review surface that reduces clicks, context switching, and total time-on-task. The UI must support the new AI capabilities being built across all wizard features -- including reasoning display, confidence badges, override workflows with justification capture, rejection flows with feedback for AI learning, and cross-document comparison views.\n\nGoal: Deliver a modern, consolidated verification interface that maximizes reviewer efficiency by surfacing AI-driven insights inline -- replacing sequential wizard navigation with a unified review experience optimized for speed, clarity, and decision confidence.',
      spikes: [],
    },
    {
      id: '4726633',
      title: 'Legacy Code Migration to Scalable APIs',
      category: 'cross-cutting',
      accentColor: 'oklch(0.5 0.01 260)',
      description:
        'This feature addresses the systematic migration of the legacy codebase (20+ years old) to a modern, scalable API architecture. Using Claude AI as an analysis tool, the effort involves inventorying all legacy code modules and their dependencies, extracting and documenting embedded business logic, mapping business modules to new RESTful API endpoints with proper versioning, and implementing APIs using a modern technology stack -- all while ensuring backward compatibility during the transition period. This migration is foundational to enabling the AI-driven automation features across all wizards, as the legacy codebase lacks the modularity, testability, and API surface area required for modern AI integration.\n\nGoal: Modernize the 20-year legacy codebase into a well-documented, versioned API architecture that preserves all existing business logic while enabling AI integration, automated testing, and scalable deployment -- with zero functionality loss during transition.',
      spikes: [],
    },
    {
      id: '4904431',
      title: 'Wizards Usage Analysis - Binder Processing Statistics',
      category: 'cross-cutting',
      accentColor: 'oklch(0.5 0.01 260)',
      description:
        'This feature provides a data-driven analysis of wizard usage patterns across the entire binder verification workflow, identifying which wizards are triggered most frequently during binder processing regardless of RW version (1.0 or 2.0). The analysis covers a full calendar year (January 1 - December 31) and produces metrics including total binders processed and occurrence counts for each wizard type (Pre-Verification, Verification, Superseded, CFA, Duplicate, NFR, CBD, Finalization). The output informs prioritization decisions for the automation roadmap -- ensuring the highest-impact wizards are automated first for maximum time savings and reviewer efficiency gains.\n\nGoal: Establish a quantitative baseline of wizard usage frequency and volume to drive data-informed prioritization of automation efforts -- ensuring the highest-impact wizards are automated first for maximum time savings and reviewer efficiency gains.',
      spikes: [],
    },
  ],
}
