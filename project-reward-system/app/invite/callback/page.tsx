'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';

export default function InviteCallbackPage() {
  const router = useRouter();
  const [status, setStatus] = useState<'processing' | 'success' | 'error'>('processing');
  const [message, setMessage] = useState('초대를 처리하는 중...');

  useEffect(() => {
    const processInvite = async () => {
      try {
        // 1. 현재 로그인된 사용자 확인
        const { data: { session } } = await supabase.auth.getSession();

        if (!session?.user) {
          setStatus('error');
          setMessage('로그인 정보를 찾을 수 없습니다.');
          return;
        }

        // 2. 저장된 초대 토큰 확인
        const inviteToken = localStorage.getItem('pendingInviteToken');

        if (!inviteToken) {
          // 토큰이 없으면 일반 로그인으로 처리
          router.push('/');
          return;
        }

        // 3. 초대 정보 조회
        const { data: invitation, error: inviteError } = await (supabase
          .from('invitations') as any)
          .select('*')
          .eq('token', inviteToken)
          .single();

        if (inviteError || !invitation) {
          setStatus('error');
          setMessage('유효하지 않은 초대입니다.');
          localStorage.removeItem('pendingInviteToken');
          return;
        }

        // 4. 만료 확인
        if (new Date(invitation.expires_at) < new Date()) {
          setStatus('error');
          setMessage('만료된 초대입니다.');
          localStorage.removeItem('pendingInviteToken');
          return;
        }

        // 5. 이미 수락됨
        if (invitation.accepted_at) {
          setStatus('error');
          setMessage('이미 수락된 초대입니다.');
          localStorage.removeItem('pendingInviteToken');
          return;
        }

        // 6. 이미 멤버인지 확인
        const { data: existingMember } = await (supabase
          .from('members') as any)
          .select('id')
          .eq('auth_user_id', session.user.id)
          .eq('org_id', invitation.org_id)
          .single();

        if (existingMember) {
          setStatus('error');
          setMessage('이미 등록된 멤버입니다.');
          localStorage.removeItem('pendingInviteToken');
          setTimeout(() => router.push('/'), 2000);
          return;
        }

        // 7. 멤버 생성 - API 호출
        const response = await fetch('/api/invite/accept', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            token: inviteToken,
            userId: session.user.id,
            email: session.user.email,
            name: session.user.user_metadata?.full_name
              || session.user.user_metadata?.name
              || session.user.email?.split('@')[0]
              || '새 사용자',
          }),
        });

        const result = await response.json();

        if (!response.ok) {
          setStatus('error');
          setMessage(result.error || '가입 처리 중 오류가 발생했습니다.');
          localStorage.removeItem('pendingInviteToken');
          return;
        }

        // 8. 성공
        localStorage.removeItem('pendingInviteToken');
        setStatus('success');
        setMessage('가입이 완료되었습니다! 잠시 후 대시보드로 이동합니다.');

        // 3초 후 대시보드로 이동
        setTimeout(() => {
          router.push('/');
        }, 3000);

      } catch (error) {
        console.error('Process invite error:', error);
        setStatus('error');
        setMessage('처리 중 오류가 발생했습니다.');
        localStorage.removeItem('pendingInviteToken');
      }
    };

    processInvite();
  }, [router]);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
        {status === 'processing' && (
          <>
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
            <h1 className="text-xl font-bold text-gray-900 mb-2">처리 중</h1>
          </>
        )}

        {status === 'success' && (
          <>
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h1 className="text-xl font-bold text-gray-900 mb-2">가입 완료!</h1>
          </>
        )}

        {status === 'error' && (
          <>
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <h1 className="text-xl font-bold text-gray-900 mb-2">오류 발생</h1>
          </>
        )}

        <p className="text-gray-600">{message}</p>

        {status === 'error' && (
          <button
            onClick={() => router.push('/login')}
            className="mt-6 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            로그인 페이지로 이동
          </button>
        )}
      </div>
    </div>
  );
}
