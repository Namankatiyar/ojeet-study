# OJEET Study

## Project Overview
OJEET Study is a distraction-free, local-first YouTube study Progressive Web App (PWA) designed for students. It allows users to watch YouTube videos without recommendations, comments, or sidebars, while tracking their study time locally.

### Key Technologies
- **Frontend Framework:** React with TypeScript
- **Build Tool:** Vite
- **UI Component Library:** Chakra UI + Lucide Icons
- **Local Storage/State:** IndexedDB using Dexie.js
- **Backend/API Proxy:** Vercel Serverless Functions
- **Cloud Database (Sync):** Supabase (for cross-app syncing and remote aggregation)
- **Service Worker:** Custom Workbox implementation for PWA capabilities (caching thumbnails and APIs while deliberately bypassing video streams to prevent memory bloat).
- **Package Manager:** pnpm

## Building and Running

Ensure you have `pnpm` installed and have created a `.env.local` or `.env` file containing your `YOUTUBE_API_KEY` and Supabase configuration (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`).

- **Install dependencies:**
  ```bash
  pnpm install
  ```
- **Run the development server:**
  ```bash
  pnpm dev
  ```
- **Build for production:**
  ```bash
  pnpm build
  ```
- **Preview the production build locally:**
  ```bash
  pnpm preview
  ```
- **Run the linter:**
  ```bash
  pnpm lint
  ```

## Development Conventions
- **Language:** Write all code in TypeScript (`.ts` for logic, `.tsx` for React components).
- **Styling:** Use Chakra UI for styling and layout where possible.
- **Local-First Architecture:** Treat Dexie.js (IndexedDB) as the primary source of truth. Remote database operations (like Supabase sync) should happen asynchronously in the background.
- **Service Worker & PWA:** The project uses a custom Service Worker strategy (`injectManifest`) in `src/sw.ts` to manage offline caching while explicitly avoiding caching or intercepting large YouTube video chunks (`googlevideo.com`, `youtube-nocookie.com`). Do not interfere with this bypass logic, as it prevents severe memory leaks.
- **Linting & Formatting:** Ensure code passes ESLint checks (`pnpm lint`) and adheres to standard React and TypeScript hooks/refresh rules.
