import { Box, Flex } from '@chakra-ui/react';

export function SkeletonCard() {
    return (
        <Box
            bg="var(--bg-secondary)"
            borderRadius="lg"
            overflow="hidden"
            opacity={0.5}
        >
            {/* Thumbnail skeleton */}
            <Box
                position="relative"
                paddingTop="56.25%"
                bg="var(--bg-tertiary)"
                css={{
                    background: 'linear-gradient(90deg, var(--bg-tertiary) 25%, var(--bg-hover) 50%, var(--bg-tertiary) 75%)',
                    backgroundSize: '200% 100%',
                    animation: 'shimmer 1.5s infinite',
                    '@keyframes shimmer': {
                        '0%': { backgroundPosition: '200% 0' },
                        '100%': { backgroundPosition: '-200% 0' },
                    },
                }}
            />

            {/* Content skeleton */}
            <Box p={3}>
                {/* Title skeleton - two lines */}
                <Box
                    h="14px"
                    w="90%"
                    bg="var(--bg-tertiary)"
                    borderRadius="sm"
                    mb={2}
                    css={{
                        background: 'linear-gradient(90deg, var(--bg-tertiary) 25%, var(--bg-hover) 50%, var(--bg-tertiary) 75%)',
                        backgroundSize: '200% 100%',
                        animation: 'shimmer 1.5s infinite',
                    }}
                />
                <Box
                    h="14px"
                    w="60%"
                    bg="var(--bg-tertiary)"
                    borderRadius="sm"
                    mb={3}
                    css={{
                        background: 'linear-gradient(90deg, var(--bg-tertiary) 25%, var(--bg-hover) 50%, var(--bg-tertiary) 75%)',
                        backgroundSize: '200% 100%',
                        animation: 'shimmer 1.5s infinite',
                    }}
                />

                {/* Channel name skeleton */}
                <Box
                    h="12px"
                    w="40%"
                    bg="var(--bg-tertiary)"
                    borderRadius="sm"
                    mb={3}
                    css={{
                        background: 'linear-gradient(90deg, var(--bg-tertiary) 25%, var(--bg-hover) 50%, var(--bg-tertiary) 75%)',
                        backgroundSize: '200% 100%',
                        animation: 'shimmer 1.5s infinite',
                    }}
                />

                {/* Action buttons skeleton */}
                <Flex gap={1} justify="flex-end">
                    {[1, 2, 3].map((i) => (
                        <Box
                            key={i}
                            h="24px"
                            w="24px"
                            bg="var(--bg-tertiary)"
                            borderRadius="md"
                            css={{
                                background: 'linear-gradient(90deg, var(--bg-tertiary) 25%, var(--bg-hover) 50%, var(--bg-tertiary) 75%)',
                                backgroundSize: '200% 100%',
                                animation: 'shimmer 1.5s infinite',
                            }}
                        />
                    ))}
                </Flex>
            </Box>
        </Box>
    );
}
