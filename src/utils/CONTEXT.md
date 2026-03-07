# Context: src/utils

## Purpose
- Pure helpers and utility logic used by multiple modules.
- Generated on: 2026-03-07T10:06:29.957Z

## File Summaries
- **date.ts** (Logic module): toDateString, today, daysAgo, dateRange, monthName.
  - Dependencies: local modules only.
  - No hook usage detected.
  - Notes: Get YYYY-MM-DD string for a Date in local timezone
- **duration.ts** (Logic module): parseDuration, formatDuration, formatDurationHuman.
  - Dependencies: local modules only.
  - No hook usage detected.
  - Notes: Parse ISO 8601 duration (PT#H#M#S) to total seconds
- **exportCsv.ts** (Logic module): No obvious exported symbols.
  - Dependencies: local modules only.
  - No hook usage detected.
  - Notes: Escape a CSV field per RFC 4180
- **exportTrackerSync.ts** (Logic module): OjeetSyncPayload.
  - Dependencies: :, ;

export async function performTrackerSync() {
    const [allSessions, allVideos] = await Promise.all([
        getStudySessions(),
        getVideos(),
    ]);

    const lastSyncTime = localStorage.getItem(.
  - No hook usage detected.
  - Notes: In local dev, point to the local tracker instance; in production, use the deployed URL.

## Data Flow and Dependencies
- External dependencies referenced here: :, ;

export async function performTrackerSync() {
    const [allSessions, allVideos] = await Promise.all([
        getStudySessions(),
        getVideos(),
    ]);

    const lastSyncTime = localStorage.getItem(.
- exportCsv.ts imports local modules: ../db/db, ./date.
- exportTrackerSync.ts imports local modules: ../db/db.

## Risks / Follow-ups
- Files with side effects or environment coupling: exportTrackerSync.ts.
