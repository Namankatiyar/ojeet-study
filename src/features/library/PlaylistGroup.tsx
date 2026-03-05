import { useState, useCallback } from 'react';
import { Box, Text, Image, IconButton, Flex } from '@chakra-ui/react';
import { ChevronDown, ChevronRight, Trash2, Play, ListVideo, GripVertical, Star, CheckCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import type { Playlist, Video } from '../../db/db';
import { deletePlaylistWithVideos, togglePlaylistFavorite, togglePlaylistWatched, toggleVideoWatched } from '../../db/db';
import { formatDuration } from '../../utils/duration';

interface PlaylistGroupProps {
    playlist: Playlist;
    playlistVideos: Video[];
    searchQuery: string;
    onUpdate: () => void;
    // Optional drag props for sortable list
    dragAttributes?: Record<string, any>;
    dragListeners?: Record<string, any>;
}

export function PlaylistGroup({
    playlist,
    playlistVideos,
    searchQuery,
    onUpdate,
    dragAttributes,
    dragListeners,
}: PlaylistGroupProps) {
    const [isManuallyExpanded, setIsManuallyExpanded] = useState(false);
    const navigate = useNavigate();

    const hasSearchMatch = searchQuery
        ? playlistVideos.some(
            (v) =>
                v.title.toLowerCase().includes(searchQuery) ||
                v.channelName.toLowerCase().includes(searchQuery),
        )
        : false;

    // Expand if user clicked expand, or if there's an active search with a matching video
    const expanded = isManuallyExpanded || (!!searchQuery && hasSearchMatch);

    const handleDelete = useCallback(async () => {
        await deletePlaylistWithVideos(playlist.id);
        onUpdate();
    }, [playlist.id, onUpdate]);

    const filteredVideos = (searchQuery
        ? playlistVideos.filter(
            (v) =>
                v.title.toLowerCase().includes(searchQuery) ||
                v.channelName.toLowerCase().includes(searchQuery),
        )
        : [...playlistVideos]).sort((a, b) => {
            // Watched videos always sink to the bottom
            const aWatched = a.watched ? 1 : 0;
            const bWatched = b.watched ? 1 : 0;
            if (aWatched !== bWatched) return aWatched - bWatched;
            // Within same watched tier: ascending sortOrder = first added on top
            return a.sortOrder - b.sortOrder;
        });

    const videoCount = playlistVideos.length;

    return (
        <Box
            borderWidth="1px"
            borderColor="var(--border-color)"
            bg="var(--bg-secondary)"
            borderRadius="md"
            overflow="hidden"
            opacity={playlist.watched ? 0.45 : 1}
            transition="opacity 0.15s"
        >
            {/* Playlist header — always visible */}
            <Flex
                align="center"
                gap={3}
                p={3}
                cursor="pointer"
                _hover={{ bg: 'var(--bg-tertiary)' }}
                transition="background 0.15s"
                onClick={() => setIsManuallyExpanded(!isManuallyExpanded)}
                role="button"
                aria-expanded={expanded}
                aria-label={`${playlist.title} — ${videoCount} videos`}
            >
                {dragAttributes && dragListeners && (
                    <Box {...dragAttributes} {...dragListeners} cursor="grab" flexShrink={0} onClick={(e) => e.stopPropagation()}>
                        <GripVertical size={18} color="var(--text-muted)" />
                    </Box>
                )}

                {playlist.thumbnailUrl ? (
                    <Image
                        src={playlist.thumbnailUrl}
                        alt={playlist.title}
                        w="120px"
                        h="68px"
                        objectFit="cover"
                        borderRadius="4px"
                        flexShrink={0}
                    />
                ) : (
                    <Flex
                        w="120px"
                        h="68px"
                        bg="var(--bg-tertiary)"
                        align="center"
                        justify="center"
                        borderRadius="4px"
                        flexShrink={0}
                    >
                        <ListVideo size={24} color="var(--text-muted)" />
                    </Flex>
                )}

                <Box flex={1} minW={0}>
                    <Flex align="center" gap={2}>
                        <Text fontSize="sm" fontWeight="600" color="var(--text-primary)" lineClamp={2}>
                            {playlist.title}
                        </Text>
                        <Flex
                            bg="var(--bg-active)"
                            px={2}
                            py={0.5}
                            borderRadius="full"
                            flexShrink={0}
                        >
                            <Text fontSize="10px" color="var(--text-secondary)" fontWeight="500">
                                {videoCount} videos
                            </Text>
                        </Flex>
                    </Flex>
                    <Text fontSize="xs" color="var(--text-secondary)" mt={0.5}>
                        {playlist.channelName}
                    </Text>
                </Box>

                <Flex gap={1} flexShrink={0} align="center">
                    <IconButton
                        aria-label={playlist.favorite ? 'Unpin from favorites' : 'Pin to favorites'}
                        size="sm"
                        variant="ghost"
                        color={playlist.favorite ? '#facc15' : 'var(--text-muted)'}
                        _hover={{ bg: 'rgba(250,204,21,0.1)', color: '#facc15' }}
                        onClick={async (e) => {
                            e.stopPropagation();
                            await togglePlaylistFavorite(playlist.id);
                            onUpdate();
                        }}
                    >
                        <Star size={16} fill={playlist.favorite ? '#facc15' : 'none'} />
                    </IconButton>

                    <IconButton
                        aria-label={playlist.watched ? 'Mark as unwatched' : 'Mark as watched'}
                        size="sm"
                        variant="ghost"
                        color={playlist.watched ? '#22c55e' : 'var(--text-muted)'}
                        _hover={{ bg: 'rgba(34,197,94,0.1)', color: '#22c55e' }}
                        onClick={async (e) => {
                            e.stopPropagation();
                            await togglePlaylistWatched(playlist.id);
                            onUpdate();
                        }}
                    >
                        <CheckCircle size={16} fill={playlist.watched ? '#22c55e' : 'none'} stroke={playlist.watched ? 'var(--bg-secondary)' : 'currentColor'} />
                    </IconButton>

                    <IconButton
                        aria-label={expanded ? "Collapse playlist" : "Expand playlist"}
                        size="sm"
                        variant="ghost"
                        color="var(--text-secondary)"
                        _hover={{ bg: 'var(--bg-hover)', color: 'var(--text-primary)' }}
                        onClick={(e) => {
                            e.stopPropagation();
                            setIsManuallyExpanded(!isManuallyExpanded);
                        }}
                    >
                        {expanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                    </IconButton>

                    <IconButton
                        aria-label="Delete playlist"
                        size="sm"
                        variant="ghost"
                        color="var(--text-muted)"
                        _hover={{ bg: 'rgba(239,68,68,0.1)', color: 'var(--red)' }}
                        onClick={(e) => {
                            e.stopPropagation();
                            void handleDelete();
                        }}
                    >
                        <Trash2 size={16} />
                    </IconButton>
                </Flex>
            </Flex>

            {/* Expanded video list */}
            {expanded && (
                <Box
                    borderTopWidth="1px"
                    borderColor="var(--border-color)"
                    bg="var(--bg-primary)"
                >
                    {filteredVideos.length === 0 ? (
                        <Text fontSize="sm" color="var(--text-muted)" p={4} textAlign="center">
                            {searchQuery ? 'No matching videos in this playlist.' : 'No videos in playlist.'}
                        </Text>
                    ) : (
                        filteredVideos.map((video) => (
                            <Flex
                                key={video.id}
                                align="center"
                                gap={3}
                                px={4}
                                py={2.5}
                                pl={10}
                                cursor="pointer"
                                opacity={video.watched ? 0.45 : 1}
                                _hover={{ bg: 'var(--bg-tertiary)' }}
                                transition="all 0.12s"
                                onClick={() => navigate(`/watch/${video.id}`)}
                                borderBottomWidth="1px"
                                borderColor="var(--border-color)"
                                _last={{ borderBottom: 'none' }}
                            >
                                <Image
                                    src={video.thumbnailUrl}
                                    alt={video.title}
                                    w="80px"
                                    h="45px"
                                    objectFit="cover"
                                    borderRadius="3px"
                                    flexShrink={0}
                                />
                                <Box flex={1} minW={0}>
                                    <Text fontSize="sm" fontWeight="500" color="var(--text-primary)" lineClamp={1}>
                                        {video.title}
                                    </Text>
                                    <Text fontSize="xs" color="var(--text-muted)" mt={0.5}>
                                        {video.channelName}
                                        {video.durationSeconds > 0 && ` · ${formatDuration(video.durationSeconds)}`}
                                    </Text>
                                </Box>
                                <Flex gap={1} flexShrink={0}>
                                    <IconButton
                                        aria-label={video.watched ? 'Mark as unwatched' : 'Mark as watched'}
                                        size="sm"
                                        variant="ghost"
                                        color={video.watched ? '#22c55e' : 'var(--text-muted)'}
                                        _hover={{ bg: 'rgba(34,197,94,0.1)', color: '#22c55e' }}
                                        onClick={async (e) => {
                                            e.stopPropagation();
                                            await toggleVideoWatched(video.id);
                                            onUpdate();
                                        }}
                                    >
                                        <CheckCircle size={14} fill={video.watched ? '#22c55e' : 'none'} stroke={video.watched ? 'var(--bg-primary)' : 'currentColor'} />
                                    </IconButton>
                                    <IconButton
                                        aria-label="Play video"
                                        size="sm"
                                        variant="ghost"
                                        color="var(--text-secondary)"
                                        _hover={{ bg: 'var(--bg-hover)', color: 'var(--text-primary)' }}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            navigate(`/watch/${video.id}`);
                                        }}
                                    >
                                        <Play size={14} />
                                    </IconButton>
                                </Flex>
                            </Flex>
                        ))
                    )}
                </Box>
            )}
        </Box>
    );
}