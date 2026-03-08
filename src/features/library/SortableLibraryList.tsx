import { useCallback, useRef, useEffect, useState } from 'react';
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    TouchSensor,
    useSensor,
    useSensors,
    type DragEndEvent,
} from '@dnd-kit/core';
import {
    SortableContext,
    sortableKeyboardCoordinates,
    verticalListSortingStrategy,
    useSortable,
    arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Box, Text, Image, IconButton, Flex } from '@chakra-ui/react';
import { GripVertical, Trash2, Play, Star, CheckCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import type { Video, Playlist } from '../../db/db';
import { updateVideoSortOrders, updatePlaylistSortOrders, deleteVideo, toggleVideoFavorite, toggleVideoWatched } from '../../db/db';
import { formatDuration } from '../../utils/duration';
import { PlaylistGroup } from './PlaylistGroup';

export type LibraryItem =
    | { type: 'video'; data: Video; sortOrder: number }
    | { type: 'playlist'; data: Playlist; sortOrder: number; playlistVideos: Video[] };

interface SortableLibraryListProps {
    items: LibraryItem[];
    searchQuery: string;
    onUpdate: () => void;
}

function SortableItemWrapper({
    item,
    searchQuery,
    isDragDisabled,
    onUpdate,
}: {
    item: LibraryItem;
    searchQuery: string;
    isDragDisabled: boolean;
    onUpdate: () => void;
}) {
    const navigate = useNavigate();
    const id = item.type === 'video' ? `video-${item.data.id}` : `playlist-${item.data.id}`;

    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id });

    // BUG 4 FIX: Merge isDragging opacity and watched opacity into a single value
    // to prevent inline style overriding Chakra's opacity prop on watched videos
    const resolvedOpacity = isDragging ? 0.5 : (item.type === 'video' && item.data.watched ? 0.45 : 1);

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: resolvedOpacity,
        zIndex: isDragging ? 2 : 1,
        position: 'relative' as const,
    };

    const handleDeleteVideo = useCallback(async (videoId: string) => {
        await deleteVideo(videoId);
        onUpdate();
    }, [onUpdate]);

    if (item.type === 'playlist') {
        // PLAYLIST VIDEO ORDER FIX: sort ascending by sortOrder so the first video
        // added to the playlist appears first and the last added appears last,
        // independent of the outer library's newest-first (descending) order.
        const sortedPlaylistVideos = [...item.playlistVideos].sort(
            (a, b) => a.sortOrder - b.sortOrder,
        );

        return (
            <Box ref={setNodeRef} style={style}>
                <PlaylistGroup
                    playlist={item.data}
                    playlistVideos={sortedPlaylistVideos}
                    searchQuery={searchQuery}
                    onUpdate={onUpdate}
                    dragAttributes={attributes}
                    // BUG 2 FIX: Don't pass drag listeners when search is active
                    dragListeners={isDragDisabled ? undefined : listeners}
                />
            </Box>
        );
    }

    const video = item.data;

    return (
        <Box
            ref={setNodeRef}
            style={style}
            borderWidth="1px"
            borderColor="var(--border-color)"
            bg="var(--bg-secondary)"
            p={{ base: 2.5, sm: 3 }}
            borderRadius="md"
            display="flex"
            alignItems="center"
            gap={{ base: 2, sm: 3 }}
            // BUG 4 FIX: opacity removed from here — now handled in style above
            _hover={{ bg: 'var(--bg-tertiary)', borderColor: 'var(--border-hover)' }}
            transition="all 0.15s"
            role="listitem"
            aria-label={video.title}
        >
            {/* BUG 2 FIX: Disable listeners and show visual cue when search is active */}
            <Box
                {...attributes}
                {...(isDragDisabled ? {} : listeners)}
                cursor={isDragDisabled ? 'not-allowed' : 'grab'}
                flexShrink={0}
                title={isDragDisabled ? 'Clear search to reorder' : undefined}
            >
                <GripVertical
                    size={18}
                    color={isDragDisabled ? 'var(--border-color)' : 'var(--text-muted)'}
                />
            </Box>

            <Image
                src={video.thumbnailUrl}
                alt={video.title}
                w={{ base: '96px', sm: '120px' }}
                h={{ base: '54px', sm: '68px' }}
                objectFit="cover"
                borderRadius="4px"
                flexShrink={0}
            />

            <Box flex={1} minW={0}>
                <Text fontSize="sm" fontWeight="600" lineClamp={2} color="var(--text-primary)">
                    {video.title}
                </Text>
                <Text fontSize="xs" color="var(--text-secondary)" mt={0.5}>
                    {video.channelName}
                </Text>
                {video.durationSeconds > 0 && (
                    <Text fontSize="xs" color="var(--text-muted)" mt={0.5}>
                        {formatDuration(video.durationSeconds)}
                    </Text>
                )}
            </Box>

            <Flex
                gap={1}
                flexShrink={0}
                wrap={{ base: 'wrap', sm: 'nowrap' }}
                w={{ base: '72px', sm: 'auto' }}
                justify="flex-end"
            >
                <IconButton
                    aria-label={video.favorite ? 'Unpin from favorites' : 'Pin to favorites'}
                    size="sm"
                    variant="ghost"
                    color={video.favorite ? '#facc15' : 'var(--text-muted)'}
                    _hover={{ bg: 'rgba(250,204,21,0.1)', color: '#facc15' }}
                    onClick={async () => {
                        await toggleVideoFavorite(video.id);
                        onUpdate();
                    }}
                >
                    <Star size={16} fill={video.favorite ? '#facc15' : 'none'} />
                </IconButton>
                <IconButton
                    aria-label={video.watched ? 'Mark as unwatched' : 'Mark as watched'}
                    size="sm"
                    variant="ghost"
                    color={video.watched ? '#22c55e' : 'var(--text-muted)'}
                    _hover={{ bg: 'rgba(34,197,94,0.1)', color: '#22c55e' }}
                    onClick={async () => {
                        await toggleVideoWatched(video.id);
                        onUpdate();
                    }}
                >
                    <CheckCircle size={16} fill={video.watched ? '#22c55e' : 'none'} stroke={video.watched ? 'var(--bg-secondary)' : 'currentColor'} />
                </IconButton>
                <IconButton
                    aria-label="Play video"
                    size="sm"
                    variant="ghost"
                    color="var(--text-secondary)"
                    _hover={{ bg: 'var(--bg-hover)', color: 'var(--text-primary)' }}
                    onClick={() => navigate(`/watch/${video.id}`)}
                >
                    <Play size={16} />
                </IconButton>
                <IconButton
                    aria-label="Delete video"
                    size="sm"
                    variant="ghost"
                    color="var(--text-muted)"
                    _hover={{ bg: 'rgba(239,68,68,0.1)', color: 'var(--red)' }}
                    onClick={() => void handleDeleteVideo(video.id)}
                >
                    <Trash2 size={16} />
                </IconButton>
            </Flex>
        </Box>
    );
}

export function SortableLibraryList({ items, searchQuery, onUpdate }: SortableLibraryListProps) {
    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(TouchSensor),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        }),
    );

    // BUG 2 FIX: Disable drag-and-drop when a search query is active to prevent
    // reordering a filtered subset from corrupting hidden items' sort orders
    const isDragDisabled = searchQuery.length > 0;

    // VISUAL GLITCH FIX: Maintain local optimistic state so the UI re-orders
    // immediately on drop without waiting for the async DB writes + onUpdate cycle.
    const [optimisticItems, setOptimisticItems] = useState<LibraryItem[]>(items);

    // Keep optimisticItems in sync whenever the parent pushes a fresh items prop
    // (e.g. after onUpdate resolves, or favorite/watched toggles from outside)
    useEffect(() => {
        setOptimisticItems(items);
    }, [items]);

    // BUG 3 FIX: Keep a ref to the latest optimisticItems so handleDragEnd never
    // reads a stale closure value if a re-render fires mid-async execution
    const itemsRef = useRef(optimisticItems);
    useEffect(() => {
        itemsRef.current = optimisticItems;
    }, [optimisticItems]);

    const handleDragEnd = useCallback(
        async (event: DragEndEvent) => {
            // BUG 2 FIX: Bail out entirely if drag is disabled (search active)
            if (isDragDisabled) return;

            const { active, over } = event;
            if (!over || active.id === over.id) return;

            // BUG 3 FIX: Read from ref instead of closure to get the freshest items
            const currentItems = itemsRef.current;

            const oldIndex = currentItems.findIndex((i) => `${i.type}-${i.data.id}` === active.id);
            const newIndex = currentItems.findIndex((i) => `${i.type}-${i.data.id}` === over.id);
            if (oldIndex === -1 || newIndex === -1) return;

            const reordered = arrayMove(currentItems, oldIndex, newIndex);

            // VISUAL GLITCH FIX: Apply new order to local state immediately so the
            // list snaps to the correct position right on drop, before DB writes finish
            setOptimisticItems(reordered);

            const videoUpdates: { id: string; sortOrder: number }[] = [];
            const playlistUpdates: { id: string; sortOrder: number }[] = [];

            // BUG 1 FIX: Assign sortOrder from the unified reordered position so that
            // cross-type ordering is consistent (highest sortOrder = newest/first).
            // Previously, videos and playlists each got independent index sequences
            // (both starting at 0), making cross-type comparison in LibraryPage wrong.
            reordered.forEach((item, index) => {
                const update = { id: item.data.id, sortOrder: reordered.length - index };
                if (item.type === 'video') {
                    videoUpdates.push(update);
                } else {
                    playlistUpdates.push(update);
                }
            });

            await Promise.all([
                updateVideoSortOrders(videoUpdates),
                updatePlaylistSortOrders(playlistUpdates),
            ]);

            onUpdate();
        },
        [isDragDisabled, onUpdate],
    );

    return (
        <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={(e) => void handleDragEnd(e)}
        >
            <SortableContext
                items={optimisticItems.map((i) => `${i.type}-${i.data.id}`)}
                strategy={verticalListSortingStrategy}
            >
                <Box
                    display="flex"
                    flexDirection="column"
                    gap={2}
                    role="list"
                    aria-label="Video library"
                    aria-live="polite"
                >
                    {optimisticItems.map((item) => (
                        <SortableItemWrapper
                            key={`${item.type}-${item.data.id}`}
                            item={item}
                            searchQuery={searchQuery}
                            isDragDisabled={isDragDisabled}
                            onUpdate={onUpdate}
                        />
                    ))}
                    {optimisticItems.length === 0 && !searchQuery && (
                        <Text color="var(--text-muted)" textAlign="center" py={8}>
                            No videos yet. Add a YouTube URL above to get started.
                        </Text>
                    )}
                    {optimisticItems.length === 0 && searchQuery && (
                        <Text color="var(--text-muted)" textAlign="center" py={8}>
                            No videos or playlists match "{searchQuery}".
                        </Text>
                    )}
                </Box>
            </SortableContext>
        </DndContext>
    );
}
