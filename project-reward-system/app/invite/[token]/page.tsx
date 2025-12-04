'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';

interface InvitationData {
  id: string;
  email: string;
  role: string;
  org_id: string;
  expires_at: string;
  accepted_at: string | null;
  organization?: {
    name: string;
  };
}

export default function InvitePage() {
  const params = useParams();
  const router = useRouter();
  const token = params.token as string;

  const [invitation, setInvitation] = useState<InvitationData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAccepting, setIsAccepting] = useState(false);

  // 초대 정보 조회
  useEffect(() => {
    const fetchInvitation = async () => {
      try {
        const { data, error: fetchError } = await (supabase
          .from('invitations') as any)
          .select(`
            id,
            email,
            role,
            org_id,
            expires_at,
            accepted_at,
            organization:organizations(name)
          `)
          .eq('token', token)
          .single();

        if (fetchError || !data) {
          setError('유효하지 않은 초대 링크입니다.');
          return;
        }

        // 만료 확인
        if (new Date(data.expires_at) < new Date()) {
          setError('만료된 초대 링크입니다.');
          return;
        }

        // 이미 수락됨
        if (data.accepted_at) {
          setError('이미 수락된 초대입니다.');
          return;
        }

        setInvitation(data);
      } catch (err) {
        console.error('Fetch invitation error:', err);
        setError('초대 정보를 불러오는 중 오류가 발생했습니다.');
      } finally {
        setIsLoading(false);
      }
    };

    if (token) {
      fetchInvitation();
    }
  }, [token]);

  // Google 로그인으로 초대 수락
  const handleAcceptWithGoogle = async () => {
    if (!invitation) return;

    setIsAccepting(true);

    // 초대 토큰을 로컬 스토리지에 저장 (Google 로그인 후 사용)
    localStorage.setItem('pendingInviteToken', token);

    // Google OAuth 로그인
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/invite/callback`,
        scopes: 'https://www.googleapis.com/auth/calendar',
      },
    });

    if (error) {
      console.error('Google login error:', error);
      setError('Google 로그인 중 오류가 발생했습니다.');
      setIsAccepting(false);
      localStorage.removeItem('pendingInviteToken');
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p className="mt-4 text-gray-600">초대 정보를 확인하는 중...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h1 className="text-xl font-bold text-gray-900 mb-2">초대 오류</h1>
          <p className="text-gray-600 mb-6">{error}</p>
          <button
            onClick={() => router.push('/login')}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            로그인 페이지로 이동
          </button>
        </div>
      </div>
    );
  }

  const getRoleLabel = (role: string) => {
    const labels: Record<string, string> = {
      admin: '총괄관리자',
      manager: '팀관리자',
      user: '일반',
    };
    return labels[role] || role;
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">CO.UP</h1>
          <p className="text-gray-600">팀 초대</p>
        </div>

        <div className="bg-blue-50 rounded-xl p-6 mb-6">
          <p className="text-gray-700 text-center">
            <span className="font-semibold text-blue-600">
              {invitation?.organization?.name || '조직'}
            </span>
            에서
            <br />
            <span className="font-semibold">{getRoleLabel(invitation?.role || 'user')}</span>
            으로 초대했습니다.
          </p>
          <p className="text-sm text-gray-500 text-center mt-2">
            초대 이메일: {invitation?.email}
          </p>
        </div>

        <button
          onClick={handleAcceptWithGoogle}
          disabled={isAccepting}
          className="w-full flex items-center justify-center gap-3 px-4 py-4 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium text-gray-700"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24">
            <path
              fill="#4285F4"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="#34A853"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="#FBBC05"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
            />
            <path
              fill="#EA4335"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
            />
          </svg>
          <span>{isAccepting ? '처리 중...' : 'Google로 가입하기'}</span>
        </button>

        <p className="text-xs text-gray-500 text-center mt-6">
          가입 시 CO.UP의 서비스 이용약관에 동의하게 됩니다.
        </p>
      </div>
    </div>
  );
}
