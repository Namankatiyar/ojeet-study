import { Box, Flex, Text, Image, Button, Spinner } from '@chakra-ui/react';
import { Clock, ListVideo, X, Plus, AlertCircle } from 'lucide-react';
import {
    DialogRoot,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogBody,
    DialogFooter,
    DialogCloseTrigger,
} from '../../components/ui/dialog';
import type { ClipboardYouTubeData } from '../../hooks/useClipboardYouTubeDetection';

function formatDuration(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hours > 0) {
        return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
}

interface ClipboardAddDialogProps {
    content: ClipboardYouTubeData | null;
    isLoading: boolean;
    error: string | null;
    onConfirm: () => void;
    onDismiss: () => void;
    isAdding: boolean;
}

export function ClipboardAddDialog({
    content,
    isLoading,
    error,
    onConfirm,
    onDismiss,
    isAdding,
}: ClipboardAddDialogProps) {
    const isOpen = content !== null || isLoading || error !== null;

    return (
        <DialogRoot 
            open={isOpen} 
            onOpenChange={(e) => !e.open && onDismiss()} 
            placement="center"
            size="sm"
        >
            <DialogContent
                bg="var(--bg-secondary)"
                borderColor="var(--border-color)"
                borderWidth="1px"
                borderRadius="xl"
                boxShadow="xl"
                p={4}
            >
                <DialogHeader pt={1} pb={3} pr={8}>
                    <DialogTitle color="var(--text-primary)" fontSize="lg" fontWeight="600">
                        {isLoading ? 'Checking clipboard...' : 
                         error ? 'Error' :
                         content?.type === 'playlist' ? 'Add Playlist?' : 'Add Video?'}
                    </DialogTitle>
                </DialogHeader>
                <DialogCloseTrigger top={4} right={4} />

                <DialogBody py={3}>
                    {isLoading && (
                        <Flex align="center" justify="center" py={6} gap={3}>
                            <Spinner size="sm" color="var(--accent)" />
                            <Text color="var(--text-secondary)" fontSize="sm">
                                Fetching video details...
                            </Text>
                        </Flex>
                    )}

                    {error && (
                        <Flex align="center" gap={3} py={4}>
                            <Box color="#ef4444">
                                <AlertCircle size={24} />
                            </Box>
                            <Text color="var(--text-secondary)" fontSize="sm">
                                {error}
                            </Text>
                        </Flex>
                    )}

                    {content && !isLoading && !error && (
                        <Flex gap={3}>
                            {/* Thumbnail */}
                            <Box flexShrink={0} position="relative">
                                {content.thumbnailUrl ? (
                                    <Image
                                        src={content.thumbnailUrl}
                                        alt={content.title}
                                        w="120px"
                                        h="68px"
                                        objectFit="cover"
                                        borderRadius="md"
                                    />
                                ) : (
                                    <Flex
                                        w="120px"
                                        h="68px"
                                        bg="var(--bg-tertiary)"
                                        align="center"
                                        justify="center"
                                        borderRadius="md"
                                    >
                                        <ListVideo size={24} color="var(--text-muted)" />
                                    </Flex>
                                )}
                                
                                {/* Duration badge for videos */}
                                {content.type === 'video' && (
                                    <Flex
                                        position="absolute"
                                        bottom={1}
                                        right={1}
                                        bg="rgba(0,0,0,0.8)"
                                        px={1.5}
                                        py={0.5}
                                        borderRadius="sm"
                                        align="center"
                                        gap={1}
                                    >
                                        <Clock size={10} color="white" />
                                        <Text fontSize="xs" color="white" fontWeight="500">
                                            {formatDuration(content.durationSeconds)}
                                        </Text>
                                    </Flex>
                                )}

                                {/* Video count badge for playlists */}
                                {content.type === 'playlist' && (
                                    <Flex
                                        position="absolute"
                                        bottom={1}
                                        right={1}
                                        bg="rgba(0,0,0,0.8)"
                                        px={1.5}
                                        py={0.5}
                                        borderRadius="sm"
                                        align="center"
                                        gap={1}
                                    >
                                        <ListVideo size={10} color="white" />
                                        <Text fontSize="xs" color="white" fontWeight="500">
                                            {content.videoCount} videos
                                        </Text>
                                    </Flex>
                                )}
                            </Box>

                            {/* Info */}
                            <Flex direction="column" minW={0} flex={1}>
                                <Text
                                    color="var(--text-primary)"
                                    fontSize="sm"
                                    fontWeight="500"
                                    lineClamp={2}
                                    mb={1}
                                >
                                    {content.title}
                                </Text>
                                <Text
                                    color="var(--text-secondary)"
                                    fontSize="xs"
                                    lineClamp={1}
                                >
                                    {content.channelName}
                                </Text>
                                <Text
                                    color="var(--text-muted)"
                                    fontSize="xs"
                                    mt={1}
                                >
                                    Detected from clipboard
                                </Text>
                            </Flex>
                        </Flex>
                    )}
                </DialogBody>

                <DialogFooter pt={3} pb={4} px={4} gap={3}>
                    <Button
                        variant="ghost"
                        size="sm"
                        color="var(--text-secondary)"
                        _hover={{ bg: 'var(--bg-hover)' }}
                        onClick={onDismiss}
                        disabled={isAdding}
                        px={4}
                        py={2}
                        gap={2}
                    >
                        <X size={16} />
                        Dismiss
                    </Button>
                    
                    {content && !error && (
                        <Button
                            size="sm"
                            bg="#22c55e"
                            color="white"
                            _hover={{ bg: '#16a34a' }}
                            onClick={onConfirm}
                            disabled={isAdding || isLoading}
                            px={4}
                            py={2}
                            gap={2}
                        >
                            {isAdding ? (
                                <>
                                    <Spinner size="xs" />
                                    Adding...
                                </>
                            ) : (
                                <>
                                    <Plus size={16} />
                                    Add to Library
                                </>
                            )}
                        </Button>
                    )}
                </DialogFooter>
            </DialogContent>
        </DialogRoot>
    );
}
