'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/auth-store';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const router = useRouter();
  const { login, isAuthenticated, isLoading, error, clearError } = useAuthStore();

  // 이미 로그인된 경우 대시보드로 리다이렉트
  useEffect(() => {
    if (isAuthenticated) {
      router.push('/');
    }
  }, [isAuthenticated, router]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();

    const result = await login(email, password);

    if (result.success) {
      router.push('/');
    }
  };

  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* 로고 & 타이틀 */}
        <div className="text-center mb-8">
          <h1 className="text-5xl font-bold text-gray-900 mb-3">CO.UP</h1>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            에이전시 맞춤형 성과 측정 서비스
          </h2>
          <p className="text-xl font-semibold text-gray-900 mb-2">
            CO.UP에 오신 것을 환영합니다!
          </p>
          <p className="text-gray-600 text-sm">
            회원가입 후 팀관리자 또는 총관리자의
            <br />
            승인 후 시스템 사용이 가능합니다.
          </p>
        </div>

        {/* 로그인 폼 */}
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">로그인</h2>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                아이디
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="이메일 주소를 입력하세요"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                비밀번호
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="비밀번호를 입력하세요"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                required
              />
            </div>

            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
            >
              {isLoading ? (
                <span>로그인 중...</span>
              ) : (
                <>
                  <span>LOGIN</span>
                </>
              )}
            </button>
          </form>

          <div className="mt-4 text-center">
            <button className="text-sm text-gray-600 hover:text-gray-900">
              회원가입
            </button>
          </div>

          {/* 신규 입사자 로그인 */}
          <div className="mt-6">
            <button
              className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
              신규 입사자 (사원급) 로그인
            </button>
          </div>

          {/* 개발용 빠른 로그인 - 실제 DB 사용 시 제거 가능 */}
          <div className="mt-8 pt-6 border-t border-gray-200">
            <p className="text-xs text-gray-500 mb-3 text-center">빠른 로그인 (개발용)</p>
            <div className="grid grid-cols-3 gap-2">
              <button
                className="px-3 py-2 text-xs bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200 transition-colors"
              >
                CEO
              </button>
              <button
                className="px-3 py-2 text-xs bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors"
              >
                팀장
              </button>
              <button
                className="px-3 py-2 text-xs bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors"
              >
                일반사원
              </button>
            </div>
          </div>

          {/* 계정 안내 */}
          <div className="mt-6 p-4 bg-gray-50 rounded-lg">
            <p className="text-xs text-gray-600 mb-2 font-medium">테스트 계정:</p>
            <div className="space-y-1 text-xs text-gray-600">
              <div>• CEO: admin@rewarding.com</div>
              <div>• 팀장: ooo.think.jh@gmail.com</div>
              <div>• 일반사원: ooo.think.lhj@gmail.com</div>
            </div>
          </div>
        </div>

        <p className="text-center text-xs text-gray-500 mt-6">
          © 2025 Rewarding. All rights reserved.
        </p>
      </div>
    </div>
  );
}
