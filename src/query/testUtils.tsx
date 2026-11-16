/**
 * Testhulp voor hooks op TanStack Query: een verse QueryClient per test en
 * een wrapper met QueryClientProvider + een nep-AuthContext. De docent is te
 * wisselen via `auth.userId` gevolgd door `rerender()`.
 */
import type { ReactNode } from 'react';
import type { User } from '@supabase/supabase-js';
import { QueryClientProvider, type QueryClient } from '@tanstack/react-query';
import { AuthContext, type AuthContextType } from '../contexts/AuthContext';
import { createQueryClient } from './queryClient';
import { QueryAuthSync } from './QueryAuthSync';

export interface TestAuth {
  /** null = niemand ingelogd */
  userId: string | null;
}

/** Zelfde standaarden als de app, maar zonder wachttijd tussen herhalingen. */
export function createTestQueryClient(): QueryClient {
  return createQueryClient({ queries: { retryDelay: 0 } });
}

function authValue(userId: string | null): AuthContextType {
  const user = userId ? ({ id: userId } as User) : null;
  return {
    user,
    session: null,
    loading: false,
    isTeacher: !!user,
    passwordRecovery: false,
    clearPasswordRecovery: () => {},
  };
}

export function createQueryWrapper(client: QueryClient, auth: TestAuth = { userId: 'teacher-a' }) {
  return function QueryWrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={client}>
        <AuthContext.Provider value={authValue(auth.userId)}>
          <QueryAuthSync />
          {children}
        </AuthContext.Provider>
      </QueryClientProvider>
    );
  };
}
