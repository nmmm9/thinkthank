import { create } from 'zustand';
import { supabase } from '@/lib/supabase/client';
import type { Member } from '@/lib/supabase/database.types';
import type { User } from '@supabase/supabase-js';

// 확장된 멤버 타입 (팀, 조직 정보 포함)
export interface MemberWithRelations extends Member {
  team?: {
    id: string;
    name: string;
    is_active: boolean;
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
  loginWithGoogle: () => Promise<{ success: boolean; error?: string }>;
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
      const { data: member, error: memberError } = await (supabase
        .from('members') as any)
        .select(`
          *,
          team:teams(*),
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

  // Google 로그인
  loginWithGoogle: async () => {
    try {
      set({ isLoading: true, error: null });

      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/`,
          scopes: 'https://www.googleapis.com/auth/calendar',
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
        },
      });

      if (error) {
        set({ isLoading: false, error: error.message });
        return { success: false, error: error.message };
      }

      // OAuth는 리다이렉트 방식이므로 여기서는 성공 반환
      // 실제 인증 완료는 리다이렉트 후 initialize에서 처리
      return { success: true };
    } catch (error) {
      console.error('Google login error:', error);
      set({ isLoading: false, error: 'Google 로그인 중 오류가 발생했습니다.' });
      return { success: false, error: 'Google 로그인 중 오류가 발생했습니다.' };
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

      // 현재 세션 확인 (타임아웃 5초)
      const sessionPromise = supabase.auth.getSession();
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Session timeout')), 5000)
      );

      const { data: { session } } = await Promise.race([
        sessionPromise,
        timeoutPromise,
      ]) as Awaited<ReturnType<typeof supabase.auth.getSession>>;

      if (!session?.user) {
        set({ isLoading: false });
        return;
      }

      // 멤버 정보 조회 (타임아웃 5초)
      const memberPromise = (supabase
        .from('members') as any)
        .select(`
          *,
          team:teams(*),
          organization:organizations(*)
        `)
        .eq('auth_user_id', session.user.id)
        .single();

      const memberTimeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Member query timeout')), 5000)
      );

      const { data: member, error: memberError } = await Promise.race([
        memberPromise,
        memberTimeoutPromise,
      ]) as Awaited<ReturnType<typeof memberPromise>>;

      // 멤버가 없으면 자동 생성 (Google 로그인 등 신규 사용자)
      // 단, 초대 토큰이 있으면 /invite/callback에서 처리하므로 건너뜀
      if (memberError?.code === 'PGRST116' || !member) {
        const pendingInviteToken = typeof window !== 'undefined'
          ? localStorage.getItem('pendingInviteToken')
          : null;

        if (pendingInviteToken) {
          // 초대 처리는 /invite/callback에서 진행
          set({ isLoading: false });
          return;
        }

        // 기본 조직 가져오기
        const { data: org } = await (supabase
          .from('organizations') as any)
          .select('id')
          .limit(1)
          .single();

        if (org) {
          // 새 멤버 생성 (승인 대기 상태)
          const userName = session.user.user_metadata?.full_name
            || session.user.user_metadata?.name
            || session.user.email?.split('@')[0]
            || '새 사용자';

          const { data: newMember, error: createError } = await (supabase
            .from('members') as any)
            .insert({
              org_id: org.id,
              auth_user_id: session.user.id,
              name: userName,
              email: session.user.email,
              role: 'user',
              is_approved: false,
              is_active: true,
            })
            .select(`
              *,
              team:teams(*),
              organization:organizations(*)
            `)
            .single();

          if (!createError && newMember) {
            // 승인 대기 상태로 에러 메시지 설정
            set({
              user: session.user,
              member: newMember as MemberWithRelations,
              isAuthenticated: false,
              isLoading: false,
              error: '회원가입이 완료되었습니다. 관리자 승인을 기다려주세요.',
            });
            return;
          }
        }

        set({ isLoading: false });
        return;
      }

      // 승인되지 않은 경우
      if (!member.is_approved) {
        set({
          user: session.user,
          member: member as MemberWithRelations,
          isAuthenticated: false,
          isLoading: false,
          error: '아직 승인되지 않은 계정입니다. 관리자 승인을 기다려주세요.',
        });
        return;
      }

      // 비활성화된 경우
      if (!member.is_active) {
        set({
          isLoading: false,
          error: '비활성화된 계정입니다. 관리자에게 문의하세요.',
        });
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
