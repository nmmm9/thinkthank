import { supabase } from '@/lib/supabase/client';
import type { ScheduleInsert, ScheduleUpdate } from '@/lib/supabase/database.types';

// 스케줄 목록 조회 (프로젝트, 멤버 정보 포함)
// Supabase Max Rows 제한 우회를 위해 페이지네이션 사용
export async function getSchedules() {
  const allData: any[] = [];
  const pageSize = 1000;
  let page = 0;
  let hasMore = true;

  while (hasMore) {
    const from = page * pageSize;
    const to = from + pageSize - 1;

    const { data, error } = await supabase
      .from('schedules')
      .select(`
        *,
        project:projects(*),
        member:members(*)
      `)
      .order('date', { ascending: false })
      .range(from, to);

    if (error) throw error;

    if (data && data.length > 0) {
      allData.push(...data);
      page++;
      // 가져온 데이터가 pageSize보다 적으면 더 이상 없음
      if (data.length < pageSize) {
        hasMore = false;
      }
    } else {
      hasMore = false;
    }
  }

  return allData;
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
