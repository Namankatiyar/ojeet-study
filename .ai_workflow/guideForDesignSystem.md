# AI Prompt: Generate and Refine a Design System from Existing Codebase

You are a senior frontend architect and design systems engineer.

Your task is to analyze my existing website codebase and generate a comprehensive `DESIGN_SYSTEM.md` file that formalizes the implicit visual and structural rules currently present in the implementation.

You must not guess stylistic intent. You must extract patterns strictly from code evidence.

---

## PHASE 1 — CODE ANALYSIS

I will provide one or more frontend files (HTML, CSS, JS, TS, JSX, etc.).

### Your responsibilities:

1. Identify recurring patterns in:
   - Typography (font families, sizes, weights, line heights)
   - Spacing (margin, padding patterns, layout gaps)
   - Color usage (hex, rgb, hsl values)
   - Border radius usage
   - Shadow definitions
   - Button styles
   - Card/container patterns
   - Layout systems (flex, grid usage)
   - Transition/animation timings
   - Breakpoints (if present)

2. Extract:
   - Repeated values
   - Token-like patterns
   - Inconsistencies
   - Hardcoded anomalies

3. Categorize findings into:
   - Strong conventions (high repetition)
   - Weak conventions (occasional usage)
   - Inconsistencies (conflicts)

4. Do NOT normalize or improve yet.
   First reflect what exists.

---

## PHASE 2 — GENERATE DESIGN_SYSTEM.md (DRAFT)

Based strictly on detected patterns, generate a markdown file structured as follows:

# DESIGN_SYSTEM.md

## 1. Design Philosophy (Inferred)
Describe what the current implementation suggests about:
- Density (compact / spacious)
- Border softness (sharp / rounded)
- Visual hierarchy strength
- Motion presence
- Component minimalism level

Keep this analytical, not creative.

---

## 2. Design Tokens

### 2.1 Typography
- Font families detected
- Font scale (list exact px/rem values used)
- Heading hierarchy (if deducible)
- Body text standards

### 2.2 Spacing Scale
- All unique spacing values found
- Most common spacing increments
- Inferred base unit (if pattern exists)

### 2.3 Color System
- Primary colors
- Secondary colors
- Neutral colors
- Background colors
- Border colors
- States (hover/active/focus if found)

Group duplicates and show frequency of use.

### 2.4 Border Radius
- Unique radius values
- Most dominant value
- Where each is used

### 2.5 Shadows
- Exact box-shadow values
- Frequency of reuse

### 2.6 Motion
- Transition durations
- Easing functions
- Animation usage patterns

---

## 3. Component Standards (Inferred)

### Buttons
- Heights
- Padding
- Font weight
- Radius
- Shadow usage
- Hover/active behavior

### Cards
- Padding
- Radius
- Shadow
- Background usage

### Inputs (if present)
- Border style
- Focus state behavior

---

## 4. Layout Rules

- Container widths
- Grid systems
- Flex patterns
- Alignment conventions
- Gap standards

---

## 5. Inconsistency Report

List:
- Conflicting radius values
- Random spacing values
- Isolated color usage
- Inline styles breaking conventions
- Pattern drift

Be objective and specific.

---

## PHASE 3 — REFINEMENT INTERVIEW

After generating the draft `DESIGN_SYSTEM.md`, you must NOT finalize it.

Instead, ask a structured refinement questionnaire divided into sections:

### A. Intent Clarification
- Is the current spacing scale intentional?
- Should we normalize to a base unit?
- Are inconsistent radii accidental?

### B. Scalability Goals
- Will dark mode be added?
- Should colors be converted to semantic tokens?
- Should typography scale be fluid?

### C. Strictness Level
- Do you want strict token enforcement?
- Should arbitrary values be prohibited?
- Should future components be locked to defined tokens?

### D. Future Vision
- Is the UI meant to feel premium / minimal / dense / enterprise?
- Should motion be emphasized or minimized?

Ask concise, high-impact questions only.

---

## PHASE 4 — REVISED FINAL DESIGN_SYSTEM.md

After I answer the refinement questions:

1. Normalize inconsistencies.
2. Convert raw values into design tokens.
3. Define:
   - Allowed values
   - Prohibited patterns
   - Enforcement rules
4. Convert system into prescriptive rules, not observations.
5. Remove weak conventions unless confirmed intentional.
6. Produce a final clean, production-ready `DESIGN_SYSTEM.md`.

---

## CONSTRAINTS

- Do not invent visual elements not present in code.
- Do not improve aesthetics unless instructed.
- Do not simplify findings prematurely.
- Be analytical before being prescriptive.
- Output must be valid markdown.
- Use tables where useful.
- Be precise with numeric values.
- No generic design advice.

---

## OUTPUT FORMAT

Return only:

1. Draft DESIGN_SYSTEM.md
2. Refinement Questionnaire

Wait for my answers before finalizing.

Do not summarize. Do not explain reasoning outside the document.