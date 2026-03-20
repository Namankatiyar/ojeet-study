import { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useNavigate, Link as RouterLink } from 'react-router-dom';
import { Box, Heading, Flex, Text, IconButton, Image, SimpleGrid } from '@chakra-ui/react';
import { ArrowLeft, Star, CheckCircle, Trash2, ListVideo } from 'lucide-react';
import {
    getPlaylistById,
    getVideosByPlaylist,
    deletePlaylistWithVideos,
    togglePlaylistFavorite,
    togglePlaylistWatched,
    type Playlist,
    type Video,
} from '../db/db';
import { VideoCard } from '../features/library/VideoCard';
import { SkeletonCard } from '../features/library/SkeletonCard';

const MIN_CARDS_TO_SHOW = 8;

export function PlaylistPage() {
    const { playlistId } = useParams<{ playlistId: string }>();
    const navigate = useNavigate();
    const [playlist, setPlaylist] = useState<Playlist | null>(null);
    const [videos, setVideos] = useState<Video[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const loadData = useCallback(async () => {
        if (!playlistId) return;

        const [pl, vids] = await Promise.all([
            getPlaylistById(playlistId),
            getVideosByPlaylist(playlistId),
        ]);

        setPlaylist(pl ?? null);
        setVideos(vids);
        setIsLoading(false);
    }, [playlistId]);

    useEffect(() => {
        void loadData();
    }, [loadData]);

    const sortedVideos = useMemo(() => {
        return [...videos].sort((a, b) => {
            // Watched videos sink to bottom
            if (a.watched !== b.watched) return a.watched ? 1 : -1;
            // Then by sortOrder (first added first)
            return a.sortOrder - b.sortOrder;
        });
    }, [videos]);

    const handleDelete = async () => {
        if (!playlistId) return;
        await deletePlaylistWithVideos(playlistId);
        navigate('/');
    };

    const handleToggleFavorite = async () => {
        if (!playlistId) return;
        await togglePlaylistFavorite(playlistId);
        void loadData();
    };

    const handleToggleWatched = async () => {
        if (!playlistId) return;
        await togglePlaylistWatched(playlistId);
        void loadData();
    };

    if (isLoading) {
        return (
            <Box w="100%" py={{ base: 3, md: 4 }} px={{ base: 3, md: 6 }}>
                <Box maxW="1200px" mx="auto">
                    {/* Back button skeleton */}
                    <Box mb={3}>
                        <Flex align="center" gap={1} color="var(--text-muted)">
                            <ArrowLeft size={16} />
                            <Text fontSize="sm">Library</Text>
                        </Flex>
                    </Box>

                    {/* Header skeleton */}
                    <Flex
                        direction={{ base: 'column', md: 'row' }}
                        gap={{ base: 4, md: 5 }}
                        mb={6}
                        p={{ base: 3, md: 4 }}
                        bg="var(--bg-secondary)"
                        borderRadius="xl"
                        borderWidth="1px"
                        borderColor="var(--border-color)"
                    >
                        {/* Thumbnail skeleton */}
                        <Box
                            w={{ base: '100%', sm: '200px', md: '240px' }}
                            h={{ base: '160px', sm: '112px', md: '135px' }}
                            bg="var(--bg-tertiary)"
                            borderRadius="lg"
                            flexShrink={0}
                            animation="pulse 1.5s ease-in-out infinite"
                            css={{
                                '@keyframes pulse': {
                                    '0%, 100%': { opacity: 1 },
                                    '50%': { opacity: 0.5 },
                                },
                            }}
                        />

                        {/* Info skeleton */}
                        <Flex direction="column" justify="space-between" flex={1} h={{ base: 'auto', md: '135px' }}>
                            <Box>
                                <Box
                                    h="24px"
                                    w={{ base: '80%', md: '60%' }}
                                    bg="var(--bg-tertiary)"
                                    borderRadius="md"
                                    mb={2}
                                    animation="pulse 1.5s ease-in-out infinite"
                                    css={{
                                        '@keyframes pulse': {
                                            '0%, 100%': { opacity: 1 },
                                            '50%': { opacity: 0.5 },
                                        },
                                    }}
                                />
                                <Box
                                    h="16px"
                                    w={{ base: '50%', md: '30%' }}
                                    bg="var(--bg-tertiary)"
                                    borderRadius="md"
                                    mb={2}
                                    animation="pulse 1.5s ease-in-out infinite"
                                    css={{
                                        '@keyframes pulse': {
                                            '0%, 100%': { opacity: 1 },
                                            '50%': { opacity: 0.5 },
                                        },
                                    }}
                                />
                                <Box
                                    h="14px"
                                    w="70px"
                                    bg="var(--bg-tertiary)"
                                    borderRadius="md"
                                    animation="pulse 1.5s ease-in-out infinite"
                                    css={{
                                        '@keyframes pulse': {
                                            '0%, 100%': { opacity: 1 },
                                            '50%': { opacity: 0.5 },
                                        },
                                    }}
                                />
                            </Box>
                            <Flex gap={2} mt={{ base: 3, md: 0 }}>
                                {[1, 2, 3].map((i) => (
                                    <Box
                                        key={i}
                                        w="32px"
                                        h="32px"
                                        bg="var(--bg-tertiary)"
                                        borderRadius="md"
                                        animation="pulse 1.5s ease-in-out infinite"
                                        css={{
                                            '@keyframes pulse': {
                                                '0%, 100%': { opacity: 1 },
                                                '50%': { opacity: 0.5 },
                                            },
                                        }}
                                    />
                                ))}
                            </Flex>
                        </Flex>
                    </Flex>

                    {/* Video grid skeleton */}
                    <SimpleGrid columns={{ base: 1, sm: 2, md: 3, lg: 4 }} gap={{ base: 3, md: 4 }}>
                        {Array.from({ length: 8 }).map((_, i) => (
                            <SkeletonCard key={i} />
                        ))}
                    </SimpleGrid>
                </Box>
            </Box>
        );
    }

    if (!playlist) {
        return (
            <Box w="100%" py={8} px={{ base: 3, md: 6 }}>
                <Box maxW="1200px" mx="auto">
                    <Text color="var(--text-muted)">Playlist not found.</Text>
                    <RouterLink to="/">
                        <Text color="var(--accent)" mt={2} fontSize="sm">
                            ← Back to Library
                        </Text>
                    </RouterLink>
                </Box>
            </Box>
        );
    }

    return (
        <Box w="100%" py={{ base: 3, md: 4 }} px={{ base: 3, md: 6 }}>
            <Box maxW="1200px" mx="auto">
                {/* Back button */}
                <Box mb={3}>
                    <RouterLink to="/">
                        <Flex
                            align="center"
                            gap={1}
                            color="var(--text-secondary)"
                            _hover={{ color: 'var(--text-primary)' }}
                            w="fit-content"
                        >
                            <ArrowLeft size={16} />
                            <Text fontSize="sm">Library</Text>
                        </Flex>
                    </RouterLink>
                </Box>

                {/* Playlist header */}
                <Flex
                    direction={{ base: 'column', md: 'row' }}
                    align={{ base: 'flex-start', md: 'flex-start' }}
                    gap={{ base: 4, md: 5 }}
                    mb={6}
                    p={{ base: 3, md: 4 }}
                    bg="var(--bg-secondary)"
                    borderRadius="xl"
                    borderWidth="1px"
                    borderColor="var(--border-color)"
                >
                    {/* Thumbnail */}
                    {playlist.thumbnailUrl ? (
                        <Image
                            src={playlist.thumbnailUrl}
                            alt={playlist.title}
                            w={{ base: '100%', sm: '200px', md: '240px' }}
                            h={{ base: 'auto', sm: '112px', md: '135px' }}
                            maxH={{ base: '180px', sm: 'none' }}
                            objectFit="cover"
                            borderRadius="lg"
                            flexShrink={0}
                            css={{ aspectRatio: '16 / 9' }}
                        />
                    ) : (
                        <Flex
                            w={{ base: '100%', sm: '200px', md: '240px' }}
                            h={{ base: '160px', sm: '112px', md: '135px' }}
                            bg="var(--bg-tertiary)"
                            align="center"
                            justify="center"
                            borderRadius="lg"
                            flexShrink={0}
                        >
                            <ListVideo size={48} color="var(--text-muted)" />
                        </Flex>
                    )}

                    {/* Info and actions */}
                    <Flex
                        direction="column"
                        justify="space-between"
                        flex={1}
                        minW={0}
                        h={{ base: 'auto', md: '135px' }}
                    >
                        {/* Text content */}
                        <Box>
                            <Heading
                                size={{ base: 'md', md: 'lg' }}
                                color="var(--text-primary)"
                                mb={1}
                                lineClamp={2}
                            >
                                {playlist.title}
                            </Heading>
                            <Text
                                color="var(--text-secondary)"
                                fontSize="sm"
                                mb={2}
                                lineClamp={1}
                            >
                                {playlist.channelName}
                            </Text>
                            <Flex
                                align="center"
                                gap={1.5}
                                color="var(--text-muted)"
                            >
                                <ListVideo size={14} />
                                <Text fontSize="xs" fontWeight="500">
                                    {videos.length} videos
                                </Text>
                            </Flex>
                        </Box>

                        {/* Actions row */}
                        <Flex gap={2} mt={{ base: 3, md: 0 }}>
                            <IconButton
                                aria-label={playlist.favorite ? 'Unpin from favorites' : 'Pin to favorites'}
                                size="sm"
                                variant="outline"
                                borderColor={playlist.favorite ? '#facc15' : 'var(--border-color)'}
                                color={playlist.favorite ? '#facc15' : 'var(--text-muted)'}
                                _hover={{ bg: 'rgba(250,204,21,0.15)', color: '#facc15', borderColor: '#facc15' }}
                                onClick={handleToggleFavorite}
                            >
                                <Star size={16} fill={playlist.favorite ? '#facc15' : 'none'} />
                            </IconButton>
                            <IconButton
                                aria-label={playlist.watched ? 'Mark as unwatched' : 'Mark as watched'}
                                size="sm"
                                variant="outline"
                                borderColor={playlist.watched ? '#22c55e' : 'var(--border-color)'}
                                color={playlist.watched ? '#22c55e' : 'var(--text-muted)'}
                                _hover={{ bg: 'rgba(34,197,94,0.15)', color: '#22c55e', borderColor: '#22c55e' }}
                                onClick={handleToggleWatched}
                            >
                                <CheckCircle size={16} fill={playlist.watched ? '#22c55e' : 'none'} stroke={playlist.watched ? 'var(--bg-secondary)' : 'currentColor'} />
                            </IconButton>
                            <IconButton
                                aria-label="Delete playlist"
                                size="sm"
                                variant="outline"
                                borderColor="var(--border-color)"
                                color="var(--text-muted)"
                                _hover={{ bg: 'rgba(239,68,68,0.15)', color: '#ef4444', borderColor: '#ef4444' }}
                                onClick={handleDelete}
                            >
                                <Trash2 size={16} />
                            </IconButton>
                        </Flex>
                    </Flex>
                </Flex>

                {/* Video grid */}
                <SimpleGrid
                    columns={{ base: 1, sm: 2, md: 3, lg: 4 }}
                    gap={{ base: 3, md: 4 }}
                    role="list"
                    aria-label="Playlist videos"
                >
                    {sortedVideos.map((video) => (
                        <Box key={video.id} role="listitem">
                            <VideoCard video={video} onUpdate={loadData} />
                        </Box>
                    ))}
                    
                    {/* Skeleton placeholders when few videos */}
                    {sortedVideos.length < MIN_CARDS_TO_SHOW && (
                        <>
                            {Array.from({ length: MIN_CARDS_TO_SHOW - sortedVideos.length }).map((_, i) => (
                                <Box key={`skeleton-${i}`} role="listitem" aria-hidden="true">
                                    <SkeletonCard />
                                </Box>
                            ))}
                        </>
                    )}
                </SimpleGrid>
            </Box>
        </Box>
    );
}
