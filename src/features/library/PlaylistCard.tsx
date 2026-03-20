import { Box, Text, Image, IconButton, Flex } from '@chakra-ui/react';
import { Trash2, Star, CheckCircle, ListVideo, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import type { Playlist, Video } from '../../db/db';
import { deletePlaylistWithVideos, togglePlaylistFavorite, togglePlaylistWatched } from '../../db/db';

interface PlaylistCardProps {
    playlist: Playlist;
    videos: Video[];
    onUpdate: () => void;
}

export function PlaylistCard({ playlist, videos, onUpdate }: PlaylistCardProps) {
    const navigate = useNavigate();

    const handleDelete = async (e: React.MouseEvent) => {
        e.stopPropagation();
        await deletePlaylistWithVideos(playlist.id);
        onUpdate();
    };

    const handleToggleFavorite = async (e: React.MouseEvent) => {
        e.stopPropagation();
        await togglePlaylistFavorite(playlist.id);
        onUpdate();
    };

    const handleToggleWatched = async (e: React.MouseEvent) => {
        e.stopPropagation();
        await togglePlaylistWatched(playlist.id);
        onUpdate();
    };

    const openPlaylist = () => {
        navigate(`/playlist/${playlist.id}`);
    };

    return (
        <Box
            bg="var(--bg-secondary)"
            borderRadius="lg"
            overflow="hidden"
            opacity={playlist.watched ? 0.5 : 1}
            transition="all 0.2s"
            cursor="pointer"
            _hover={{
                transform: 'translateY(-2px)',
                boxShadow: 'lg',
                '& .card-overlay': { opacity: 1 },
            }}
            onClick={openPlaylist}
            role="article"
            aria-label={playlist.title}
        >
            {/* Thumbnail container */}
            <Box position="relative" paddingTop="56.25%">
                {playlist.thumbnailUrl ? (
                    <Image
                        src={playlist.thumbnailUrl}
                        alt={playlist.title}
                        position="absolute"
                        top={0}
                        left={0}
                        w="100%"
                        h="100%"
                        objectFit="cover"
                    />
                ) : (
                    <Flex
                        position="absolute"
                        top={0}
                        left={0}
                        w="100%"
                        h="100%"
                        bg="var(--bg-tertiary)"
                        align="center"
                        justify="center"
                    >
                        <ListVideo size={48} color="var(--text-muted)" />
                    </Flex>
                )}

                {/* Video count badge */}
                <Box
                    position="absolute"
                    bottom={2}
                    right={2}
                    bg="blackAlpha.800"
                    color="white"
                    fontSize="xs"
                    fontWeight="600"
                    px={2}
                    py={0.5}
                    borderRadius="sm"
                    display="flex"
                    alignItems="center"
                    gap={1}
                >
                    <ListVideo size={12} />
                    {videos.length} videos
                </Box>

                {/* Hover overlay */}
                <Flex
                    className="card-overlay"
                    position="absolute"
                    top={0}
                    left={0}
                    right={0}
                    bottom={0}
                    bg="blackAlpha.500"
                    opacity={0}
                    transition="opacity 0.2s"
                    align="center"
                    justify="center"
                >
                    <Box bg="whiteAlpha.900" borderRadius="full" p={3}>
                        <ChevronRight size={24} color="#000" />
                    </Box>
                </Flex>

                {/* Favorite indicator */}
                {playlist.favorite && (
                    <Box position="absolute" top={2} left={2}>
                        <Star size={18} color="#facc15" fill="#facc15" />
                    </Box>
                )}

                {/* Watched indicator */}
                {playlist.watched && (
                    <Box position="absolute" top={2} right={2}>
                        <CheckCircle size={18} color="#22c55e" fill="#22c55e" />
                    </Box>
                )}
            </Box>

            {/* Card content */}
            <Box p={3}>
                <Text
                    fontSize="sm"
                    fontWeight="600"
                    color="var(--text-primary)"
                    lineClamp={2}
                    minH="2.5em"
                >
                    {playlist.title}
                </Text>
                <Text fontSize="xs" color="var(--text-secondary)" mt={1}>
                    {playlist.channelName}
                </Text>

                {/* Action buttons */}
                <Flex mt={2} gap={1} justify="flex-end">
                    <IconButton
                        aria-label={playlist.favorite ? 'Unpin from favorites' : 'Pin to favorites'}
                        size="xs"
                        variant="ghost"
                        color={playlist.favorite ? '#facc15' : 'var(--text-muted)'}
                        _hover={{ bg: 'rgba(250,204,21,0.15)', color: '#facc15' }}
                        onClick={handleToggleFavorite}
                    >
                        <Star size={14} fill={playlist.favorite ? '#facc15' : 'none'} />
                    </IconButton>
                    <IconButton
                        aria-label={playlist.watched ? 'Mark as unwatched' : 'Mark as watched'}
                        size="xs"
                        variant="ghost"
                        color={playlist.watched ? '#22c55e' : 'var(--text-muted)'}
                        _hover={{ bg: 'rgba(34,197,94,0.15)', color: '#22c55e' }}
                        onClick={handleToggleWatched}
                    >
                        <CheckCircle size={14} fill={playlist.watched ? '#22c55e' : 'none'} stroke={playlist.watched ? 'var(--bg-secondary)' : 'currentColor'} />
                    </IconButton>
                    <IconButton
                        aria-label="Delete playlist"
                        size="xs"
                        variant="ghost"
                        color="var(--text-muted)"
                        _hover={{ bg: 'rgba(239,68,68,0.15)', color: '#ef4444' }}
                        onClick={handleDelete}
                    >
                        <Trash2 size={14} />
                    </IconButton>
                </Flex>
            </Box>
        </Box>
    );
}
