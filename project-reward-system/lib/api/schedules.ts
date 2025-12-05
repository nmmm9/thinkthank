import { supabase } from '@/lib/supabase/client';
import type { ScheduleInsert, ScheduleUpdate } from '@/lib/supabase/database.types';

// 스케줄 목록 조회 (프로젝트, 멤버 정보 포함)
export async function getSchedules() {
  const { data, error } = await supabase
    .from('schedules')
    .select(`
      *,
      project:projects(*),
      member:members(*)
    `)
    .order('date', { ascending: false })
    .limit(100000); // Supabase 기본 1000 제한 해제

  if (error) throw error;
  return data;
}

// 스케줄 생성
export async function createSchedule(schedule: ScheduleInsert) {
  const { error } = await (supabase
    .from('schedules') as any)
    .insert(schedule);

  if (error) {
    console.error('createSchedule error:', error);
    throw new Error(error.message || JSON.stringify(error));
  }
  return schedule;
}

// 스케줄 수정
export async function updateSchedule(id: string, updates: ScheduleUpdate) {
  const { error } = await (supabase
    .from('schedules') as any)
    .update(updates)
    .eq('id', id);

  if (error) throw error;
  return { id, ...updates };
}

// 스케줄 삭제
export async function deleteSchedule(id: string) {
  const { error } = await (supabase
    .from('schedules') as any)
    .delete()
    .eq('id', id);

  if (error) throw error;
}
