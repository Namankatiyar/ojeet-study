import { useState, useEffect, useCallback, useMemo } from 'react';
import { Box, Heading, Flex, Text, Input } from '@chakra-ui/react';
import { Library, Search } from 'lucide-react';
import { getVideos, getPlaylists, type Video, type Playlist } from '../db/db';
import { LibraryGrid, type LibraryGridItem } from '../features/library/LibraryGrid';
import { AddVideoForm } from '../features/library/AddVideoForm';
import { ClipboardAddDialog } from '../features/library/ClipboardAddDialog';
import { useClipboardYouTubeDetection } from '../hooks/useClipboardYouTubeDetection';
import { addVideoByUrl, importPlaylist } from '../services/youtube';

export function LibraryPage() {
    const [videos, setVideos] = useState<Video[]>([]);
    const [playlists, setPlaylists] = useState<Playlist[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [isAddingFromClipboard, setIsAddingFromClipboard] = useState(false);

    // Clipboard detection hook
    const {
        detectedContent,
        isLoading: isClipboardLoading,
        error: clipboardError,
        dismiss: dismissClipboard,
    } = useClipboardYouTubeDetection();

    const loadData = useCallback(async () => {
        const [allVideos, allPlaylists] = await Promise.all([
            getVideos(),
            getPlaylists(),
        ]);
        setVideos(allVideos);
        setPlaylists(allPlaylists);
    }, []);

    useEffect(() => {
        void loadData();
    }, [loadData]);

    // Handle adding content from clipboard
    const handleClipboardAdd = useCallback(async () => {
        if (!detectedContent) return;

        setIsAddingFromClipboard(true);
        try {
            if (detectedContent.type === 'video') {
                await addVideoByUrl(detectedContent.url);
            } else {
                await importPlaylist(detectedContent.url);
            }
            dismissClipboard();
            void loadData();
        } catch (err) {
            console.error('Failed to add from clipboard:', err);
        } finally {
            setIsAddingFromClipboard(false);
        }
    }, [detectedContent, dismissClipboard, loadData]);

    const query = searchQuery.toLowerCase().trim();

    // Standalone videos (not in any playlist)
    const standaloneVideos = useMemo(
        () => videos.filter((v) => v.sourceType === 'manual' || !v.playlistId),
        [videos],
    );

    // Filter standalone videos by search
    const filteredStandalone = useMemo(
        () =>
            query
                ? standaloneVideos.filter(
                    (v) =>
                        v.title.toLowerCase().includes(query) ||
                        v.channelName.toLowerCase().includes(query),
                )
                : standaloneVideos,
        [standaloneVideos, query],
    );

    // Filter playlists by search (match playlist title/channel or any video inside)
    const filteredPlaylists = useMemo(
        () =>
            query
                ? playlists.filter((p) => {
                    if (p.title.toLowerCase().includes(query)) return true;
                    if (p.channelName.toLowerCase().includes(query)) return true;
                    // Also include playlist if any of its videos match
                    const hasMatchingVideo = videos.some(
                        (v) =>
                            v.playlistId === p.id &&
                            (v.title.toLowerCase().includes(query) ||
                                v.channelName.toLowerCase().includes(query)),
                    );
                    return hasMatchingVideo;
                })
                : playlists,
        [playlists, videos, query],
    );

    // Merge standalone videos and playlists into a single ordered list
    // Favorites pinned to top, then newest first (descending sortOrder)
    const orderedItems = useMemo(() => {
        const items: LibraryGridItem[] = [];
        for (const v of filteredStandalone) {
            items.push({ type: 'video', data: v });
        }
        for (const p of filteredPlaylists) {
            items.push({
                type: 'playlist',
                data: p,
                videos: videos.filter((v) => v.playlistId === p.id)
            });
        }
        items.sort((a, b) => {
            // Tier: 0 = watched (bottom), 1 = normal, 2 = favorite (top)
            const tier = (item: LibraryGridItem) => {
                if (item.data.watched) return 0;
                if (item.data.favorite) return 2;
                return 1;
            };
            const aTier = tier(a);
            const bTier = tier(b);
            if (aTier !== bTier) return bTier - aTier;
            // Within same tier, newest first (higher sortOrder = newer)
            return b.data.sortOrder - a.data.sortOrder;
        });
        return items;
    }, [filteredStandalone, filteredPlaylists, videos]);

    return (
        <Box w="100%" py={{ base: 5, md: 8 }} px={{ base: 3, md: 6 }}>
            {/* Header section - centered */}
            <Flex direction="column" align="center" mb={6}>
                <Flex align="center" gap={2} mb={3}>
                    <Library size={24} color="var(--text-primary)" />
                    <Heading size="lg" color="var(--text-primary)">Library</Heading>
                </Flex>

                <Text color="var(--text-secondary)" fontSize="sm" mb={4} textAlign="center">
                    Add YouTube videos or playlists to study without distractions.
                </Text>

                {/* Add URL form */}
                <Box mb={4} w="100%" maxW="600px">
                    <AddVideoForm onAdded={() => void loadData()} />
                </Box>

                {/* Search bar */}
                <Box position="relative" w="100%" maxW="600px">
                    <Box position="absolute" left={3} top="50%" transform="translateY(-50%)" zIndex={1}>
                        <Search size={16} color="var(--text-muted)" />
                    </Box>
                    <Input
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search videos by title or channel..."
                        pl={10}
                        size="md"
                        bg="var(--bg-secondary)"
                        borderColor="var(--border-color)"
                        color="var(--text-primary)"
                        _placeholder={{ color: 'var(--text-muted)' }}
                        _focus={{ borderColor: 'var(--text-secondary)', boxShadow: '0 0 0 1px var(--text-secondary)' }}
                        _hover={{ borderColor: 'var(--border-hover)' }}
                        borderRadius="md"
                    />
                </Box>
            </Flex>

            {/* Grid layout - centered container */}
            <Box maxW="1200px" mx="auto">
                <LibraryGrid
                    items={orderedItems}
                    searchQuery={query}
                    onUpdate={() => void loadData()}
                />
            </Box>

            {/* Clipboard detection dialog */}
            <ClipboardAddDialog
                content={detectedContent}
                isLoading={isClipboardLoading}
                error={clipboardError}
                onConfirm={handleClipboardAdd}
                onDismiss={dismissClipboard}
                isAdding={isAddingFromClipboard}
            />
        </Box>
    );
}
