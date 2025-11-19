'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuthStore } from '@/lib/auth-store';

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    const isLoginPage = pathname === '/login';

    // 로그인 페이지에서 이미 로그인된 경우 대시보드로
    if (isLoginPage && isAuthenticated) {
      router.push('/');
      return;
    }

    // 로그인 안된 경우 로그인 페이지로
    if (!isLoginPage && !isAuthenticated) {
      router.push('/login');
      return;
    }

    // 체크 완료
    setIsChecking(false);
  }, [isAuthenticated, pathname, router]);

  const isLoginPage = pathname === '/login';

  // 로그인 페이지는 항상 표시
  if (isLoginPage) {
    return <>{children}</>;
  }

  // 체크 중이거나 로그인 안된 경우 로딩 표시
  if (isChecking || !isAuthenticated) {
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
