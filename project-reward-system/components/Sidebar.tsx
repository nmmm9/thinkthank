'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import {
  Home,
  Calendar,
  FolderOpen,
  Receipt,
  TrendingUp,
  Users,
  LogOut,
  ChevronLeft,
} from 'lucide-react';
import { useAuthStore } from '@/lib/auth-store';
import { useSidebarStore } from '@/lib/sidebar-store';
import { teams, positions } from '@/mocks/data';

const Sidebar = () => {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuthStore();
  const { isCollapsed, toggleSidebar } = useSidebarStore();
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  const mainMenuItems = [
    { href: '/', label: '대시보드', icon: Home },
    { href: '/schedules', label: '스케줄', icon: Calendar },
    { href: '/projects', label: '프로젝트', icon: FolderOpen },
    { href: '/settlement', label: '정산', icon: Receipt },
    { href: '/performance', label: '성과', icon: TrendingUp },
  ];

  const isActive = (href: string) => {
    if (href === '/') {
      return pathname === '/';
    }
    return pathname.startsWith(href);
  };

  const userTeam = user ? teams.find((t) => t.id === user.teamId) : null;
  const userPosition = user ? positions.find((p) => p.id === user.positionId) : null;

  return (
    <aside
      className={`${
        isCollapsed ? 'w-20' : 'w-64'
      } bg-white border-r border-gray-200 h-screen fixed left-0 top-0 flex flex-col shadow-sm transition-all duration-300`}
    >
      {/* 헤더 */}
      <div className="p-6 border-b border-gray-200 flex items-center justify-between">
        {!isCollapsed && <h1 className="text-2xl font-bold text-gray-900">CO.UP</h1>}
        {isCollapsed && <h1 className="text-2xl font-bold text-gray-900">C</h1>}
        <button
          onClick={toggleSidebar}
          className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ChevronLeft
            className={`w-5 h-5 text-gray-600 transition-transform duration-300 ${
              isCollapsed ? 'rotate-180' : ''
            }`}
          />
        </button>
      </div>

      {/* 유저 프로필 */}
      {isClient && user && !isCollapsed && (
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0">
              <span className="text-white text-lg font-medium">
                {user.name.charAt(0)}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-900">
                안녕하세요 {user.name}님
              </p>
            </div>
          </div>
          <div className="space-y-1">
            <p className="text-sm font-medium text-gray-900">ABC Company</p>
            <p className="text-xs text-gray-500">
              {userTeam?.name || '브랜드 디자인팀'} | {userPosition?.name || '사원'}
            </p>
          </div>
        </div>
      )}

      {/* 유저 아바타만 (축소 모드) */}
      {isClient && user && isCollapsed && (
        <div className="p-3 border-b border-gray-200 flex justify-center">
          <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center">
            <span className="text-white text-lg font-medium">
              {user.name.charAt(0)}
            </span>
          </div>
        </div>
      )}

      {/* 메뉴 */}
      <nav className="flex-1 py-4 px-3 overflow-y-auto">
        <ul className="space-y-1">
          {mainMenuItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href);
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={`flex items-center ${
                    isCollapsed ? 'justify-center' : 'gap-3'
                  } px-4 py-3 rounded-lg transition-colors ${
                    active
                      ? 'bg-blue-50 text-blue-600 font-medium'
                      : 'text-gray-700 hover:bg-gray-50'
                  }`}
                  title={isCollapsed ? item.label : undefined}
                >
                  <Icon className="w-5 h-5 flex-shrink-0" />
                  {!isCollapsed && <span className="text-sm">{item.label}</span>}
                </Link>
              </li>
            );
          })}

          {/* 팀원 (설정 포함) */}
          <li>
            <Link
              href="/settings/members"
              className={`flex items-center ${
                isCollapsed ? 'justify-center' : 'gap-3'
              } px-4 py-3 rounded-lg transition-colors ${
                pathname.startsWith('/settings')
                  ? 'bg-blue-50 text-blue-600 font-medium'
                  : 'text-gray-700 hover:bg-gray-50'
              }`}
              title={isCollapsed ? '팀원' : undefined}
            >
              <Users className="w-5 h-5 flex-shrink-0" />
              {!isCollapsed && <span className="text-sm">팀원</span>}
            </Link>
          </li>
        </ul>
      </nav>

      {/* 로그아웃 */}
      {isClient && user && (
        <div className="p-4 border-t border-gray-200">
          <button
            onClick={handleLogout}
            className={`flex items-center ${
              isCollapsed ? 'justify-center' : 'gap-3'
            } px-4 py-3 rounded-lg w-full text-gray-700 hover:bg-red-50 hover:text-red-600 transition-colors`}
            title={isCollapsed ? '로그아웃' : undefined}
          >
            <LogOut className="w-5 h-5 flex-shrink-0" />
            {!isCollapsed && <span className="text-sm font-medium">로그아웃</span>}
          </button>
        </div>
      )}
    </aside>
  );
};

export default Sidebar;
