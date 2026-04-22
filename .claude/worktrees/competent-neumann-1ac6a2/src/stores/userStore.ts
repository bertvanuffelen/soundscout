/**
 * UserStore - User session and class management
 *
 * Manages:
 * - User role (guest, student, teacher)
 * - Active class code (for students)
 * - Teacher authentication state (via Supabase)
 *
 * This store prepares the architecture for Fase 4 (Supabase integration).
 * Currently works with localStorage only.
 *
 * Key concepts:
 * - Guest: Default state, no identification
 * - Student: Has a name and optionally joined a class (no login required)
 * - Teacher: Authenticated via Supabase (has dashboard access)
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { UserRole, UserSession } from '../types';
import { DEFAULT_USER_SESSION } from '../types';

interface UserStore {
  // Current session
  session: UserSession;

  // Role management
  setRole: (role: UserRole) => void;
  isGuest: () => boolean;
  isStudent: () => boolean;
  isTeacher: () => boolean;

  // Student actions
  setStudentName: (name: string) => void;
  joinClass: (classCode: string) => void;
  leaveClass: () => void;

  // Teacher actions (will integrate with Supabase later)
  loginAsTeacher: (teacherId: string, name: string) => void;
  logout: () => void;

  // Reset to default
  resetSession: () => void;
}

export const useUserStore = create<UserStore>()(
  persist(
    (set, get) => ({
      session: DEFAULT_USER_SESSION,

      // Role checks
      setRole: (role) =>
        set((state) => ({
          session: { ...state.session, role },
        })),

      isGuest: () => get().session.role === 'guest',
      isStudent: () => get().session.role === 'student',
      isTeacher: () => get().session.role === 'teacher',

      // Student actions
      setStudentName: (name) =>
        set((state) => ({
          session: {
            ...state.session,
            role: 'student',
            studentName: name,
          },
        })),

      joinClass: (classCode) =>
        set((state) => ({
          session: {
            ...state.session,
            activeClassCode: classCode,
          },
        })),

      leaveClass: () =>
        set((state) => ({
          session: {
            ...state.session,
            activeClassCode: undefined,
          },
        })),

      // Teacher actions
      loginAsTeacher: (teacherId, name) =>
        set({
          session: {
            role: 'teacher',
            teacherId,
            teacherName: name,
          },
        }),

      logout: () => set({ session: DEFAULT_USER_SESSION }),

      // Reset
      resetSession: () => set({ session: DEFAULT_USER_SESSION }),
    }),
    {
      name: 'soundscout:user-session',
      // Only persist the session object
      partialize: (state) => ({ session: state.session }),
    }
  )
);
