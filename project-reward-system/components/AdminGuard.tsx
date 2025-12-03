'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useAuthStore } from '@/lib/auth-store';

interface AdminGuardProps {
  children: React.ReactNode;
}

export default function AdminGuard({ children }: AdminGuardProps) {
  const router = useRouter();
  const { member, isAuthenticated, isLoading } = useAuthStore();
  const isAdmin = member?.role === 'admin';

  useEffect(() => {
    // 로딩 중이면 대기
    if (isLoading) return;

    // 로그인하지 않았으면 로그인 페이지로
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }

    // 로그인했지만 admin이 아니면 대시보드로 리디렉션
    if (!isAdmin) {
      alert('총괄관리자만 접근할 수 있습니다.');
      router.push('/');
    }
  }, [isAuthenticated, isAdmin, isLoading, router]);

  // 로딩 중
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  // admin이 아니면 아무것도 표시하지 않음
  if (!isAuthenticated || !isAdmin) {
    return null;
  }

  return <>{children}</>;
}
