import { useContext } from 'react';
import { AuthContext, type AuthContextType } from './AuthContext';

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
