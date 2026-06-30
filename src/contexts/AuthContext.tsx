/**
 * AuthContext - Beheert authenticatie state voor docenten
 *
 * Gebruik:
 * - Wrap je app met <AuthProvider>
 * - Gebruik useAuth() hook om auth state te lezen
 */

import { createContext, useEffect, useState, useRef } from 'react';
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
  const cleanupRef = useRef<(() => void) | null>(null);

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
          (_event, session) => {
            setSession(session);
            setUser(session?.user ?? null);
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
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

