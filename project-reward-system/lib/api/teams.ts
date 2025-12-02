import { supabase } from '@/lib/supabase/client';
import type { TeamInsert, TeamUpdate } from '@/lib/supabase/database.types';

// 팀 목록 조회
export async function getTeams() {
  const { data, error } = await supabase
    .from('teams')
    .select('*')
    .order('sort_order');

  if (error) throw error;
  return data;
}

// 활성 팀 목록 조회
export async function getActiveTeams() {
  const { data, error } = await supabase
    .from('teams')
    .select('*')
    .eq('is_active', true)
    .order('sort_order');

  if (error) throw error;
  return data;
}

// 단일 팀 조회
export async function getTeam(id: string) {
  const { data, error } = await supabase
    .from('teams')
    .select('*')
    .eq('id', id)
    .single();

  if (error) throw error;
  return data;
}

// 팀 생성
export async function createTeam(team: TeamInsert) {
  const { data, error } = await supabase
    .from('teams')
    .insert(team)
    .select()
    .single();

  if (error) throw error;
  return data;
}

// 팀 수정
export async function updateTeam(id: string, updates: TeamUpdate) {
  const { data, error } = await supabase
    .from('teams')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

// 팀 삭제
export async function deleteTeam(id: string) {
  const { error } = await supabase
    .from('teams')
    .delete()
    .eq('id', id);

  if (error) throw error;
}
