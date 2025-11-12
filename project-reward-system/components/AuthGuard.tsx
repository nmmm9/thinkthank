'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuthStore } from '@/lib/auth-store';

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Hydration 완료 대기
    setIsLoading(false);
  }, []);

  useEffect(() => {
    if (isLoading) return;

    // 로그인 페이지는 체크 안함
    if (pathname === '/login') {
      // 이미 로그인된 경우 대시보드로
      if (isAuthenticated) {
        router.push('/');
      }
      return;
    }

    // 로그인 안된 경우 로그인 페이지로
    if (!isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, pathname, router, isLoading]);

  // Hydration 중이거나 로그인 페이지는 그대로 표시
  if (isLoading || pathname === '/login') {
    return <>{children}</>;
  }

  // 로그인 안된 경우 아무것도 표시하지 않음 (리다이렉트 중)
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <p className="mt-4 text-gray-600">로그인 확인 중...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
