# Context: src/pages

## Purpose
- Route-level React pages that compose features into full screens.
- Generated on: 2026-03-07T10:06:29.745Z

## File Summaries
- **AnalyticsPage.tsx** (UI component/module): AnalyticsPage.
  - Dependencies: @chakra-ui, lucide-react, react.
  - Hooks: useCallback, useEffect, useMemo, useState.
- **LibraryPage.tsx** (UI component/module): LibraryPage.
  - Dependencies: @chakra-ui, lucide-react, react.
  - Hooks: useCallback, useEffect, useMemo, useState.
  - Notes: Standalone videos (not in any playlist)
- **PlayerPage.tsx** (UI component/module): PlayerPage.
  - Dependencies: @chakra-ui, lucide-react, react, react-router-dom.
  - Hooks: useCallback, useEffect, useParams, useRef, useSessionTracker, useState.

## Data Flow and Dependencies
- External dependencies referenced here: @chakra-ui, lucide-react, react, react-router-dom.
- AnalyticsPage.tsx imports local modules: ../components/ui/dialog, ../db/db, ../features/analytics/StudyHeatmap, ../utils/duration, ../utils/exportCsv, ../utils/exportTrackerSync.
- LibraryPage.tsx imports local modules: ../db/db, ../features/library/AddVideoForm, ../features/library/SortableLibraryList.
- PlayerPage.tsx imports local modules: ../db/db, ../features/player/PlayerEmbed, ../hooks/useSessionTracker, ../utils/duration.

## Risks / Follow-ups
- No obvious high-risk patterns detected from static scan; validate with runtime tests.
