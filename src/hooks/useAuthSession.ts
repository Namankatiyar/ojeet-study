import { useEffect, useState } from 'react';
import type { User } from '@supabase/supabase-js';
import { getCurrentSessionUser, onAuthStateChange } from '../services/auth';
import { hasSupabaseConfig } from '../services/supabaseClient';

const AUTH_LOADING_TIMEOUT_MS = 5000;

export function useAuthSession() {
    const [user, setUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(() => hasSupabaseConfig());

    useEffect(() => {
        let isMounted = true;

        if (!hasSupabaseConfig()) {
            return () => undefined;
        }

        const loadingTimeout = window.setTimeout(() => {
            if (isMounted) setIsLoading(false);
        }, AUTH_LOADING_TIMEOUT_MS);

        // Subscribe first so we don't miss OAuth SIGNED_IN after redirect.
        const unsubscribe = onAuthStateChange((nextUser) => {
            if (!isMounted) return;
            setUser(nextUser);
            setIsLoading(false);
        });

        void getCurrentSessionUser()
            .then((currentUser) => {
                if (!isMounted) return;
                setUser(currentUser);
            })
            .catch((error) => {
                console.error('Failed to load Supabase session user:', error);
            })
            .finally(() => {
                if (isMounted) setIsLoading(false);
            });

        return () => {
            isMounted = false;
            window.clearTimeout(loadingTimeout);
            unsubscribe();
        };
    }, []);

    return {
        user,
        isLoading,
        isConfigured: hasSupabaseConfig(),
    };
}
