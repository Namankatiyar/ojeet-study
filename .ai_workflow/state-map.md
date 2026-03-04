# State Map

---

## 1. State Classification Overview

This application manages state primarily via local persistent storage (IndexedDB) as the source of truth, avoiding heavy global runtime containers like Redux.

- **Persistent storage state**: Core application data stored entirely client-side using IndexedDB (Dexie.js), including video metadata, playlists, and tracking events.
- **Derived/computed state**: Values calculated from raw persistent data, such as search filtering results, global sort ordering, and aggregated daily study analytics for the heatmap.
- **Module-scoped / UI state**: React local component state (e.g., `useState`, `useRef`) used for search queries, loading flags, drag-and-drop ephemeral state, and form inputs.
- **Ephemeral interaction state**: Real-time interval tracking and event accumulators within hooks (`useSessionTracker`) simulating finite state machines for focus detection.

---

## 2. Global Runtime State

The application enforces a "Local-First" architecture where IndexedDB is the primary global state container. There are no standalone in-memory global state stores (e.g., Zustand/Redux).

*(No global in-memory state containers exist — state is read from DB directly into Module-Scoped State on mount or refresh).*

---

## 3. Module-Scoped State

### Module: src/hooks/useSessionTracker.ts

Internal State:
- `tickAccumulator` (Ref): Tracks elapsed fractional seconds of active study.
- `lastFocused` (Ref): Timestamp of the last visibility/focus gain.
- `isActive` / `isActiveInterval` (Ref): Boolean and interval ID tracking if the study session is currently recording.
- `pendingPlayEvent` (Ref): Caches the latest play event before committing to the database.

Purpose:
- Implements a state machine to accurately track study time, ensuring time is only accumulated when the user is actively focused on the unpaused video.

Mutated By:
- Internal `tick` function (runs every 100ms).
- Focus, visibility, and YouTube IFrame player event listeners.

Externally Influenced By:
- Browser DOM events (`visibilitychange`, `focus`, `blur`).
- YouTube Player API events (play, pause, buffer, rate change).

Risk Level:
- High (complex event interleaving and interval management).

---

### Module: src/hooks/useInstallPrompt.ts

Internal State:
- `installPromptEvent` (State): Holds the browser's native `BeforeInstallPromptEvent`.
- `isInstallable` (State): Boolean indicating if the prompt can be shown.

Purpose:
- Manages the lifecycle of the PWA install prompt.

Mutated By:
- `beforeinstallprompt` window event listener.
- Dismissal/acceptance interaction by the user.

Externally Influenced By:
- Browser PWA heuristics and user `localStorage` flags.

Risk Level:
- Low.

---

### Module: src/pages/LibraryPage.tsx

Internal State:
- `videos`, `playlists` (State): Cached DB data.
- `searchQuery` (State): Raw string from user typing.

Purpose:
- Holds the view model for the library page to render dragged items and search results without hitting the DB on every keystroke.

Mutated By:
- DB fetch callbacks (`loadData`).
- Controlled `Input` component (search query).

Externally Influenced By:
- User typing, drag-and-drop array mutations.

Risk Level:
- Medium (React closure staleness during drag events).

---

## 4. Persistent State

### Storage Mechanism: IndexedDB (ojeet-study via Dexie.js)

Keys (Tables):
- `videos`: Object — YouTube video metadata, added time, duration, and global `sortOrder`.
- `playlists`: Object — YouTube playlist metadata, thumbnail, sync settings, and global `sortOrder`.
- `studySessions`: Object — High-level study block with `startTime`, `endTime`, `focusedDurationSeconds`.
- `sessionEvents`: Object — Granular timeline of events (`play`, `pause`, `focus_lost`, etc.).

Written By:
- `/src/db/db.ts` repository helpers.
- Called by `youtube.ts` (adding videos), `useSessionTracker.ts` (recording time), and `SortableLibraryList.tsx` (reordering).

Read By:
- `LibraryPage.tsx`, `AnalyticsPage.tsx`, `PlayerPage.tsx`.

Load Timing:
- On demand (component mount or explicit refresh triggers).

Serialization Format:
- Structured Clone Algorithm (IndexedDB native).

Migration Strategy:
- Exists via Dexie `Version` upgrades (e.g., v1 -> v2 added `sortOrder` to playlists).

Failure Handling:
- Defined via Dexie Promise rejections and transactional rollbacks.

---

### Storage Mechanism: localStorage

Keys:
- `ojeet-study-installed`: string ("true") — Flag indicating if the user has dismissed or accepted the PWA install banner.

Written By:
- `useInstallPrompt.ts` (on dismiss or install).

Read By:
- `useInstallPrompt.ts` (on mount).

Load Timing:
- On startup / mount.

Serialization Format:
- Raw string.

---

## 5. Derived / Computed State

### Derived State: orderedItems

Derived From:
- `videos` array, `playlists` array, `searchQuery` string (in `LibraryPage.tsx`).

Used By:
- `SortableLibraryList.tsx` (rendering the interleaved drag-and-drop list).

Recomputed When:
- `searchQuery` changes, or DB fetch updates `videos`/`playlists`.

Storage:
- Computed on access (memoized via `useMemo`).

Risk:
- Low (computation is relatively cheap).

---

### Derived State: Heatmap cell data

Derived From:
- `dailyData` array from IndexedDB (`AnalyticsPage.tsx` -> `StudyHeatmap.tsx`).

Used By:
- `StudyHeatmap.tsx`.

Recomputed When:
- `dailyData` prop changes.

Storage:
- Computed on access, transformed into full yearly sparse arrays via map and memoized.

Risk:
- Medium (date arithmetic edge cases around daylight savings or timezone shifts).

---

## 6. Event → State Transition Map

Event: Search Input Change
Source:
- DOM / Keyboard
Mutates:
- `searchQuery` in `LibraryPage.tsx`.
Mutation Type:
- Replace.
Downstream Effects:
- `orderedItems` memo triggers re-evaluation, filtering UI immediately.

Event: Item Drag Dropped
Source:
- DOM / Pointer / Keyboard (@dnd-kit)
Mutates:
- `sortOrder` field on `videos` and `playlists` in IndexedDB.
Mutation Type:
- Replace / Bulk Update.
Downstream Effects:
- Triggers DB fetch which updates module-scoped `videos`/`playlists` state, forcing UI re-render.

Event: Window Blur / Focus
Source:
- DOM (`visibilitychange`, `blur`, `focus`)
Mutates:
- `sessionEvents` (writes `focus_lost` / `focus_gained` to DB).
- `tickAccumulator` state in `useSessionTracker`.
Mutation Type:
- Append (DB) / Accumulate (Ref).
Downstream Effects:
- Stops or resumes the background timer.

Event: YouTube Player State Change
Source:
- Internal (External API IFrame bridge)
Mutates:
- `sessionEvents` (writes `play` / `pause`).
Mutation Type:
- Append.
Downstream Effects:
- Toggles the `isActive` state for the visual badge and accumulator.

---

## 7. State Ownership Matrix

State Name | Owner | Writers | Readers | Persistent | Risk Level
-----------|--------|----------|----------|------------|-----------
Videos Table | db.ts | youtube.ts, SortableLibraryList | LibraryPage, PlayerPage | Yes (IndexedDB) | Low
Playlists Table | db.ts | youtube.ts, SortableLibraryList | LibraryPage | Yes (IndexedDB) | Low
StudySessions Table | db.ts | useSessionTracker | AnalyticsPage | Yes (IndexedDB) | Medium
SessionEvents Table | db.ts | useSessionTracker | AnalyticsPage | Yes (IndexedDB) | Medium
orderedItems | LibraryPage | LibraryPage (via search/DB props) | SortableLibraryList | No | Low
Tracker Intervals | useSessionTracker | useSessionTracker | useSessionTracker | No | High

---

## 8. State Lifecycle Phases

- **Application initialization**: Mounts React tree, connects to Dexie IndexedDB, checks `localStorage` for PWA state.
- **Library View**: Fetches `videos` and `playlists`. State resides in memory until unmount.
- **Video Playback (Player open)**: `useSessionTracker` mounts. A new UUID is generated for the `StudySession`. Intervals begin polling.
- **Tracking Interaction (Play/Pause/Tab Switch)**: Ephemeral state `tickAccumulator` increments. Database `sessionEvents` are appended continuously.
- **Player close (Navigation away)**: `useSessionTracker` unmounts. `tickAccumulator` commits final boundary event to database and syncs `focusedDurationSeconds`.
- **Application close**: All React module scope dies; IndexedDB persists the master records safely.

---

## 9. State Invariants

- A `sortOrder` must uniquely exist across all merged library items (videos + playlists) for DND to resolve correctly.
- `focusedDurationSeconds` inside a `StudySession` must only increment if: Player = PLAYING && Document = VISIBLE && Window = FOCUSED.
- PWA `ojeet-study-installed` flag prevents redundant install prompts.
- Database deletes for Playlists must be cascading (Playlist -> Videos -> StudySessions -> SessionEvents).

---

## 10. State Risk Assessment

- **Implicit Shared Mutable Objects**: @dnd-kit mutates array positioning optimistically. If the DB transaction fails mid-drag, the UI state could silently drift from DB state. (Medium risk).
- **Multiple writers to same state**: Database writes are generally sequential, except if the user rapidly switches videos while the `useSessionTracker` unmount hook is asynchronously committing final session events. (Low risk, thanks to Dexie queuing).
- **Derived state stored redundantly**: None found. All filtering/sorting is done at the view/hook boundary securely.
- **State tightly coupled to external API**: The YouTube Player object lives globally outside React DOM closures and communicates via refs. If React hot-reloads, the IFrame handle can detach from the `useSessionTracker` state (Dev-only Medium risk).
