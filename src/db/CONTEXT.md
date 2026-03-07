# Context: src/db

## Purpose
- Persistence models and client-side database access.
- Generated on: 2026-03-07T10:06:29.483Z

## File Summaries
- **db.ts** (Database): VideoTag, Video, Playlist, CustomFolder, StudySession.
  - Dependencies: dexie.
  - No hook usage detected.
  - Notes: Aggregate study minutes per day for heatmap

## Data Flow and Dependencies
- External dependencies referenced here: dexie.
- Internal module links: no local imports in this directory.

## Risks / Follow-ups
- Files with side effects or environment coupling: db.ts.
