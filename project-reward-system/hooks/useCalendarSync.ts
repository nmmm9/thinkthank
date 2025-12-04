'use client';

import { useEffect, useRef, useCallback } from 'react';
import { useAuthStore } from '@/lib/auth-store';
import { supabase } from '@/lib/supabase/client';
import { getCalendarSyncSettings } from '@/lib/api/calendar-sync';

interface UseCalendarSyncOptions {
  onSyncComplete?: () => void;
  autoSyncInterval?: number; // 밀리초 (기본 5분)
}

export function useCalendarSync(options: UseCalendarSyncOptions = {}) {
  const { member, user } = useAuthStore();
  const { onSyncComplete, autoSyncInterval = 5 * 60 * 1000 } = options;

  const syncSettingsRef = useRef<any>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const isSyncingRef = useRef(false);

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

  // 페이지 로드 시 동기화 설정 로드 및 초기 동기화
  useEffect(() => {
    if (!member?.id || !isGoogleUser) return;

    const init = async () => {
      await loadSyncSettings();
      // 초기 동기화
      await syncCalendar();
    };

    init();
  }, [member?.id, isGoogleUser, loadSyncSettings, syncCalendar]);

  // 주기적 동기화 (5분마다)
  useEffect(() => {
    if (!member?.id || !isGoogleUser) return;

    // 인터벌 설정
    intervalRef.current = setInterval(() => {
      syncCalendar();
    }, autoSyncInterval);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [member?.id, isGoogleUser, autoSyncInterval, syncCalendar]);

  return {
    syncCalendar,
    syncSchedule,
    loadSyncSettings,
    isGoogleUser,
  };
}
