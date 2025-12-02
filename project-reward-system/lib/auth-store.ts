import { create } from 'zustand';
import { supabase } from '@/lib/supabase/client';
import type { Member } from '@/lib/supabase/database.types';
import type { User } from '@supabase/supabase-js';

// 확장된 멤버 타입 (팀, 직급, 조직 정보 포함)
export interface MemberWithRelations extends Member {
  team?: {
    id: string;
    name: string;
    is_active: boolean;
  } | null;
  position?: {
    id: string;
    name: string;
    level: number;
  } | null;
  organization?: {
    id: string;
    name: string;
    slug: string;
    plan: string;
  } | null;
}

interface AuthState {
  user: User | null;
  member: MemberWithRelations | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;

  // 액션
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  setMember: (member: MemberWithRelations | null) => void;
  clearError: () => void;
  initialize: () => Promise<void>;
}

export const useAuthStore = create<AuthState>()((set) => ({
  user: null,
  member: null,
  isAuthenticated: false,
  isLoading: true, // 초기값 true - 세션 확인 전까지 로딩
  error: null,

  // 로그인
  login: async (email: string, password: string) => {
    try {
      set({ isLoading: true, error: null });

      // Supabase Auth 로그인
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) {
        set({ isLoading: false, error: authError.message });
        return { success: false, error: authError.message };
      }

      if (!data.user) {
        set({ isLoading: false, error: '로그인에 실패했습니다.' });
        return { success: false, error: '로그인에 실패했습니다.' };
      }

      // 멤버 정보 조회
      const { data: member, error: memberError } = await supabase
        .from('members')
        .select(`
          *,
          team:teams(*),
          position:positions(*),
          organization:organizations(*)
        `)
        .eq('auth_user_id', data.user.id)
        .single();

      if (memberError && memberError.code !== 'PGRST116') {
        await supabase.auth.signOut();
        set({ isLoading: false, error: '멤버 정보를 조회할 수 없습니다.' });
        return { success: false, error: '멤버 정보를 조회할 수 없습니다.' };
      }

      if (!member) {
        await supabase.auth.signOut();
        set({ isLoading: false, error: '등록된 멤버 정보가 없습니다. 관리자에게 문의하세요.' });
        return { success: false, error: '등록된 멤버 정보가 없습니다.' };
      }

      if (!member.is_approved) {
        await supabase.auth.signOut();
        set({ isLoading: false, error: '아직 승인되지 않은 계정입니다. 관리자 승인을 기다려주세요.' });
        return { success: false, error: '아직 승인되지 않은 계정입니다.' };
      }

      if (!member.is_active) {
        await supabase.auth.signOut();
        set({ isLoading: false, error: '비활성화된 계정입니다. 관리자에게 문의하세요.' });
        return { success: false, error: '비활성화된 계정입니다.' };
      }

      set({
        user: data.user,
        member: member as MemberWithRelations,
        isAuthenticated: true,
        isLoading: false,
        error: null,
      });

      return { success: true };
    } catch (error) {
      console.error('Login error:', error);
      set({ isLoading: false, error: '로그인 중 오류가 발생했습니다.' });
      return { success: false, error: '로그인 중 오류가 발생했습니다.' };
    }
  },

  // 로그아웃
  logout: async () => {
    try {
      await supabase.auth.signOut();
      set({
        user: null,
        member: null,
        isAuthenticated: false,
        error: null,
      });
    } catch (error) {
      console.error('Logout error:', error);
    }
  },

  // 멤버 정보 설정 (외부에서 업데이트 시)
  setMember: (member) => {
    set({ member });
  },

  // 에러 클리어
  clearError: () => {
    set({ error: null });
  },

  // 세션 초기화 (새로고침 시 세션 복원)
  initialize: async () => {
    try {
      set({ isLoading: true });

      // 현재 세션 확인
      const { data: { session } } = await supabase.auth.getSession();

      if (!session?.user) {
        set({ isLoading: false });
        return;
      }

      // 멤버 정보 조회
      const { data: member, error: memberError } = await supabase
        .from('members')
        .select(`
          *,
          team:teams(*),
          position:positions(*),
          organization:organizations(*)
        `)
        .eq('auth_user_id', session.user.id)
        .single();

      if (memberError || !member || !member.is_approved || !member.is_active) {
        set({ isLoading: false });
        return;
      }

      set({
        user: session.user,
        member: member as MemberWithRelations,
        isAuthenticated: true,
        isLoading: false,
      });
    } catch (error) {
      console.error('Initialize error:', error);
      set({ isLoading: false });
    }
  },
}));
