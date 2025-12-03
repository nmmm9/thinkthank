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
    .order('date', { ascending: false });

  if (error) throw error;
  return data;
}

// 기간별 스케줄 조회
export async function getSchedulesByDateRange(startDate: string, endDate: string) {
  const { data, error } = await supabase
    .from('schedules')
    .select(`
      *,
      project:projects(*),
      member:members(*)
    `)
    .gte('date', startDate)
    .lte('date', endDate)
    .order('date');

  if (error) throw error;
  return data;
}

// 특정 날짜 스케줄 조회
export async function getSchedulesByDate(date: string) {
  const { data, error } = await supabase
    .from('schedules')
    .select(`
      *,
      project:projects(*),
      member:members(*)
    `)
    .eq('date', date)
    .order('member_id');

  if (error) throw error;
  return data;
}

// 멤버별 스케줄 조회
export async function getSchedulesByMember(memberId: string, startDate?: string, endDate?: string) {
  let query = supabase
    .from('schedules')
    .select(`
      *,
      project:projects(*)
    `)
    .eq('member_id', memberId);

  if (startDate) query = query.gte('date', startDate);
  if (endDate) query = query.lte('date', endDate);

  const { data, error } = await query.order('date');

  if (error) throw error;
  return data;
}

// 프로젝트별 스케줄 조회
export async function getSchedulesByProject(projectId: string) {
  const { data, error } = await supabase
    .from('schedules')
    .select(`
      *,
      member:members(*)
    `)
    .eq('project_id', projectId)
    .order('date');

  if (error) throw error;
  return data;
}

// 스케줄 생성
export async function createSchedule(schedule: ScheduleInsert) {
  const { data, error } = await supabase
    .from('schedules')
    .insert(schedule)
    .select()
    .single();

  if (error) {
    console.error('createSchedule error:', error);
    throw new Error(error.message || JSON.stringify(error));
  }
  return data;
}

// 스케줄 수정
export async function updateSchedule(id: string, updates: ScheduleUpdate) {
  const { data, error } = await supabase
    .from('schedules')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

// 스케줄 삭제
export async function deleteSchedule(id: string) {
  const { error } = await supabase
    .from('schedules')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

// 스케줄 일괄 저장 (upsert)
export async function upsertSchedules(schedules: ScheduleInsert[]) {
  const { data, error } = await supabase
    .from('schedules')
    .upsert(schedules, {
      onConflict: 'project_id,member_id,date',
    })
    .select();

  if (error) throw error;
  return data;
}

// 특정 날짜의 멤버 스케줄 삭제
export async function deleteScheduleByMemberDate(memberId: string, date: string) {
  const { error } = await supabase
    .from('schedules')
    .delete()
    .eq('member_id', memberId)
    .eq('date', date);

  if (error) throw error;
}
