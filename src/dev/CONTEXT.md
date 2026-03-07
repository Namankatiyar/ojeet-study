# Context: src/dev

## Purpose
- Supporting modules for this area of the application.
- Generated on: 2026-03-07T10:06:29.534Z

## File Summaries
- **apiProxy.ts** (Logic module): apiDevPlugin.
  - Dependencies: fs, path, vite.
  - No hook usage detected.
  - Notes: * Vite dev server plugin that proxies /api/youtube/* requests locally. * In production, Vercel Serverless Functions handle these routes. * During dev, this p...

## Data Flow and Dependencies
- External dependencies referenced here: fs, path, vite.
- Internal module links: no local imports in this directory.

## Risks / Follow-ups
- Files with side effects or environment coupling: apiProxy.ts.
