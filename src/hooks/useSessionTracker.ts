import { useEffect, useRef, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { db, type StudySession, type SessionEvent, type SessionEventType } from '../db/db';

interface PlayerLike {
    getPlayerState(): number;
    getPlaybackRate(): number;
}

// YouTube Player States
const PLAYING = 1;
const BUFFERING = 3;

interface TrackerState {
    sessionId: string;
    videoId: string;
    startTime: string;
    focusedSeconds: number;
    playbackRate: number;
    isActive: boolean;
    lastTick: number;
    events: SessionEvent[];
}

export function useSessionTracker(
    videoId: string | null,
    playerRef: React.RefObject<PlayerLike | null>,
) {
    const stateRef = useRef<TrackerState | null>(null);
    const intervalRef = useRef<number | null>(null);

    const logEvent = useCallback((eventType: SessionEventType, playbackRate: number) => {
        const state = stateRef.current;
        if (!state) return;
        state.events.push({
            sessionId: state.sessionId,
            eventType,
            timestamp: new Date().toISOString(),
            playbackRate,
        });
    }, []);

    const checkActive = useCallback((): boolean => {
        const player = playerRef.current;
        if (!player) return false;

        const playerState = player.getPlayerState();
        const isPlaying = playerState === PLAYING;
        const isNotBuffering = playerState !== BUFFERING;
        const isVisible = document.visibilityState === 'visible';
        const hasFocus = document.hasFocus();

        return isPlaying && isNotBuffering && isVisible && hasFocus;
    }, [playerRef]);

    const tick = useCallback(() => {
        const state = stateRef.current;
        if (!state) return;

        const now = performance.now();
        const wasActive = state.isActive;
        const isNowActive = checkActive();

        if (wasActive && isNowActive) {
            const elapsed = (now - state.lastTick) / 1000;
            state.focusedSeconds += elapsed;
        }

        if (wasActive && !isNowActive) {
            logEvent('pause', state.playbackRate);
        } else if (!wasActive && isNowActive) {
            logEvent('play', state.playbackRate);
        }

        state.isActive = isNowActive;
        state.lastTick = now;
    }, [checkActive, logEvent]);

    const saveSession = useCallback(async () => {
        const state = stateRef.current;
        if (!state || state.focusedSeconds < 1) return;

        const session: StudySession = {
            id: state.sessionId,
            videoId: state.videoId,
            startTime: state.startTime,
            endTime: new Date().toISOString(),
            focusedDurationSeconds: Math.round(state.focusedSeconds),
            playbackRate: state.playbackRate,
        };

        const currentEvents = [...state.events];
        state.events = [];

        try {
            await db.studySessions.put(session);
            if (currentEvents.length > 0) {
                await db.sessionEvents.bulkAdd(currentEvents);
            }
        } catch (error) {
            console.error("Failed to save session to DB:", error);
            // Revert events if save fails
            state.events = [...currentEvents, ...state.events];
        }
    }, []);

    const onPlaybackRateChange = useCallback(
        (rate: number) => {
            const state = stateRef.current;
            if (!state) return;
            tick();
            logEvent('rate_change', rate);
            state.playbackRate = rate;
        },
        [tick, logEvent],
    );

    const onVisibilityChange = useCallback(() => {
        const state = stateRef.current;
        if (!state) return;
        if (document.visibilityState === 'hidden') {
            logEvent('focus_lost', state.playbackRate);
        } else {
            logEvent('focus_gained', state.playbackRate);
        }
        tick();
    }, [tick, logEvent]);

    const onFocus = useCallback(() => {
        const state = stateRef.current;
        if (!state) return;
        logEvent('focus_gained', state.playbackRate);
        tick();
    }, [tick, logEvent]);

    const onBlur = useCallback(() => {
        const state = stateRef.current;
        if (!state) return;
        logEvent('focus_lost', state.playbackRate);
        tick();
    }, [tick, logEvent]);

    useEffect(() => {
        if (!videoId) return;

        stateRef.current = {
            sessionId: uuidv4(),
            videoId,
            startTime: new Date().toISOString(),
            focusedSeconds: 0,
            playbackRate: 1,
            isActive: false,
            lastTick: performance.now(),
            events: [],
        };

        intervalRef.current = window.setInterval(tick, 100);
        const saveInterval = window.setInterval(() => void saveSession(), 10000); // Save every 10 seconds

        const handleBeforeUnload = () => {
            void saveSession();
        };

        document.addEventListener('visibilitychange', onVisibilityChange);
        window.addEventListener('focus', onFocus);
        window.addEventListener('blur', onBlur);
        window.addEventListener('beforeunload', handleBeforeUnload);

        return () => {
            void saveSession();
            if (intervalRef.current !== null) {
                clearInterval(intervalRef.current);
                intervalRef.current = null;
            }
            clearInterval(saveInterval);
            document.removeEventListener('visibilitychange', onVisibilityChange);
            window.removeEventListener('focus', onFocus);
            window.removeEventListener('blur', onBlur);
            window.removeEventListener('beforeunload', handleBeforeUnload);
            stateRef.current = null;
        };
    }, [videoId, tick, onVisibilityChange, onFocus, onBlur, saveSession]);

    return {
        onPlaybackRateChange,
        getFocusedSeconds: () => stateRef.current?.focusedSeconds ?? 0,
        isActive: () => stateRef.current?.isActive ?? false,
    };
}
