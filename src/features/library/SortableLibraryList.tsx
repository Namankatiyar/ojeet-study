import { useCallback } from 'react';
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
import { GripVertical, Trash2, Play } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import type { Video, Playlist } from '../../db/db';
import { updateVideoSortOrders, updatePlaylistSortOrders, deleteVideo } from '../../db/db';
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
    onUpdate,
}: {
    item: LibraryItem;
    searchQuery: string;
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

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
        zIndex: isDragging ? 2 : 1,
        position: 'relative' as const,
    };

    const handleDeleteVideo = useCallback(async (videoId: string) => {
        await deleteVideo(videoId);
        onUpdate();
    }, [onUpdate]);

    if (item.type === 'playlist') {
        return (
            <Box ref={setNodeRef} style={style}>
                <PlaylistGroup
                    playlist={item.data}
                    playlistVideos={item.playlistVideos}
                    searchQuery={searchQuery}
                    onUpdate={onUpdate}
                    dragAttributes={attributes}
                    dragListeners={listeners}
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
            p={3}
            borderRadius="md"
            display="flex"
            alignItems="center"
            gap={3}
            _hover={{ bg: 'var(--bg-tertiary)', borderColor: 'var(--border-hover)' }}
            transition="all 0.15s"
            role="listitem"
            aria-label={video.title}
        >
            <Box {...attributes} {...listeners} cursor="grab" flexShrink={0}>
                <GripVertical size={18} color="var(--text-muted)" />
            </Box>

            <Image
                src={video.thumbnailUrl}
                alt={video.title}
                w="120px"
                h="68px"
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

            <Flex gap={1} flexShrink={0}>
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

    const handleDragEnd = useCallback(
        async (event: DragEndEvent) => {
            const { active, over } = event;
            if (!over || active.id === over.id) return;

            const oldIndex = items.findIndex((i) => `${i.type}-${i.data.id}` === active.id);
            const newIndex = items.findIndex((i) => `${i.type}-${i.data.id}` === over.id);
            if (oldIndex === -1 || newIndex === -1) return;

            const reordered = arrayMove(items, oldIndex, newIndex);

            const videoUpdates: { id: string; sortOrder: number }[] = [];
            const playlistUpdates: { id: string; sortOrder: number }[] = [];

            reordered.forEach((item, index) => {
                if (item.type === 'video') {
                    videoUpdates.push({ id: item.data.id, sortOrder: index });
                } else {
                    playlistUpdates.push({ id: item.data.id, sortOrder: index });
                }
            });

            await Promise.all([
                updateVideoSortOrders(videoUpdates),
                updatePlaylistSortOrders(playlistUpdates),
            ]);

            onUpdate();
        },
        [items, onUpdate],
    );

    return (
        <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={(e) => void handleDragEnd(e)}
        >
            <SortableContext
                items={items.map((i) => `${i.type}-${i.data.id}`)}
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
                    {items.map((item) => (
                        <SortableItemWrapper
                            key={`${item.type}-${item.data.id}`}
                            item={item}
                            searchQuery={searchQuery}
                            onUpdate={onUpdate}
                        />
                    ))}
                    {items.length === 0 && !searchQuery && (
                        <Text color="var(--text-muted)" textAlign="center" py={8}>
                            No videos yet. Add a YouTube URL above to get started.
                        </Text>
                    )}
                    {items.length === 0 && searchQuery && (
                        <Text color="var(--text-muted)" textAlign="center" py={8}>
                            No videos or playlists match "{searchQuery}".
                        </Text>
                    )}
                </Box>
            </SortableContext>
        </DndContext>
    );
}
