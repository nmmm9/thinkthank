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
  ChevronDown,
  Settings,
  Building2,
  Wallet,
  Clock,
  MoreHorizontal,
  UserCheck,
} from 'lucide-react';
import { useAuthStore } from '@/lib/auth-store';
import { useSidebarStore } from '@/lib/sidebar-store';

const Sidebar = () => {
  const pathname = usePathname();
  const router = useRouter();
  const { member, logout } = useAuthStore();
  const { isCollapsed, toggleSidebar } = useSidebarStore();
  const [isClient, setIsClient] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  useEffect(() => {
    setIsClient(true);
    // 설정 페이지에 있으면 서브메뉴 열기
    if (pathname.startsWith('/settings')) {
      setIsSettingsOpen(true);
    }
  }, [pathname]);

  const handleLogout = async () => {
    await logout();
    router.push('/login');
  };

  const mainMenuItems = [
    { href: '/', label: '대시보드', icon: Home },
    { href: '/schedules', label: '스케줄', icon: Calendar },
    { href: '/projects', label: '프로젝트', icon: FolderOpen },
    { href: '/settlement', label: '정산', icon: Receipt },
    { href: '/performance', label: '성과', icon: TrendingUp },
  ];

  // 총괄관리자 전용 메뉴
  const adminMenuItems = [
    { href: '/admin/member-performance', label: '직원별 성과', icon: UserCheck },
  ];

  // 설정 서브메뉴 (관리자만 전체 표시)
  const settingsMenuItems = [
    { href: '/settings/members', label: '팀원 관리', icon: Users },
    { href: '/settings/org', label: '팀/직급', icon: Building2 },
    { href: '/settings/opex', label: '운영비', icon: Wallet },
    { href: '/settings/worktime', label: '휴일/근로시간', icon: Clock },
    { href: '/settings/misc', label: '기타설정', icon: MoreHorizontal },
  ];

  // 관리자 여부 확인 (admin 또는 manager 모두 설정 메뉴 접근 가능)
  const isAdminOrManager = member?.role === 'admin' || member?.role === 'manager';
  // 총괄관리자 여부 (admin만)
  const isFullAdmin = member?.role === 'admin';

  const isActive = (href: string) => {
    if (href === '/') {
      return pathname === '/' || pathname === '/thinkthank' || pathname === '/thinkthank/';
    }
    return pathname.includes(href);
  };

  // member에서 팀 정보 가져오기
  const userTeam = member?.team;

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
      {isClient && member && !isCollapsed && (
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0">
              <span className="text-white text-lg font-medium">
                {member.name?.charAt(0) || '?'}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-900">
                안녕하세요 {member.name}님
              </p>
            </div>
          </div>
          <div className="space-y-1">
            <p className="text-sm font-medium text-gray-900">
              {member.organization?.name || 'CO.UP'}
            </p>
            <p className="text-xs text-gray-500">
              {userTeam?.name || '팀 미지정'}
            </p>
          </div>
        </div>
      )}

      {/* 유저 아바타만 (축소 모드) */}
      {isClient && member && isCollapsed && (
        <div className="p-3 border-b border-gray-200 flex justify-center">
          <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center">
            <span className="text-white text-lg font-medium">
              {member.name?.charAt(0) || '?'}
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

          {/* 총괄관리자 전용 메뉴 */}
          {isFullAdmin && adminMenuItems.map((item) => {
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
                      ? 'bg-purple-50 text-purple-600 font-medium'
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

          {/* 설정 메뉴 (관리자용 - 서브메뉴 포함) */}
          {isAdminOrManager && (
            <li>
              <button
                onClick={() => !isCollapsed && setIsSettingsOpen(!isSettingsOpen)}
                className={`flex items-center w-full ${
                  isCollapsed ? 'justify-center' : 'justify-between'
                } px-4 py-3 rounded-lg transition-colors ${
                  pathname.startsWith('/settings')
                    ? 'bg-blue-50 text-blue-600 font-medium'
                    : 'text-gray-700 hover:bg-gray-50'
                }`}
                title={isCollapsed ? '설정' : undefined}
              >
                <div className={`flex items-center ${isCollapsed ? '' : 'gap-3'}`}>
                  <Settings className="w-5 h-5 flex-shrink-0" />
                  {!isCollapsed && <span className="text-sm">설정</span>}
                </div>
                {!isCollapsed && (
                  <ChevronDown
                    className={`w-4 h-4 transition-transform ${
                      isSettingsOpen ? 'rotate-180' : ''
                    }`}
                  />
                )}
              </button>

              {/* 설정 서브메뉴 */}
              {!isCollapsed && isSettingsOpen && (
                <ul className="mt-1 ml-4 space-y-1">
                  {settingsMenuItems.map((item) => {
                    const Icon = item.icon;
                    const active = pathname === item.href;
                    return (
                      <li key={item.href}>
                        <Link
                          href={item.href}
                          className={`flex items-center gap-3 px-4 py-2 rounded-lg transition-colors text-sm ${
                            active
                              ? 'bg-blue-50 text-blue-600 font-medium'
                              : 'text-gray-600 hover:bg-gray-50'
                          }`}
                        >
                          <Icon className="w-4 h-4 flex-shrink-0" />
                          <span>{item.label}</span>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              )}
            </li>
          )}

        </ul>
      </nav>

      {/* 로그아웃 */}
      {isClient && member && (
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
