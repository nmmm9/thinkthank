import { supabase } from '@/lib/supabase/client';
import type { Database } from '@/lib/supabase/database.types';

type HolidayInsert = Database['public']['Tables']['holidays']['Insert'];
type HolidayUpdate = Database['public']['Tables']['holidays']['Update'];

// 휴일 목록 조회
export async function getHolidays() {
  const { data, error } = await supabase
    .from('holidays')
    .select('*')
    .order('date');

  if (error) throw error;
  return data;
}

// 연도별 휴일 조회
export async function getHolidaysByYear(year: number) {
  const startDate = `${year}-01-01`;
  const endDate = `${year}-12-31`;

  const { data, error } = await supabase
    .from('holidays')
    .select('*')
    .gte('date', startDate)
    .lte('date', endDate)
    .order('date');

  if (error) throw error;
  return data;
}

// 기간별 휴일 조회
export async function getHolidaysByDateRange(startDate: string, endDate: string) {
  const { data, error } = await supabase
    .from('holidays')
    .select('*')
    .gte('date', startDate)
    .lte('date', endDate)
    .order('date');

  if (error) throw error;
  return data;
}

// 특정 날짜가 휴일인지 확인
export async function isHoliday(date: string) {
  const { data, error } = await supabase
    .from('holidays')
    .select('id')
    .eq('date', date)
    .single();

  if (error && error.code !== 'PGRST116') throw error;
  return !!data;
}

// 휴일 생성
export async function createHoliday(holiday: HolidayInsert) {
  const { data, error } = await supabase
    .from('holidays')
    .insert(holiday)
    .select()
    .single();

  if (error) throw error;
  return data;
}

// 휴일 수정
export async function updateHoliday(id: string, updates: HolidayUpdate) {
  const { data, error } = await supabase
    .from('holidays')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

// 휴일 삭제
export async function deleteHoliday(id: string) {
  const { error } = await supabase
    .from('holidays')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

// 휴일 일괄 추가 (공휴일 자동 등록 등)
export async function createHolidaysBulk(holidays: HolidayInsert[]) {
  const { data, error } = await supabase
    .from('holidays')
    .upsert(holidays, { onConflict: 'org_id,date' })
    .select();

  if (error) throw error;
  return data;
}
