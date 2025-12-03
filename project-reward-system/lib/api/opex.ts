import { supabase } from '@/lib/supabase/client';
import type { Database } from '@/lib/supabase/database.types';

type OpexInsert = Database['public']['Tables']['opex']['Insert'];
type OpexUpdate = Database['public']['Tables']['opex']['Update'];

// 운영비 목록 조회
export async function getOpexList() {
  const { data, error } = await supabase
    .from('opex')
    .select('*')
    .order('year_month', { ascending: false });

  if (error) throw error;
  return data;
}

// 특정 월 운영비 조회
export async function getOpexByMonth(yearMonth: string) {
  const { data, error } = await supabase
    .from('opex')
    .select('*')
    .eq('year_month', yearMonth)
    .single();

  if (error && error.code !== 'PGRST116') throw error; // PGRST116 = no rows
  return data;
}

// 기간별 운영비 조회
export async function getOpexByDateRange(startYearMonth: string, endYearMonth: string) {
  const { data, error } = await supabase
    .from('opex')
    .select('*')
    .gte('year_month', startYearMonth)
    .lte('year_month', endYearMonth)
    .order('year_month');

  if (error) throw error;
  return data;
}

// 운영비 생성
export async function createOpex(opex: OpexInsert) {
  const { error } = await (supabase
    .from('opex') as any)
    .insert(opex);

  if (error) throw error;
  return opex;
}

// 운영비 수정
export async function updateOpex(id: string, updates: OpexUpdate) {
  console.log('updateOpex called with:', { id, updates });

  const { data, error } = await (supabase
    .from('opex') as any)
    .update(updates)
    .eq('id', id)
    .select();

  console.log('updateOpex result:', { data, error });

  if (error) {
    console.error('updateOpex error details:', JSON.stringify(error, null, 2));
    throw new Error(error.message || 'Failed to update opex');
  }

  // 업데이트된 행이 없으면 에러
  if (!data || data.length === 0) {
    throw new Error('업데이트 권한이 없거나 해당 데이터를 찾을 수 없습니다.');
  }

  return data[0];
}

// 운영비 삭제
export async function deleteOpex(id: string) {
  const { error } = await (supabase
    .from('opex') as any)
    .delete()
    .eq('id', id);

  if (error) throw error;
}

// 운영비 upsert (없으면 생성, 있으면 수정)
export async function upsertOpex(opex: OpexInsert) {
  const { error } = await (supabase
    .from('opex') as any)
    .upsert(opex, { onConflict: 'org_id,year_month' });

  if (error) throw error;
  return opex;
}
