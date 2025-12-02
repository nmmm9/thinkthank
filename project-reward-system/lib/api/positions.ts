import { supabase } from '@/lib/supabase/client';
import type { PositionInsert, PositionUpdate } from '@/lib/supabase/database.types';

// 직급 목록 조회
export async function getPositions() {
  const { data, error } = await supabase
    .from('positions')
    .select('*')
    .order('sort_order');

  if (error) throw error;
  return data;
}

// 활성 직급 목록 조회
export async function getActivePositions() {
  const { data, error } = await supabase
    .from('positions')
    .select('*')
    .eq('is_active', true)
    .order('sort_order');

  if (error) throw error;
  return data;
}

// 단일 직급 조회
export async function getPosition(id: string) {
  const { data, error } = await supabase
    .from('positions')
    .select('*')
    .eq('id', id)
    .single();

  if (error) throw error;
  return data;
}

// 직급 생성
export async function createPosition(position: PositionInsert) {
  const { data, error } = await supabase
    .from('positions')
    .insert(position)
    .select()
    .single();

  if (error) throw error;
  return data;
}

// 직급 수정
export async function updatePosition(id: string, updates: PositionUpdate) {
  const { data, error } = await supabase
    .from('positions')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

// 직급 삭제
export async function deletePosition(id: string) {
  const { error } = await supabase
    .from('positions')
    .delete()
    .eq('id', id);

  if (error) throw error;
}
