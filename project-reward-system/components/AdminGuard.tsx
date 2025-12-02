'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useAuthStore } from '@/lib/auth-store';

interface AdminGuardProps {
  children: React.ReactNode;
}

export default function AdminGuard({ children }: AdminGuardProps) {
  const router = useRouter();
  const { member, isAuthenticated } = useAuthStore();
  const isAdmin = member?.role === 'admin';

  useEffect(() => {
    // 로그인했지만 admin이 아니면 대시보드로 리디렉션
    if (isAuthenticated && !isAdmin) {
      router.push('/');
    }
  }, [isAuthenticated, isAdmin, router]);

  // admin이 아니면 아무것도 표시하지 않음
  if (!isAdmin) {
    return null;
  }

  return <>{children}</>;
}
