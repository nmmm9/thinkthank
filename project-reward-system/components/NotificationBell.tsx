'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Bell, MessageCircle, CheckCheck, Sparkles } from 'lucide-react';
import { useAuthStore } from '@/lib/auth-store';
import { getUnreadComments, markCommentAsRead, type PerformanceCommentWithRelations } from '@/lib/api';
import { formatDistanceToNow } from 'date-fns';
import { ko } from 'date-fns/locale';

export default function NotificationBell() {
  const router = useRouter();
  const { member } = useAuthStore();
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<PerformanceCommentWithRelations[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // 알림 로드
  const loadNotifications = async () => {
    if (!member?.id) return;

    try {
      setIsLoading(true);
      const data = await getUnreadComments(member.id);
      setNotifications(data);
    } catch (error) {
      console.error('알림 로드 실패:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // 초기 로드 및 주기적 새로고침
  useEffect(() => {
    loadNotifications();

    // 30초마다 새로고침
    const interval = setInterval(loadNotifications, 30000);
    return () => clearInterval(interval);
  }, [member?.id]);

  // 외부 클릭 시 드롭다운 닫기
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // 알림 클릭 - 읽음 처리 후 성과 페이지 코멘트 모달로 이동
  const handleNotificationClick = async (notification: PerformanceCommentWithRelations) => {
    try {
      await markCommentAsRead(notification.id, member?.id);
      setNotifications((prev) => prev.filter((n) => n.id !== notification.id));
      setIsOpen(false);
      // URL 파라미터로 프로젝트/멤버 정보 전달하여 모달 자동 열기
      router.push(`/performance?openComment=true&projectId=${notification.project_id}&memberId=${notification.member_id}&projectName=${encodeURIComponent(notification.project?.name || '')}&memberName=${encodeURIComponent(member?.name || '')}`);
    } catch (error) {
      console.error('읽음 처리 실패:', error);
    }
  };

  // 모든 알림 읽음 처리
  const handleMarkAllAsRead = async () => {
    if (!member?.id) return;
    try {
      await Promise.all(notifications.map((n) => markCommentAsRead(n.id, member.id)));
      setNotifications([]);
    } catch (error) {
      console.error('읽음 처리 실패:', error);
    }
  };

  const unreadCount = notifications.length;

  return (
    <div className="relative" ref={dropdownRef}>
      {/* 벨 아이콘 */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2.5 text-gray-500 hover:text-gray-700 hover:bg-white rounded-xl transition-all duration-200 shadow-sm hover:shadow-md border border-gray-200 hover:border-gray-300"
        title="알림"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[20px] h-5 bg-gradient-to-r from-red-500 to-pink-500 text-white text-xs font-bold rounded-full flex items-center justify-center px-1.5 shadow-lg shadow-red-500/30 animate-pulse">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* 드롭다운 */}
      {isOpen && (
        <div className="absolute right-0 mt-3 w-96 bg-white rounded-2xl shadow-2xl border border-gray-100 z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
          {/* 헤더 */}
          <div className="bg-gradient-to-r from-blue-600 via-blue-500 to-indigo-600 px-5 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-white">
                <Sparkles className="w-5 h-5" />
                <h3 className="font-bold text-lg">알림</h3>
                {unreadCount > 0 && (
                  <span className="bg-white/20 text-white text-xs px-2 py-0.5 rounded-full">
                    {unreadCount}개
                  </span>
                )}
              </div>
              {unreadCount > 0 && (
                <button
                  onClick={handleMarkAllAsRead}
                  className="flex items-center gap-1 text-sm text-white/80 hover:text-white transition-colors"
                >
                  <CheckCheck className="w-4 h-4" />
                  <span>모두 읽음</span>
                </button>
              )}
            </div>
          </div>

          {/* 알림 목록 */}
          <div className="max-h-[400px] overflow-y-auto">
            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-12">
                <div className="relative">
                  <div className="w-10 h-10 border-4 border-blue-200 rounded-full"></div>
                  <div className="absolute top-0 left-0 w-10 h-10 border-4 border-blue-600 rounded-full border-t-transparent animate-spin"></div>
                </div>
              </div>
            ) : notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 px-6">
                <div className="w-16 h-16 bg-gradient-to-br from-gray-100 to-gray-50 rounded-full flex items-center justify-center mb-4">
                  <Bell className="w-8 h-8 text-gray-300" />
                </div>
                <p className="text-gray-500 font-medium">새로운 알림이 없습니다</p>
                <p className="text-gray-400 text-sm mt-1">피드백이 도착하면 알려드릴게요</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {notifications.map((notification) => (
                  <div
                    key={notification.id}
                    onClick={() => handleNotificationClick(notification)}
                    className="px-5 py-4 hover:bg-gradient-to-r hover:from-blue-50 hover:to-indigo-50 cursor-pointer transition-all duration-200 group"
                  >
                    <div className="flex items-start gap-4">
                      <div className="relative flex-shrink-0">
                        <div className="w-11 h-11 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center text-white font-semibold shadow-lg shadow-blue-500/20">
                          {notification.author?.name?.charAt(0) || '?'}
                        </div>
                        <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-white rounded-full flex items-center justify-center shadow-sm">
                          <MessageCircle className="w-3 h-3 text-blue-600" />
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-gray-900">
                          <span className="font-semibold">{notification.author?.name}</span>
                          <span className="text-gray-600">님이 피드백을 남겼습니다</span>
                        </p>
                        <p className="text-sm text-gray-500 mt-1 truncate">
                          {notification.project?.name}
                        </p>
                        <p className="text-xs text-gray-400 mt-1.5">
                          {formatDistanceToNow(new Date(notification.created_at), {
                            addSuffix: true,
                            locale: ko,
                          })}
                        </p>
                      </div>
                      <div className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                        <span className="text-xs text-blue-600 font-medium">확인</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 푸터 */}
          {notifications.length > 0 && (
            <div className="border-t border-gray-100 bg-gray-50/50 px-5 py-3">
              <button
                onClick={() => {
                  setIsOpen(false);
                  router.push('/performance');
                }}
                className="w-full text-center text-sm text-blue-600 hover:text-blue-700 font-medium transition-colors"
              >
                성과 페이지에서 모두 확인
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
