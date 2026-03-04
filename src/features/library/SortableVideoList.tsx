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
import type { Video } from '../../db/db';
import { updateVideoSortOrders, deleteVideo } from '../../db/db';
import { formatDuration } from '../../utils/duration';

interface SortableVideoListProps {
    videos: Video[];
    onUpdate: () => void;
}

function SortableVideoItem({
    video,
    onDelete,
}: {
    video: Video;
    onDelete: (id: string) => void;
}) {
    const navigate = useNavigate();
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id: video.id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
    };

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
                    onClick={() => onDelete(video.id)}
                >
                    <Trash2 size={16} />
                </IconButton>
            </Flex>
        </Box>
    );
}

export function SortableVideoList({ videos, onUpdate }: SortableVideoListProps) {
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

            const oldIndex = videos.findIndex((v) => v.id === active.id);
            const newIndex = videos.findIndex((v) => v.id === over.id);
            if (oldIndex === -1 || newIndex === -1) return;

            const reordered = arrayMove(videos, oldIndex, newIndex);
            const updates = reordered.map((v, i) => ({ id: v.id, sortOrder: i }));

            await updateVideoSortOrders(updates);
            onUpdate();
        },
        [videos, onUpdate],
    );

    const handleDelete = useCallback(
        async (id: string) => {
            await deleteVideo(id);
            onUpdate();
        },
        [onUpdate],
    );

    return (
        <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={(e) => void handleDragEnd(e)}
        >
            <SortableContext
                items={videos.map((v) => v.id)}
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
                    {videos.map((video) => (
                        <SortableVideoItem
                            key={video.id}
                            video={video}
                            onDelete={(id) => void handleDelete(id)}
                        />
                    ))}
                    {videos.length === 0 && (
                        <Text color="var(--text-muted)" textAlign="center" py={8}>
                            No videos yet. Add a YouTube URL above to get started.
                        </Text>
                    )}
                </Box>
            </SortableContext>
        </DndContext>
    );
}
