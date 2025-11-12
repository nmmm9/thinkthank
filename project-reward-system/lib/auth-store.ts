import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Member } from '@/types';

interface AuthState {
  user: Member | null;
  isAuthenticated: boolean;
  login: (user: Member) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      isAuthenticated: false,
      login: (user) => set({ user, isAuthenticated: true }),
      logout: () => set({ user: null, isAuthenticated: false }),
    }),
    {
      name: 'auth-storage',
      storage: {
        getItem: (name) => {
          const str = sessionStorage.getItem(name);
          return str ? JSON.parse(str) : null;
        },
        setItem: (name, value) => {
          sessionStorage.setItem(name, JSON.stringify(value));
        },
        removeItem: (name) => sessionStorage.removeItem(name),
      },
    }
  )
);

// 권한 레벨 라벨
export const getLevelLabel = (level: string) => {
  const labels: Record<string, string> = {
    admin: 'CEO',
    manager: '팀장',
    user: '일반사원',
  };
  return labels[level] || level;
};
