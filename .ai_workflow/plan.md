# Cross-Website Analytics Integration Plan: OJEET-STUDY ↔ OJEE Tracker

## Context & Architecture Constraints
**OJEET-STUDY** uses IndexedDB (Dexie) to track high-resolution, timer-based study sessions.
**OJEE Tracker** uses `localStorage` (and Context API) as a "zero-server", highly-persistent syllabus and daily planner.

Both adhere to a **"Local-First" / Offline-Capable** philosophy. 

Modern browsers strictly enforce **Storage Partitioning** (to prevent tracking). This means `ojeet-study.com` cannot directly access `ojeet-tracker.com`'s local storage or IndexedDB, and hidden `iframe` communication is frequently blocked by Intelligent Tracking Prevention (Safari) or third-party cookie blocking (Chrome).

Therefore, we need grounded, realistic approaches to bridge this gap. Here are 3 viable architectural options, ranked by friction and complexity.

---

## Option 1: The "Deep-Link Payload" Bridge (Recommended: Lowest Infrastructure)
**How it works**: OJEET-STUDY compresses daily aggregate data into a URL string and redirects the user to OJEE Tracker's import route.

### Workflow:
1. User clicks "Send Analytics to Tracker" in OJEET-STUDY.
2. We aggregate today's videos into a JSON object: `{ date: "2026-03-04", totalSeconds: 7200, items: ["Physics PyQs"] }`.
3. We compress this via `LZString` or Base64 and append it to a URL: `https://ojeet-tracker.vercel.app/sync?payload=ey...`
4. The browser navigates to that URL.
5. OJEE Tracker parses the parameter, updates its `UserProgressContext` (e.g. marking 2 hours on the study clock log or checking off a generated task), and shows a success toast.

**Pros**: 100% zero-server, completely bypasses browser partition blocking, instant.
**Cons**: Requires a page navigation (opening a new tab or replacing current tab), URL length is limited to ~2000 chars (fine for daily aggregations, bad for lifetime exports).

---

## Option 2: The "Sync Passphrase" via Vercel KV (Recommended: Most Seamless)
**How it works**: Since OJEET-STUDY already uses Vercel Serverless, we can add Vercel KV (Redis) to act as an anonymous, transient bridge.

### Workflow:
1. In both apps, the user enters the same randomly generated "Sync Passphrase" (e.g., `purple-tiger-99`) in the settings.
2. When OJEET-STUDY finishes a session, it makes a quick background `POST /api/sync/push` with the passphrase. The serverless function updates a Redis key (`sync:purple-tiger-99`).
3. When OJEE Tracker loads, it makes a `GET /api/sync/pull` to retrieve the data from Redis and merges it into `localStorage`. 

**Pros**: Completely seamless background sync, feels like magic across different devices (mobile tracker, desktop study). 
**Cons**: Requires network connection, slightly violates strict "zero-server" rules, requires nominal setup (matching phrases once).

---

## Option 3: Standard Export/Import JSON (Fallback)
**How it works**: Building on your existing CSV export, we build an OJEE JSON Export.

### Workflow:
1. OJEET-STUDY exports an `ojeet-sync.json` file.
2. OJEE Tracker gets a drag-and-drop "Import Analytics" zone.
3. Tracker parses the JSON and merges it into its StudyClock/Tracker history.

**Pros**: Infinite data size, offline, highly robust.
**Cons**: High user friction (manual file management).

---

## Implementation Plan (Targeting Option 1: Deep-Link Payload)

Since OJEE Tracker's architecture strictly avoids servers and relies on `localStorage`, **Option 1** is the most grounded and immediately implementable strategy.

### Step 1: OJEET-STUDY (Export Side)
1. Determine the target Domain for OJEE tracker (e.g. `ojeet-tracker.vercel.app`).
2. Add an `ExportToTracker` UI component in `AnalyticsPage.tsx`.
3. Create a helper function `createSyncUrl()` that:
   - Queries `db.studySessions` for today's logs.
   - Maps video IDs to titles.
   - Summarizes total focused duration.
   - Uses `btoa(JSON.stringify(payload))` to encode it safely.
   - Constructs a URL: `[TRACKER_URL]/import?payload=[ENCODED_DATA]`.
4. Opens the URL in a new window/tab: `window.open(syncUrl, '_blank')`.

### Step 2: OJEE Tracker (Import Side)
1. Add a new route in `AppRoutes.tsx` for `/import`.
2. Create an `ImportSyncPage.tsx` that:
   - Reads `useSearchParams()` for `?payload=`.
   - Decodes `JSON.parse(atob(payload))`.
3. Mappings:
   - Connect to `UserProgressContext.addExternalSession()`.
   - Log the imported study time into the Tracker's daily history/study clock context so it reflects on its dashboard and heatmaps.
4. Auto-redirect the user back to the Tracker Dashboard with a success toast.

---

## Data Contract Design

To ensure OJEE Tracker can read the data, OJEET-STUDY should output a standard payload shape:

```typescript
interface OjeetSyncPayload {
    source: "ojeet-study";
    timestamp: string; // ISO String of sync creation
    sessions: Array<{
        title: string;          // Youtube Video Title or Playlist Title
        durationSeconds: number; // Actual tracked focus time
        date: string;           // YYYY-MM-DD
    }>;
}
```

This strict contract prevents cross-app logic breaks and ensures the zero-server integration is highly reliable.
