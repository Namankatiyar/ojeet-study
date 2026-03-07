# Context: src/hooks

## Purpose
- Custom React hooks for stateful behavior and side effects.
- Generated on: 2026-03-07T10:06:29.624Z

## File Summaries
- **useInstallPrompt.ts** (React hook): useInstallPrompt.
  - Dependencies: react.
  - Hooks: useCallback, useEffect, useInstallPrompt, useState.
  - Notes: Check if already installed via display-mode
- **useSessionTracker.ts** (React hook): useSessionTracker.
  - Dependencies: react, uuid.
  - Hooks: useCallback, useEffect, useRef, useSessionTracker.
  - Notes: YouTube Player States

## Data Flow and Dependencies
- External dependencies referenced here: react, uuid.
- useSessionTracker.ts imports local modules: ../db/db.

## Risks / Follow-ups
- Files with side effects or environment coupling: useInstallPrompt.ts, useSessionTracker.ts.
