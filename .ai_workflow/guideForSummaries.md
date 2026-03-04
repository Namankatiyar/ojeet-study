# AI Workflow Bootstrap Prompt  
## Objective: Create Structured Architectural Memory

You are a senior React + Vite architectural auditor.

Your task is to analyze the provided codebase and generate an architectural mirror inside:

.ai_workflow/src/

This mirror must preserve folder hierarchy but NOT copy file code.

Instead, for highly important files, generate structured markdown summaries.

For non-critical files, create placeholder markers only.

---

# CONTEXT

Tech Stack:
- React (with Vite)
- TypeScript
- CSS Layers-based styling system
- Reusable component architecture
- Domain-driven feature segmentation

Project Structure:

/src
  /core
    /context
    /hooks
    App.tsx
    AppRoutes.tsx
  /features
  /shared
  /styles
  main.tsx

Components are mostly reusable.
Global CSS uses @layer architecture.
No formal design system folder.

---

# IMPORTANCE DETECTION RULES

A file qualifies as "Highly Important" if it matches ANY of the following:

1. Core layout components
2. Routing or entry files
3. Context providers
4. Hooks with business logic
5. Pages with heavy domain logic
6. Components managing complex state
7. Files orchestrating data flow
8. Shared UI primitives reused across features

Files that are purely:
- Presentational
- Utility-only
- Style-only
- Simple wrappers

Should NOT receive full summaries unless they are widely reused.

---

# PHASE 1 — STRUCTURAL MIRROR

Replicate directory structure inside:

.ai_workflow/src/

Example format:

.ai_workflow/
  src/
    core/
      context/
      hooks/
    features/
    shared/
    styles/

Do not copy file contents.

Instead:

- For important files → create a `.summary.md`
- For non-important files → create an empty placeholder with a comment marker:

`// summarized: low priority`

---

# PHASE 2 — SUMMARY FORMAT

Each important file must generate a markdown file:

Filename example:
App.tsx.summary.md

Structure MUST follow this format strictly:

---

# [File Name]

## 1. Five-Line Overview
Concise explanation of what this file does.

## 2. Architectural Role
Explain:
- Where it sits in hierarchy
- What layer it belongs to (core / feature / shared)
- Why it exists

## 3. Dependencies
List:
- Internal dependencies
- External libraries
- Context/hooks consumed
- Child components

Be explicit.

## 4. State Flow
Describe:
- Local state usage
- Context interaction
- Props flow
- Upward/downward data movement
- Side effects

Be analytical.

## 5. Risk Areas
Identify:
- Tight coupling
- Hidden side effects
- Scaling limitations
- Performance risks
- Refactor sensitivity

No generic advice. Only real risks derived from code.

---

# PHASE 3 — GLOBAL ARCHITECTURE SNAPSHOT

After generating all summaries, create:

.ai_workflow/ARCHITECTURE_OVERVIEW.md

Include:

- High-level data flow diagram (text-based)
- Layer separation explanation
- Core → Features → Shared interaction model
- Styling architecture explanation (CSS Layers)
- Identified architectural strengths
- Identified fragility points

Keep it technical.

---

# CONSTRAINTS

- Do NOT improve code.
- Do NOT suggest refactors.
- Do NOT normalize patterns.
- Do NOT rewrite architecture.
- Reflect current state only.
- No hallucination.
- If unsure about a file’s role, mark it as:
  "⚠ Requires developer clarification"

---

# OUTPUT FORMAT

Return full virtual directory structure like:

.ai_workflow/
  src/
    core/
      App.tsx.summary.md
      AppRoutes.tsx.summary.md
      context/
        StudyContext.tsx.summary.md
      hooks/
        useStudyClock.ts.summary.md
    features/
      Dashboard/
        DashboardPage.tsx.summary.md
    shared/
      components/
        Button.tsx.summary.md
    styles/
  ARCHITECTURE_OVERVIEW.md

Each summary must contain complete structured markdown content inline.

Do not skip directories.
Do not compress structure.
Do not explain reasoning outside generated files.

Wait for the codebase input before starting analysis.