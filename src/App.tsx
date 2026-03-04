import { useState } from 'react';
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
import { Library, Play, BarChart3, Download, X, SendToBack, AlertCircle } from 'lucide-react';
import { LibraryPage } from './pages/LibraryPage';
import { PlayerPage } from './pages/PlayerPage';
import { AnalyticsPage } from './pages/AnalyticsPage';
import { useInstallPrompt } from './hooks/useInstallPrompt';
import { performTrackerSync } from './utils/exportTrackerSync';

function NavBar() {
  const location = useLocation();
  const [isSyncing, setIsSyncing] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const navItems = [
    { to: '/', label: 'Library', icon: Library },
    { to: '/analytics', label: 'Analytics', icon: BarChart3 },
  ];

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
                const hasData = await performTrackerSync();
                if (!hasData) {
                  setIsDialogOpen(true);
                }
              } catch (e) {
                console.error("Failed to generate sync link:", e);
              } finally {
                setIsSyncing(false);
              }
            }}
            loading={isSyncing}
            aria-label="Sync to Tracker"
            title="Sync to Tracker"
          >
            <SendToBack size={16} strokeWidth={1.5} />
          </IconButton>

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
        </Flex>
      </Flex>

      <DialogRoot open={isDialogOpen} onOpenChange={(e) => setIsDialogOpen(e.open)} placement="center">
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
                <Text fontWeight="600" fontSize="lg">No New Data</Text>
              </Flex>
            </DialogTitle>
          </DialogHeader>
          <DialogBody pb={6}>
            <Text color="var(--text-secondary)" fontSize="sm" lineHeight="1.6">
              All your recent study sessions have already been synced. There is no new data to export to the Tracker since your last sync!
            </Text>
          </DialogBody>
          <DialogFooter>
            <Button
              size="sm"
              px={4}
              bg="var(--accent)"
              color="var(--bg-primary)"
              _hover={{ bg: 'var(--accent-hover)' }}
              onClick={() => setIsDialogOpen(false)}
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
