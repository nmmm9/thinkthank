import { supabase } from '@/lib/supabase/client';

// 캘린더 동기화 설정 타입
export interface CalendarSyncSettings {
  id: string;
  member_id: string;
  is_enabled: boolean;
  google_calendar_id: string | null;
  last_sync_at: string | null;
  sync_token: string | null;
  created_at: string;
  updated_at: string;
}

// 동기화 설정 조회
export async function getCalendarSyncSettings(memberId: string): Promise<CalendarSyncSettings | null> {
  const { data, error } = await supabase
    .from('calendar_sync_settings')
    .select('*')
    .eq('member_id', memberId)
    .single();

  if (error && error.code !== 'PGRST116') throw error;
  return data;
}

// 동기화 설정 생성/수정
export async function upsertCalendarSyncSettings(
  memberId: string,
  settings: Partial<CalendarSyncSettings>
): Promise<CalendarSyncSettings> {
  const { data, error } = await (supabase
    .from('calendar_sync_settings') as any)
    .upsert({
      member_id: memberId,
      ...settings,
      updated_at: new Date().toISOString(),
    }, {
      onConflict: 'member_id',
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

// 동기화 설정 삭제 (연동 해제)
export async function deleteCalendarSyncSettings(memberId: string): Promise<void> {
  const { error } = await (supabase
    .from('calendar_sync_settings') as any)
    .delete()
    .eq('member_id', memberId);

  if (error) throw error;
}

// 스케줄에 google_event_id 업데이트
export async function updateScheduleGoogleEventId(
  scheduleId: string,
  googleEventId: string | null
): Promise<void> {
  const { error } = await (supabase
    .from('schedules') as any)
    .update({ google_event_id: googleEventId })
    .eq('id', scheduleId);

  if (error) throw error;
}

// google_event_id로 스케줄 조회
export async function getScheduleByGoogleEventId(googleEventId: string) {
  const { data, error } = await supabase
    .from('schedules')
    .select('*')
    .eq('google_event_id', googleEventId)
    .single();

  if (error && error.code !== 'PGRST116') throw error;
  return data;
}

// 미분류 스케줄 조회 (프로젝트 없는 스케줄)
export async function getUnclassifiedSchedules(memberId: string) {
  const { data, error } = await supabase
    .from('schedules')
    .select('*')
    .eq('member_id', memberId)
    .is('project_id', null)
    .order('date', { ascending: false });

  if (error) throw error;
  return data || [];
}

// 스케줄 프로젝트 지정
export async function assignProjectToSchedule(scheduleId: string, projectId: string): Promise<void> {
  const { error } = await (supabase
    .from('schedules') as any)
    .update({ project_id: projectId })
    .eq('id', scheduleId);

  if (error) throw error;
}
