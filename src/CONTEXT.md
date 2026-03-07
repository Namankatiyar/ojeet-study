# Context: src

## Purpose
- React modules for presentation and interaction in this feature area.
- Generated on: 2026-03-07T10:06:29.431Z

## File Summaries
- **App.tsx** (UI component/module): App, NavBar, InstallBanner, AppContent.
  - Dependencies: @chakra-ui, lucide-react, react, react-router-dom.
  - Hooks: useInstallPrompt, useLocation, useState.
- **index.css** (Styling): No obvious exported symbols.
  - Dependencies: local modules only.
  - No hook usage detected.
- **main.tsx** (UI component/module): No obvious exported symbols.
  - Dependencies: react, react-dom.
  - No hook usage detected.
  - Notes: Register service worker (vite-plugin-pwa handles this in production builds)

## Data Flow and Dependencies
- External dependencies referenced here: @chakra-ui, lucide-react, react, react-dom, react-router-dom.
- App.tsx imports local modules: ./components/ui/dialog, ./hooks/useInstallPrompt, ./pages/AnalyticsPage, ./pages/LibraryPage, ./pages/PlayerPage, ./utils/exportTrackerSync.
- main.tsx imports local modules: ./App, ./index.css.

## Risks / Follow-ups
- Files with side effects or environment coupling: main.tsx.
