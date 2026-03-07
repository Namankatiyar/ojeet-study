import { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Link as RouterLink, useLocation } from 'react-router-dom';
import { ChakraProvider, defaultSystem, Box, Flex, Text, Button, IconButton } from '@chakra-ui/react';
import {
  DialogRoot,
  DialogContent,
  DialogHeader,
  DialogBody,
  DialogFooter,
  DialogTitle,
} from './components/ui/dialog';
import { Library, Play, BarChart3, Download, X, RefreshCcw, AlertCircle, Settings, Cloud } from 'lucide-react';
import { LibraryPage } from './pages/LibraryPage';
import { PlayerPage } from './pages/PlayerPage';
import { AnalyticsPage } from './pages/AnalyticsPage';
import { useAuthSession } from './hooks/useAuthSession';
import { useInstallPrompt } from './hooks/useInstallPrompt';
import { useVideoLogSyncStatus } from './hooks/useVideoLogSyncStatus';
import { signInWithGoogle, signOut } from './services/auth';
import {
  flushVideoLogsNow,
  initializeVideoLogSync,
  queueVideoLogsFromStudyHistory,
} from './services/videoLogSync';

function NavBar() {
  const location = useLocation();
  const { user, isLoading: isAuthLoading, isConfigured } = useAuthSession();
  const syncStatus = useVideoLogSyncStatus();
  const [isSyncing, setIsSyncing] = useState(false);
  const [isErrorDialogOpen, setIsErrorDialogOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isDebugVisible, setIsDebugVisible] = useState<boolean>(() => {
    return localStorage.getItem('ojeet_debug_visible') === '1';
  });

  const navItems = [
    { to: '/', label: 'Library', icon: Library },
    { to: '/analytics', label: 'Analytics', icon: BarChart3 },
  ];

  const statusColor = !isConfigured || syncStatus.state === 'error'
    ? '#ef4444'
    : (!user || syncStatus.state === 'syncing' || syncStatus.state === 'queued')
      ? '#f59e0b'
      : '#22c55e';
  const statusLabel = !isConfigured
    ? 'Not Configured'
    : !user
      ? 'Sign In Needed'
      : syncStatus.state === 'syncing'
        ? 'Syncing'
        : syncStatus.state === 'queued'
          ? 'Pending'
          : syncStatus.state === 'error'
            ? 'Error'
            : 'Healthy';
  const lastSyncedAtLabel = syncStatus.lastSyncedAt ? new Date(syncStatus.lastSyncedAt).toLocaleString() : 'Never';

  const toggleDebugPanel = () => {
    setIsDebugVisible((prev) => {
      const next = !prev;
      localStorage.setItem('ojeet_debug_visible', next ? '1' : '0');
      return next;
    });
  };

  return (
    <Box
      borderBottomWidth="1px"
      borderColor="var(--border-color)"
      bg="var(--bg-secondary)"
    >
      <Flex maxW="960px" mx="auto" px={4} h="56px" align="center" justify="space-between">
        <Flex align="center" gap={2}>
          <Play size={18} fill="white" color="white" />
          <Text fontWeight="700" fontSize="md" color="var(--text-primary)">
            OJEET Study
          </Text>
        </Flex>

        <Flex gap={1} align="center">
          <IconButton
            h="32px"
            w="32px"
            minW="32px"
            marginRight="5px"
            p={0}
            bg="var(--accent)"
            color="var(--bg-primary)"
            _hover={{ bg: 'var(--accent-hover)' }}
            onClick={async () => {
              setIsSyncing(true);
              try {
                await queueVideoLogsFromStudyHistory();
                const result = await flushVideoLogsNow();
                if (!result.ok && result.reason === 'error') {
                  setIsErrorDialogOpen(true);
                }
              } catch (e) {
                console.error('Failed to sync logs:', e);
                setIsErrorDialogOpen(true);
              } finally {
                setIsSyncing(false);
              }
            }}
            disabled={!isConfigured || !user}
            loading={isSyncing}
            aria-label="Sync video logs"
            title={isConfigured ? 'Sync video logs' : 'Configure Supabase env vars'}
          >
            <RefreshCcw size={16} strokeWidth={1.75} />
          </IconButton>

          <Flex
            align="center"
            justify="center"
            h="32px"
            w="32px"
            mr={2}
            borderRadius="md"
            borderWidth="1px"
            borderColor="var(--border-color)"
            bg="var(--bg-tertiary)"
            title={`Cloud Sync ${statusLabel}`}
          >
            <Box position="relative" display="inline-flex" alignItems="center" justifyContent="center">
              <Cloud size={15} color="var(--text-secondary)" />
              <Box
                position="absolute"
                bottom="-1px"
                right="-2px"
                h="7px"
                w="7px"
                borderRadius="full"
                bg={statusColor}
                border="1px solid var(--bg-secondary)"
              />
            </Box>
          </Flex>

          {navItems.map(({ to, label, icon: Icon }) => {
            const isActive = location.pathname === to;
            return (
              <RouterLink key={to} to={to}>
                <Flex
                  align="center"
                  gap={1.5}
                  px={3}
                  py={1.5}
                  borderRadius="md"
                  bg={isActive ? 'var(--bg-active)' : 'transparent'}
                  color={isActive ? 'var(--text-primary)' : 'var(--text-secondary)'}
                  _hover={{ bg: 'var(--bg-hover)' }}
                  transition="all 0.15s"
                >
                  <Icon size={16} />
                  <Text fontSize="sm" fontWeight={isActive ? '500' : '300'}>
                    {label}
                  </Text>
                </Flex>
              </RouterLink>
            );
          })}

          <IconButton
            h="32px"
            w="32px"
            minW="32px"
            p={0}
            variant="outline"
            borderColor="var(--border-color)"
            color="var(--text-secondary)"
            _hover={{ bg: 'var(--bg-hover)', color: 'var(--text-primary)' }}
            onClick={() => setIsSettingsOpen(true)}
            aria-label="Open settings"
            title="Settings"
          >
            <Settings size={16} />
          </IconButton>
        </Flex>
      </Flex>

      <DialogRoot open={isSettingsOpen} onOpenChange={(e) => setIsSettingsOpen(e.open)} placement="center">
        <DialogContent
          bg="var(--bg-secondary)"
          borderColor="var(--border-color)"
          borderWidth="1px"
          borderRadius="lg"
          p={6}
          maxW="md"
        >
          <DialogHeader pb={3}>
            <DialogTitle>
              <Flex align="center" gap={2} color="var(--text-primary)">
                <Settings size={18} />
                <Text fontWeight="600" fontSize="lg">Settings</Text>
              </Flex>
            </DialogTitle>
          </DialogHeader>

          <DialogBody pb={4}>
            <Text fontSize="sm" color="var(--text-secondary)" mb={2}>Account</Text>
            {user ? (
              <Flex align="center" justify="space-between" mb={5}>
                <Text fontSize="xs" color="var(--text-muted)">Signed in as {user.email ?? user.id}</Text>
                <Button
                  size="sm"
                  bg="#ef4444"
                  color="white"
                  borderWidth="1px"
                  borderColor="#ef4444"
                  _hover={{ bg: '#dc2626', borderColor: '#dc2626' }}
                  _active={{ bg: '#b91c1c' }}
                  px={4}
                  onClick={() => void signOut()}
                >
                  Sign out
                </Button>
              </Flex>
            ) : (
              <Button
                size="sm"
                w="full"
                h="40px"
                bg="white"
                color="#3c4043"
                borderWidth="1px"
                borderColor="#dadce0"
                fontWeight="500"
                fontFamily="'Roboto','Arial',sans-serif"
                _hover={{ bg: '#f8f9fa', borderColor: '#d2e3fc' }}
                _active={{ bg: '#f1f3f4' }}
                disabled={!isConfigured || isAuthLoading}
                loading={isAuthLoading}
                onClick={() => void signInWithGoogle()}
                mb={5}
              >
                <Flex align="center" gap={2}>
                  <Box as="span" display="inline-flex" alignItems="center">
                    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
                      <path fill="#EA4335" d="M9 3.48c1.69 0 2.84.73 3.49 1.35l2.55-2.49C13.53.94 11.48 0 9 0 5.48 0 2.44 2.02.96 4.96l2.96 2.3C4.63 5.14 6.62 3.48 9 3.48z" />
                      <path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84c-.21 1.13-.84 2.08-1.8 2.72l2.91 2.26c1.7-1.57 2.69-3.88 2.69-6.62z" />
                      <path fill="#FBBC05" d="M3.92 10.74a5.41 5.41 0 0 1 0-3.48l-2.96-2.3A9 9 0 0 0 0 9c0 1.45.35 2.82.96 4.04l2.96-2.3z" />
                      <path fill="#34A853" d="M9 18c2.48 0 4.56-.82 6.08-2.22l-2.91-2.26c-.81.54-1.84.86-3.17.86-2.38 0-4.37-1.66-5.08-3.9l-2.96 2.3C2.44 15.98 5.48 18 9 18z" />
                    </svg>
                  </Box>
                  <Text fontSize="sm">Sign in with Google</Text>
                </Flex>
              </Button>
            )}

            <Text fontSize="sm" color="var(--text-secondary)" mb={2}>Debug</Text>
            <Flex align="center" justify="space-between" mb={isDebugVisible ? 3 : 0}>
              <Text fontSize="xs" color="var(--text-muted)">
                Show sync diagnostics for troubleshooting
              </Text>
              <Button
                size="xs"
                bg={isDebugVisible ? '#0ea5e9' : 'var(--bg-tertiary)'}
                color={isDebugVisible ? 'white' : 'var(--text-primary)'}
                borderWidth="1px"
                borderColor={isDebugVisible ? '#0284c7' : 'var(--border-color)'}
                _hover={{
                  bg: isDebugVisible ? '#0284c7' : 'var(--bg-hover)',
                  borderColor: isDebugVisible ? '#0369a1' : 'var(--border-hover)',
                }}
                px={3}
                onClick={toggleDebugPanel}
              >
                {isDebugVisible ? 'Turn Debug Off' : 'Turn Debug On'}
              </Button>
            </Flex>

            {isDebugVisible && (
              <Box borderWidth="1px" borderColor="var(--border-color)" borderRadius="md" p={3} bg="var(--bg-tertiary)">
                <Flex wrap="wrap" gap={3}>
                  <Text fontSize="xs" color="var(--text-secondary)">Configured: {isConfigured ? 'yes' : 'no'}</Text>
                  <Text fontSize="xs" color="var(--text-secondary)">Auth Loading: {isAuthLoading ? 'yes' : 'no'}</Text>
                  <Text fontSize="xs" color="var(--text-secondary)">Manual Sync: {isSyncing ? 'running' : 'idle'}</Text>
                  <Text fontSize="xs" color="var(--text-secondary)">State: {syncStatus.state}</Text>
                  <Text fontSize="xs" color="var(--text-secondary)">Queued: {syncStatus.queuedCount}</Text>
                  <Text fontSize="xs" color="var(--text-secondary)">Last Synced: {lastSyncedAtLabel}</Text>
                  <Text fontSize="xs" color="var(--text-secondary)">Last Error: {syncStatus.lastError ?? 'none'}</Text>
                  <Text fontSize="xs" color="var(--text-secondary)">User ID: {user?.id ?? 'Not signed in'}</Text>
                </Flex>
              </Box>
            )}
          </DialogBody>

          <DialogFooter>
            <Button
              size="sm"
              px={4}
              variant="outline"
              borderColor="var(--border-color)"
              color="var(--text-primary)"
              _hover={{ bg: 'var(--bg-hover)', borderColor: 'var(--border-hover)' }}
              onClick={() => setIsSettingsOpen(false)}
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </DialogRoot>

      <DialogRoot open={isErrorDialogOpen} onOpenChange={(e) => setIsErrorDialogOpen(e.open)} placement="center">
        <DialogContent
          bg="var(--bg-secondary)"
          borderColor="var(--border-color)"
          borderWidth="1px"
          borderRadius="lg"
          p={6}
          maxW="sm"
        >
          <DialogHeader pb={3}>
            <DialogTitle>
              <Flex align="center" gap={2} color="var(--text-primary)">
                <AlertCircle size={20} color="var(--text-secondary)" />
                <Text fontWeight="600" fontSize="lg">Sync Failed</Text>
              </Flex>
            </DialogTitle>
          </DialogHeader>
          <DialogBody pb={6}>
            <Text color="var(--text-secondary)" fontSize="sm" lineHeight="1.6">
              Sync failed. Confirm you are signed in and your Supabase environment variables are correct, then retry.
            </Text>
          </DialogBody>
          <DialogFooter>
            <Button
              size="sm"
              px={4}
              bg="var(--accent)"
              color="var(--bg-primary)"
              _hover={{ bg: 'var(--accent-hover)' }}
              onClick={() => setIsErrorDialogOpen(false)}
            >
              Understood
            </Button>
          </DialogFooter>
        </DialogContent>
      </DialogRoot>
    </Box>
  );
}

function InstallBanner() {
  const { canPrompt, promptInstall, dismiss } = useInstallPrompt();

  if (!canPrompt) return null;

  return (
    <Flex
      bg="var(--bg-tertiary)"
      borderBottomWidth="1px"
      borderColor="var(--border-color)"
      px={4}
      py={2}
      align="center"
      justify="center"
      gap={3}
    >
      <Text fontSize="sm" color="var(--text-secondary)">
        Install OJEET Study for offline access
      </Text>
      <Button
        padding="5px"
        size="xs"
        bg="white"
        color="black"
        _hover={{ bg: 'var(--accent-hover)' }}
        onClick={() => void promptInstall()}
      >
        <Download size={12} />
        Install
      </Button>
      <Button
        size="xs"
        variant="ghost"
        color="var(--text-secondary)"
        _hover={{ bg: 'var(--bg-hover)' }}
        onClick={dismiss}
        aria-label="Dismiss install banner"
      >
        <X size={14} />
      </Button>
    </Flex>
  );
}

function AppContent() {
  useEffect(() => {
    return initializeVideoLogSync();
  }, []);

  return (
    <Box minH="100vh" display="flex" flexDirection="column" bg="var(--bg-primary)">
      <NavBar />
      <InstallBanner />
      <Box flex={1}>
        <Routes>
          <Route path="/" element={<LibraryPage />} />
          <Route path="/watch/:videoId" element={<PlayerPage />} />
          <Route path="/analytics" element={<AnalyticsPage />} />
        </Routes>
      </Box>
    </Box>
  );
}

export default function App() {
  return (
    <ChakraProvider value={defaultSystem}>
      <BrowserRouter>
        <AppContent />
      </BrowserRouter>
    </ChakraProvider>
  );
}
