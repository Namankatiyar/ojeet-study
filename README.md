# OJEET Study

A distraction-free, local-first YouTube study PWA designed for students.

## 🚀 Features

- **Distraction-Free Player**: Watch YouTube videos without recommendations, comments, or sidebars.
- **Local Library**: Organize your study material with support for both individual videos and full playlists.
- **Smart Search**: Real-time search across video titles and channel names, with auto-expanding playlists.
- **Analytics & Tracking**: High-resolution study time tracking that stays purely local to your device.
- **Cross-App Sync**: One-click "Sync to Tracker" to share your analytics with [OJEE Tracker](https://ojeet-tracker.vercel.app).
- **Offline Capable**: Works as a Progressive Web App (PWA) with full dark mode support.

## 🛠️ Tech Stack

- **Frontend**: Vite + React + TypeScript
- **State/Storage**: IndexedDB (via Dexie.js)
- **UI**: Chakra UI + Lucide Icons
- **Backend**: Vercel Serverless Functions (for YouTube API proxying)
- **Drag & Drop**: @dnd-kit

## 📦 Getting Started

1.  **Clone the repository**
2.  **Install dependencies**:
    ```bash
    pnpm install
    ```
3.  **Setup environment variables**:
    Create a `.env` file with your `YOUTUBE_API_KEY`.
4.  **Run locally**:
    ```bash
    pnpm dev
    ```

## 🔒 Privacy

OJEET Study is local-first. Your library and study history are stored in your browser's IndexedDB. No tracking data is sent to a server unless you explicitly choose to export your analytics.
