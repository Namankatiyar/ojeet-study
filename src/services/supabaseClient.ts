import { createClient, type SupabaseClient } from '@supabase/supabase-js';

let client: SupabaseClient | null = null;
let didWarn = false;

function readSupabaseConfig() {
    return {
        url: import.meta.env.VITE_SUPABASE_URL,
        anonKey: import.meta.env.VITE_SUPABASE_ANON_KEY,
    };
}

export function hasSupabaseConfig(): boolean {
    const { url, anonKey } = readSupabaseConfig();
    return Boolean(url && anonKey);
}

export function getSupabaseClient(): SupabaseClient | null {
    if (client) return client;

    const { url, anonKey } = readSupabaseConfig();
    if (!url || !anonKey) {
        if (!didWarn) {
            didWarn = true;
            console.warn(
                'Supabase config missing. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.',
            );
        }
        return null;
    }

    client = createClient(url, anonKey, {
        auth: {
            persistSession: true,
            autoRefreshToken: true,
            detectSessionInUrl: true,
        },
    });

    return client;
}
