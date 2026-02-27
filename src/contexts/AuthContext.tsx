/**
 * AuthContext - Beheert authenticatie state voor docenten
 *
 * Gebruik:
 * - Wrap je app met <AuthProvider>
 * - Gebruik useAuth() hook om auth state te lezen
 */

import { createContext, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import type { User, Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { sanitizeError } from '../utils/errorSanitize';
import { logger } from '../utils/logger';

// Types
interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  isTeacher: boolean;
}

interface AuthProviderProps {
  children: ReactNode;
}

// Context aanmaken
const AuthContext = createContext<AuthContextType | undefined>(undefined);

/**
 * AuthProvider component
 * Wrap dit om componenten die auth nodig hebben
 */
export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Haal initiële sessie op
    const initSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        setSession(session);
        setUser(session?.user ?? null);
      } catch (error) {
        logger.error('Fout bij laden sessie:', sanitizeError(error));
      } finally {
        setLoading(false);
      }
    };

    initSession();

    // Luister naar auth wijzigingen (login, logout, etc.)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
      }
    );

    // Cleanup subscription bij unmount
    return () => subscription.unsubscribe();
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

/**
 * useAuth hook
 * Gebruik deze hook om auth state te lezen in componenten
 *
 * @example
 * const { user, isTeacher, loading } = useAuth();
 */
export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);

  if (context === undefined) {
    throw new Error('useAuth moet binnen een AuthProvider gebruikt worden');
  }

  return context;
}

export default AuthContext;
