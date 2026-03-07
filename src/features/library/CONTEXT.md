# Context: src/features/library

## Purpose
- React modules for presentation and interaction in this feature area.
- Generated on: 2026-03-07T10:06:30.207Z

## File Summaries
- **AddVideoForm.tsx** (UI component/module): AddVideoForm.
  - Dependencies: @chakra-ui, lucide-react, react.
  - Hooks: useCallback, useState.
- **PlaylistGroup.tsx** (UI component/module): PlaylistGroup.
  - Dependencies: @chakra-ui, lucide-react, react, react-router-dom.
  - Hooks: useCallback, useNavigate, useState.
  - Notes: Optional drag props for sortable list
- **SortableLibraryList.tsx** (UI component/module): LibraryItem, SortableLibraryList, SortableItemWrapper.
  - Dependencies: @chakra-ui, @dnd-kit, lucide-react, react, react-router-dom.
  - Hooks: useCallback, useEffect, useNavigate, useRef, useSensor, useSensors, useSortable, useState.
  - Notes: BUG 4 FIX: Merge isDragging opacity and watched opacity into a single value
- **SortableVideoList.tsx** (UI component/module): SortableVideoList, SortableVideoItem.
  - Dependencies: @chakra-ui, @dnd-kit, lucide-react, react, react-router-dom.
  - Hooks: useCallback, useNavigate, useSensor, useSensors, useSortable.

## Data Flow and Dependencies
- External dependencies referenced here: @chakra-ui, @dnd-kit, lucide-react, react, react-router-dom.
- AddVideoForm.tsx imports local modules: ../../services/youtube.
- PlaylistGroup.tsx imports local modules: ../../db/db, ../../utils/duration.
- SortableLibraryList.tsx imports local modules: ../../db/db, ../../utils/duration, ./PlaylistGroup.
- SortableVideoList.tsx imports local modules: ../../db/db, ../../utils/duration.

## Risks / Follow-ups
- No obvious high-risk patterns detected from static scan; validate with runtime tests.
