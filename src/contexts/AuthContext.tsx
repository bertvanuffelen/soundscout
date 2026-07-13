/**
 * AuthContext - Beheert authenticatie state voor docenten
 *
 * Gebruik:
 * - Wrap je app met <AuthProvider>
 * - Gebruik useAuth() hook om auth state te lezen
 */

import { createContext, useEffect, useState, useRef, useCallback } from 'react';
import type { ReactNode } from 'react';
import type { User, Session } from '@supabase/supabase-js';
import { getSupabase } from '../lib/supabase';
import { sanitizeError } from '../utils/errorSanitize';
import { logger } from '../utils/logger';

// Types
export interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  isTeacher: boolean;
  /** True zolang de docent via een wachtwoord-reset-link binnenkwam en nog geen nieuw wachtwoord instelde */
  passwordRecovery: boolean;
  clearPasswordRecovery: () => void;
}

/**
 * Detecteer bij eerste render of we via een wachtwoord-reset-link binnenkomen.
 * Drie signalen: onze eigen ?screen=reset-password redirect, het Supabase
 * recovery-token in de hash, of een verlopen-link-fout in de hash. De URL wordt
 * vóór het aanmaken van de Supabase-client gelezen, omdat detectSessionInUrl
 * de hash daarna opschoont.
 */
function detectPasswordRecoveryFromUrl(): boolean {
  const search = new URLSearchParams(window.location.search);
  const hash = window.location.hash;
  return (
    search.get('screen') === 'reset-password' ||
    hash.includes('type=recovery') ||
    hash.includes('error_code=otp_expired')
  );
}

interface AuthProviderProps {
  children: ReactNode;
}

// Context aanmaken
// eslint-disable-next-line react-refresh/only-export-components
export const AuthContext = createContext<AuthContextType | undefined>(undefined);

/**
 * AuthProvider component
 * Wrap dit om componenten die auth nodig hebben
 */
export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [passwordRecovery, setPasswordRecovery] = useState<boolean>(detectPasswordRecoveryFromUrl);
  const cleanupRef = useRef<(() => void) | null>(null);

  const clearPasswordRecovery = useCallback(() => setPasswordRecovery(false), []);

  useEffect(() => {
    let cancelled = false;

    const init = async () => {
      try {
        const supabase = await getSupabase();
        if (cancelled) return;

        // Haal initiële sessie op
        const { data: { session } } = await supabase.auth.getSession();
        if (cancelled) return;

        setSession(session);
        setUser(session?.user ?? null);

        // Luister naar auth wijzigingen (login, logout, etc.)
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
          (event, session) => {
            setSession(session);
            setUser(session?.user ?? null);
            // Vangnet naast de URL-detectie: Supabase meldt recovery expliciet
            if (event === 'PASSWORD_RECOVERY') {
              setPasswordRecovery(true);
            }
          }
        );

        cleanupRef.current = () => subscription.unsubscribe();
      } catch (error) {
        logger.error('Fout bij laden sessie:', sanitizeError(error));
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    init();

    // Cleanup subscription bij unmount
    return () => {
      cancelled = true;
      cleanupRef.current?.();
    };
  }, []);

  const value: AuthContextType = {
    user,
    session,
    loading,
    isTeacher: !!user, // Als er een user is, is het een docent
    passwordRecovery,
    clearPasswordRecovery,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

