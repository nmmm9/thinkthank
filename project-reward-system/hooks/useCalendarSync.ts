'use client';

import { useEffect, useRef, useCallback, useState } from 'react';
import { useAuthStore } from '@/lib/auth-store';
import { supabase } from '@/lib/supabase/client';
import { getCalendarSyncSettings } from '@/lib/api/calendar-sync';

interface UseCalendarSyncOptions {
  onSyncComplete?: () => void;
  autoSyncInterval?: number; // 밀리초 (기본 5분)
}

interface HistorySyncProgress {
  isRunning: boolean;
  currentPeriod: string; // "2024년 3월" 형식
  totalMonths: number;
  completedMonths: number;
  totalEvents: number;
  error?: string;
  failedMonths?: string[]; // 실패한 월 목록
}

export function useCalendarSync(options: UseCalendarSyncOptions = {}) {
  const { member, user } = useAuthStore();
  const { onSyncComplete, autoSyncInterval = 5 * 60 * 1000 } = options;

  const syncSettingsRef = useRef<any>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const isSyncingRef = useRef(false);
  const [historySyncProgress, setHistorySyncProgress] = useState<HistorySyncProgress | null>(null);

  // Google 로그인 여부
  const isGoogleUser = user?.app_metadata?.provider === 'google';

  // 동기화 설정 로드
  const loadSyncSettings = useCallback(async () => {
    if (!member?.id || !isGoogleUser) return null;

    try {
      const settings = await getCalendarSyncSettings(member.id);
      syncSettingsRef.current = settings;
      return settings;
    } catch (error) {
      console.error('Failed to load sync settings:', error);
      return null;
    }
  }, [member?.id, isGoogleUser]);

  // 전체 동기화 실행
  const syncCalendar = useCallback(async () => {
    if (!member?.id || !isGoogleUser || isSyncingRef.current) return;

    const settings = syncSettingsRef.current || await loadSyncSettings();
    if (!settings?.is_enabled || !settings?.google_calendar_id) return;

    try {
      isSyncingRef.current = true;

      const { data: { session } } = await supabase.auth.getSession();
      const accessToken = session?.provider_token;

      if (!accessToken) {
        // Google 세션이 만료되었거나 토큰이 없는 경우 조용히 반환
        return;
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
        console.error('Sync error:', data.error);
        return;
      }

      console.log('Calendar synced:', data.stats);
      onSyncComplete?.();
    } catch (error) {
      console.error('Calendar sync failed:', error);
    } finally {
      isSyncingRef.current = false;
    }
  }, [member?.id, isGoogleUser, loadSyncSettings, onSyncComplete]);

  // 개별 스케줄 동기화 (생성/수정/삭제)
  const syncSchedule = useCallback(async (
    action: 'create' | 'update' | 'delete',
    scheduleData: {
      id: string;
      date: string;
      start_time?: string;
      end_time?: string;
      description?: string;
      minutes: number;
      project_id?: string;
      google_event_id?: string;
    },
    projectName?: string
  ) => {
    if (!member?.id || !isGoogleUser) return;

    const settings = syncSettingsRef.current || await loadSyncSettings();
    if (!settings?.is_enabled || !settings?.google_calendar_id) return;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const accessToken = session?.provider_token;

      if (!accessToken) {
        // Google 세션이 만료되었거나 토큰이 없는 경우 조용히 반환
        return;
      }

      const response = await fetch('/api/calendar/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          memberId: member.id,
          accessToken,
          calendarId: settings.google_calendar_id,
          action,
          scheduleData: {
            ...scheduleData,
            projectName: projectName || '기타',
            projectId: scheduleData.project_id,
          },
        }),
      });

      const data = await response.json();

      if (data.error) {
        console.error('Schedule sync error:', data.error);
      } else {
        console.log(`Schedule ${action}d to Google Calendar`);
      }

      return data;
    } catch (error) {
      console.error('Schedule sync failed:', error);
    }
  }, [member?.id, isGoogleUser, loadSyncSettings]);

  // 페이지 로드 시 동기화 설정 로드 (초기 1회만)
  const initializedRef = useRef(false);
  useEffect(() => {
    if (!member?.id || !isGoogleUser || initializedRef.current) return;
    initializedRef.current = true;

    const init = async () => {
      await loadSyncSettings();
      // 초기 동기화는 수동으로만 (자동 동기화 제거)
    };

    init();
  }, [member?.id, isGoogleUser]); // loadSyncSettings, syncCalendar 의존성 제거

  // 주기적 동기화 제거 - 수동 동기화만 사용
  // (과부하 방지 + 불필요한 API 호출 감소)

  // 전체 히스토리 동기화 (월별 청크로 처리, 월당 최대 1000개)
  // startYear, startMonth: 동기화 시작 년월 (예: 2020, 1 = 2020년 1월부터)
  const syncHistory = useCallback(async (startYear: number, startMonth: number) => {
    if (!member?.id || !isGoogleUser || historySyncProgress?.isRunning) return;

    const settings = syncSettingsRef.current || await loadSyncSettings();
    if (!settings?.is_enabled || !settings?.google_calendar_id) return;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const accessToken = session?.provider_token;

      if (!accessToken) {
        setHistorySyncProgress({
          isRunning: false,
          currentPeriod: '',
          totalMonths: 0,
          completedMonths: 0,
          totalEvents: 0,
          error: 'Google 인증이 필요합니다. 다시 로그인해주세요.',
        });
        return;
      }

      const now = new Date();
      const startDate = new Date(startYear, startMonth - 1, 1); // startMonth는 1-12

      // 월 단위 청크 생성 (최신 → 과거 순서)
      const months: { year: number; month: number }[] = [];

      // 3개월 후까지 포함
      for (let i = 3; i >= 1; i--) {
        const futureDate = new Date(now.getFullYear(), now.getMonth() + i, 1);
        months.push({ year: futureDate.getFullYear(), month: futureDate.getMonth() });
      }

      // 현재부터 시작일까지
      let current = new Date(now.getFullYear(), now.getMonth(), 1);
      while (current >= startDate) {
        months.push({ year: current.getFullYear(), month: current.getMonth() });
        current = new Date(current.getFullYear(), current.getMonth() - 1, 1);
      }

      const totalMonths = months.length;
      let totalEvents = 0;
      let completedMonths = 0;
      const failedMonths: string[] = [];

      setHistorySyncProgress({
        isRunning: true,
        currentPeriod: '',
        totalMonths,
        completedMonths: 0,
        totalEvents: 0,
        failedMonths: [],
      });

      console.log(`[HistorySync] Starting sync for ${months.length} months`);

      // 월별로 동기화
      for (let i = 0; i < months.length; i++) {
        const { year, month } = months[i];
        // 시작일: 해당 월 1일
        const startStr = `${year}-${String(month + 1).padStart(2, '0')}-01`;
        // 종료일: 다음 월 1일 (timeMax는 exclusive라서 다음 달 1일로 설정해야 해당 월 전체 포함)
        const nextMonth = month + 1;
        const nextYear = nextMonth > 11 ? year + 1 : year;
        const actualNextMonth = nextMonth > 11 ? 0 : nextMonth;
        const endStr = `${nextYear}-${String(actualNextMonth + 1).padStart(2, '0')}-01`;
        const periodStr = `${year}년 ${month + 1}월`;

        console.log(`[HistorySync] Processing ${i + 1}/${months.length}: ${periodStr} (${startStr} ~ ${endStr})`);

        setHistorySyncProgress((prev) => ({
          ...prev!,
          currentPeriod: periodStr,
          completedMonths,
          failedMonths: [...failedMonths],
        }));

        try {
          const response = await fetch('/api/calendar/sync', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              memberId: member.id,
              accessToken,
              calendarId: settings.google_calendar_id,
              syncOptions: {
                startDate: startStr,
                endDate: endStr,
                isHistorySync: completedMonths > 3, // 미래 3개월 이후는 히스토리 모드
              },
            }),
          });

          console.log(`[HistorySync] ${periodStr}: Response status ${response.status}`);

          // 응답이 성공적이지 않으면 에러 처리
          if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
          }

          const data = await response.json();
          console.log(`[HistorySync] ${periodStr}: Data received`, data.stats);

          if (data.error) {
            console.error(`[HistorySync] Sync error for ${periodStr}:`, data.error);
            failedMonths.push(`${periodStr} (${data.error})`);
          } else {
            // fetched (가져온 수) 카운트
            const fetched = data.stats?.fetched || 0;
            const created = data.stats?.created || 0;
            totalEvents += fetched;
            console.log(`[HistorySync] ${periodStr}: ${fetched}개 가져옴, ${created}개 생성`);
          }
        } catch (fetchError: any) {
          // 네트워크 오류, 타임아웃, JSON 파싱 오류 등
          console.error(`[HistorySync] Failed to sync ${periodStr}:`, fetchError);
          failedMonths.push(`${periodStr} (${fetchError.message || '연결 오류'})`);
          // 계속 다음 월 진행
        }

        completedMonths++;

        setHistorySyncProgress((prev) => ({
          ...prev!,
          completedMonths,
          totalEvents,
          failedMonths: [...failedMonths],
        }));

        // API 제한 방지 (100ms 대기)
        await new Promise((resolve) => setTimeout(resolve, 100));
      }

      console.log(`[HistorySync] Completed! Total: ${totalEvents} events, Failed months: ${failedMonths.length}`);

      setHistorySyncProgress({
        isRunning: false,
        currentPeriod: '완료',
        totalMonths,
        completedMonths: totalMonths,
        totalEvents,
        failedMonths: failedMonths.length > 0 ? failedMonths : undefined,
      });

      onSyncComplete?.();
    } catch (error: any) {
      console.error('[HistorySync] Fatal error:', error);
      setHistorySyncProgress((prev) => ({
        ...prev!,
        isRunning: false,
        error: error.message || '동기화 중 오류가 발생했습니다.',
      }));
    }
  }, [member?.id, isGoogleUser, historySyncProgress?.isRunning, loadSyncSettings, onSyncComplete]);

  return {
    syncCalendar,
    syncSchedule,
    syncHistory,
    loadSyncSettings,
    isGoogleUser,
    historySyncProgress,
  };
}
