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

// 팀 생성
export async function createTeam(team: TeamInsert) {
  const { error } = await (supabase
    .from('teams') as any)
    .insert(team);

  if (error) throw error;
  return team;
}

// 팀 수정
export async function updateTeam(id: string, updates: TeamUpdate) {
  const { error } = await (supabase
    .from('teams') as any)
    .update(updates)
    .eq('id', id);

  if (error) throw error;
  return { id, ...updates };
}

// 팀 삭제
export async function deleteTeam(id: string) {
  const { error } = await (supabase
    .from('teams') as any)
    .delete()
    .eq('id', id);

  if (error) throw error;
}
