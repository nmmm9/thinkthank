'use client';

import { useEffect, useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuthStore } from '@/lib/auth-store';
import LoginPage from '@/app/login/page';

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { isAuthenticated, isLoading, initialize } = useAuthStore();
  const initialized = useRef(false);

  const isLoginPage = pathname === '/login';
  const isInvitePage = pathname?.startsWith('/invite');

  // 앱 시작 시 세션 복원
  useEffect(() => {
    if (!initialized.current) {
      initialized.current = true;
      initialize();
    }
  }, [initialize]);

  useEffect(() => {
    // 로딩 중이면 아무것도 하지 않음
    if (isLoading) return;

    // 로그인 페이지에서 이미 로그인된 경우 대시보드로
    if (isLoginPage && isAuthenticated) {
      router.push('/');
      return;
    }
  }, [isAuthenticated, isLoading, isLoginPage, router]);

  // 로그인 페이지, 초대 페이지는 항상 표시
  if (isLoginPage || isInvitePage) {
    return <>{children}</>;
  }

  // 로딩 중일 때만 로딩 표시
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <p className="mt-4 text-gray-600">로그인 중...</p>
        </div>
      </div>
    );
  }

  // 로그인 안된 경우 로그인 페이지 바로 표시
  if (!isAuthenticated) {
    return <LoginPage />;
  }

  return <>{children}</>;
}
