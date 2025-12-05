'use client';

import { useState, useEffect } from 'react';
import { Calendar, RefreshCw, Link2, Unlink, Check, AlertCircle, History } from 'lucide-react';
import { useAuthStore } from '@/lib/auth-store';
import { supabase } from '@/lib/supabase/client';
import { useCalendarSync } from '@/hooks/useCalendarSync';

interface CalendarSyncSettings {
  id: string;
  member_id: string;
  is_enabled: boolean;
  google_calendar_id: string | null;
  last_sync_at: string | null;
}

interface GoogleCalendar {
  id: string;
  summary: string;
  primary?: boolean;
}

export default function GoogleCalendarSync({ onSyncComplete }: { onSyncComplete?: () => void }) {
  const { member, user } = useAuthStore();
  const [settings, setSettings] = useState<CalendarSyncSettings | null>(null);
  const [calendars, setCalendars] = useState<GoogleCalendar[]>([]);
  const [selectedCalendarId, setSelectedCalendarId] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isEnabling, setIsEnabling] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [syncStartYear, setSyncStartYear] = useState<number>(new Date().getFullYear() - 1);
  const [syncStartMonth, setSyncStartMonth] = useState<number>(1); // 1-12

  // Google 로그인 여부 확인
  const isGoogleUser = user?.app_metadata?.provider === 'google';

  // 히스토리 동기화 훅
  const { syncHistory, historySyncProgress } = useCalendarSync({ onSyncComplete });

  // 설정 및 캘린더 목록 로드
  useEffect(() => {
    const loadData = async () => {
      if (!member?.id || !isGoogleUser) {
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        setError(null);

        // 세션에서 access_token 가져오기
        const { data: { session } } = await supabase.auth.getSession();
        const accessToken = session?.provider_token;

        const params = new URLSearchParams({ memberId: member.id });
        if (accessToken) {
          params.append('accessToken', accessToken);
        }

        const response = await fetch(`/api/calendar/settings?${params}`);
        const data = await response.json();

        if (data.error) {
          throw new Error(data.error);
        }

        setSettings(data.settings);
        setCalendars(data.calendars || []);

        if (data.settings?.google_calendar_id) {
          setSelectedCalendarId(data.settings.google_calendar_id);
        } else if (data.calendars?.length > 0) {
          const primaryCalendar = data.calendars.find((c: GoogleCalendar) => c.primary);
          setSelectedCalendarId(primaryCalendar?.id || data.calendars[0].id);
        }
      } catch (err: any) {
        console.error('Failed to load calendar settings:', err);
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [member?.id, isGoogleUser]);

  // 캘린더 연동 활성화
  const handleEnable = async () => {
    if (!member?.id || !selectedCalendarId) return;

    try {
      setIsEnabling(true);
      setError(null);

      const response = await fetch('/api/calendar/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          memberId: member.id,
          calendarId: selectedCalendarId,
        }),
      });

      const data = await response.json();

      if (data.error) {
        throw new Error(data.error);
      }

      setSettings(data.settings);
      setSuccessMessage('캘린더 연동이 활성화되었습니다. 동기화를 시작합니다...');

      // 선택한 시작 년월로 히스토리 동기화 실행
      setTimeout(() => {
        syncHistory(syncStartYear, syncStartMonth);
      }, 500);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsEnabling(false);
    }
  };

  // 캘린더 연동 해제
  const handleDisable = async () => {
    if (!member?.id) return;

    if (!confirm('캘린더 연동을 해제하시겠습니까?\n기존 동기화 정보가 삭제됩니다.')) return;

    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch(`/api/calendar/settings?memberId=${member.id}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (data.error) {
        throw new Error(data.error);
      }

      setSettings(null);
      setSuccessMessage('캘린더 연동이 해제되었습니다.');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  // 수동 동기화
  const handleSync = async () => {
    if (!member?.id || !settings?.google_calendar_id) return;

    try {
      setIsSyncing(true);
      setError(null);

      const { data: { session } } = await supabase.auth.getSession();
      const accessToken = session?.provider_token;

      if (!accessToken) {
        throw new Error('Google 인증이 필요합니다. 다시 로그인해주세요.');
      }

      const response = await fetch('/api/calendar/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          memberId: member.id,
          accessToken,
          calendarId: settings.google_calendar_id,
        }),
      });

      const data = await response.json();

      if (data.error) {
        throw new Error(data.error);
      }

      setSuccessMessage(
        `동기화 완료! (가져옴: ${data.stats.created}, 업데이트: ${data.stats.updated}, 삭제: ${data.stats.deleted})`
      );

      // 설정 새로고침
      const settingsResponse = await fetch(`/api/calendar/settings?memberId=${member.id}`);
      const settingsData = await settingsResponse.json();
      if (settingsData.settings) {
        setSettings(settingsData.settings);
      }

      // 콜백 호출
      onSyncComplete?.();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSyncing(false);
    }
  };

  // 메시지 자동 제거
  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => setSuccessMessage(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [successMessage]);

  if (!isGoogleUser) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
        <div className="flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-yellow-600" />
          <div>
            <p className="text-sm font-medium text-yellow-800">Google 로그인 필요</p>
            <p className="text-xs text-yellow-600 mt-1">
              Google Calendar 연동은 Google 계정으로 로그인한 사용자만 가능합니다.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center justify-center py-4">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      </div>
    );
  }

  // 캘린더 이름 축약 (너무 길면 자르기)
  const getShortCalendarName = (name: string) => {
    if (name.length > 20) {
      return name.substring(0, 18) + '...';
    }
    return name;
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      {/* 컴팩트 헤더 */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 px-4 py-3 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-blue-600" />
          <span className="text-sm font-medium text-gray-900">Google Calendar</span>
        </div>
      </div>

      {/* 내용 */}
      <div className="p-3">
        {/* 에러 메시지 */}
        {error && (
          <div className="mb-2 bg-red-50 border border-red-200 rounded p-2 flex items-center gap-2">
            <AlertCircle className="w-3 h-3 text-red-600 flex-shrink-0" />
            <p className="text-xs text-red-700 truncate">{error}</p>
          </div>
        )}

        {/* 성공 메시지 */}
        {successMessage && (
          <div className="mb-2 bg-green-50 border border-green-200 rounded p-2 flex items-center gap-2">
            <Check className="w-3 h-3 text-green-600 flex-shrink-0" />
            <p className="text-xs text-green-700 truncate">{successMessage}</p>
          </div>
        )}

        {settings?.is_enabled ? (
          // 연동됨 상태
          <div className="space-y-2">
            <div className="flex items-center gap-2 bg-green-50 rounded p-2">
              <Check className="w-4 h-4 text-green-600 flex-shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium text-green-800">연동됨</p>
                <p className="text-xs text-green-600 truncate" title={calendars.find((c) => c.id === settings.google_calendar_id)?.summary || '캘린더'}>
                  {getShortCalendarName(calendars.find((c) => c.id === settings.google_calendar_id)?.summary || '캘린더')}
                </p>
              </div>
            </div>

            {settings.last_sync_at && (
              <p className="text-xs text-gray-400">
                최근: {new Date(settings.last_sync_at).toLocaleString('ko-KR', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
              </p>
            )}

            <div className="flex gap-2">
              <button
                onClick={handleSync}
                disabled={isSyncing || historySyncProgress?.isRunning}
                className="flex-1 flex items-center justify-center gap-1 px-3 py-1.5 bg-blue-600 text-white text-xs rounded hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                <RefreshCw className={`w-3 h-3 ${isSyncing ? 'animate-spin' : ''}`} />
                {isSyncing ? '동기화...' : '동기화'}
              </button>
              <button
                onClick={handleDisable}
                className="px-2 py-1.5 border border-gray-300 text-gray-500 rounded hover:bg-gray-50 transition-colors"
                title="연동 해제"
              >
                <Unlink className="w-3 h-3" />
              </button>
            </div>

            {/* 히스토리 동기화 */}
            <div className="mt-3 pt-3 border-t border-gray-100">
              <p className="text-xs text-gray-500 mb-2">과거 일정 전체 동기화</p>
              <div className="flex gap-2 items-center">
                <select
                  value={syncStartYear}
                  onChange={(e) => setSyncStartYear(Number(e.target.value))}
                  disabled={historySyncProgress?.isRunning}
                  className="flex-1 px-2 py-1.5 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-purple-500"
                >
                  {Array.from({ length: 15 }, (_, i) => new Date().getFullYear() - i).map((year) => (
                    <option key={year} value={year}>{year}년</option>
                  ))}
                </select>
                <select
                  value={syncStartMonth}
                  onChange={(e) => setSyncStartMonth(Number(e.target.value))}
                  disabled={historySyncProgress?.isRunning}
                  className="w-14 px-1 py-1.5 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-purple-500"
                >
                  {Array.from({ length: 12 }, (_, i) => i + 1).map((month) => (
                    <option key={month} value={month}>{month}월</option>
                  ))}
                </select>
                <button
                  onClick={() => syncHistory(syncStartYear, syncStartMonth)}
                  disabled={historySyncProgress?.isRunning || isSyncing}
                  className="flex items-center justify-center gap-1 px-3 py-1.5 bg-purple-600 text-white text-xs rounded hover:bg-purple-700 disabled:opacity-50 transition-colors"
                >
                  <History className={`w-3 h-3 ${historySyncProgress?.isRunning ? 'animate-spin' : ''}`} />
                  {historySyncProgress?.isRunning ? '진행중' : '시작'}
                </button>
              </div>

              {/* 진행 상태 표시 */}
              {historySyncProgress?.isRunning && (
                <div className="mt-2 bg-purple-50 rounded p-2">
                  <div className="flex justify-between text-xs text-purple-700 mb-1">
                    <span>{historySyncProgress.currentPeriod}</span>
                    <span>{historySyncProgress.completedMonths}/{historySyncProgress.totalMonths}</span>
                  </div>
                  <div className="w-full bg-purple-200 rounded-full h-1.5">
                    <div
                      className="bg-purple-600 h-1.5 rounded-full transition-all"
                      style={{ width: `${(historySyncProgress.completedMonths / historySyncProgress.totalMonths) * 100}%` }}
                    />
                  </div>
                  <p className="text-xs text-purple-600 mt-1">
                    {historySyncProgress.totalEvents.toLocaleString()}개 이벤트 처리됨
                  </p>
                </div>
              )}

              {/* 완료 메시지 */}
              {historySyncProgress && !historySyncProgress.isRunning && historySyncProgress.completedMonths > 0 && !historySyncProgress.error && (
                <div className="mt-2 bg-green-50 rounded p-2">
                  <p className="text-xs text-green-700">
                    완료! {historySyncProgress.totalEvents.toLocaleString()}개 이벤트 처리됨
                  </p>
                </div>
              )}

              {/* 에러 메시지 */}
              {historySyncProgress?.error && (
                <div className="mt-2 bg-red-50 rounded p-2">
                  <p className="text-xs text-red-700">{historySyncProgress.error}</p>
                </div>
              )}
            </div>
          </div>
        ) : (
          // 연동 안됨 상태
          <div className="space-y-2">
            <div className="flex items-center gap-2 bg-gray-50 rounded p-2">
              <Link2 className="w-4 h-4 text-gray-400" />
              <p className="text-xs text-gray-500">연동 안됨</p>
            </div>

            {calendars.length > 0 && (
              <>
                <select
                  value={selectedCalendarId}
                  onChange={(e) => setSelectedCalendarId(e.target.value)}
                  className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  {calendars.map((calendar) => (
                    <option key={calendar.id} value={calendar.id}>
                      {getShortCalendarName(calendar.summary)} {calendar.primary && '(기본)'}
                    </option>
                  ))}
                </select>

                {/* 동기화 시작 년월 선택 */}
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500 whitespace-nowrap">시작:</span>
                  <select
                    value={syncStartYear}
                    onChange={(e) => setSyncStartYear(Number(e.target.value))}
                    className="flex-1 px-2 py-1.5 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                  >
                    {Array.from({ length: 15 }, (_, i) => new Date().getFullYear() - i).map((year) => (
                      <option key={year} value={year}>{year}년</option>
                    ))}
                  </select>
                  <select
                    value={syncStartMonth}
                    onChange={(e) => setSyncStartMonth(Number(e.target.value))}
                    className="w-16 px-2 py-1.5 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                  >
                    {Array.from({ length: 12 }, (_, i) => i + 1).map((month) => (
                      <option key={month} value={month}>{month}월</option>
                    ))}
                  </select>
                </div>
              </>
            )}

            <button
              onClick={handleEnable}
              disabled={isEnabling || !selectedCalendarId || historySyncProgress?.isRunning}
              className="w-full flex items-center justify-center gap-1 px-3 py-1.5 bg-blue-600 text-white text-xs rounded hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              <Link2 className="w-3 h-3" />
              {isEnabling ? '연동 중...' : '연동하기'}
            </button>

            {/* 동기화 진행 상태 */}
            {historySyncProgress?.isRunning && (
              <div className="mt-2 bg-blue-50 rounded p-2">
                <div className="flex justify-between text-xs text-blue-700 mb-1">
                  <span>{historySyncProgress.currentPeriod}</span>
                  <span>{historySyncProgress.completedMonths}/{historySyncProgress.totalMonths}</span>
                </div>
                <div className="w-full bg-blue-200 rounded-full h-1.5">
                  <div
                    className="bg-blue-600 h-1.5 rounded-full transition-all"
                    style={{ width: `${(historySyncProgress.completedMonths / historySyncProgress.totalMonths) * 100}%` }}
                  />
                </div>
                <p className="text-xs text-blue-600 mt-1">
                  {historySyncProgress.totalEvents.toLocaleString()}개 이벤트 처리됨
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
