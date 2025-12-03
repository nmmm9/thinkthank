import { supabase } from '@/lib/supabase/client';
import type { MemberUpdate } from '@/lib/supabase/database.types';

// 멤버 목록 조회 (팀 정보 포함)
export async function getMembers() {
  const { data, error } = await supabase
    .from('members')
    .select(`
      *,
      team:teams(*)
    `)
    .order('name');

  if (error) throw error;
  return data;
}

// 멤버 수정
export async function updateMember(id: string, updates: MemberUpdate) {
  const { error } = await (supabase
    .from('members') as any)
    .update(updates)
    .eq('id', id);

  if (error) throw error;
  return { id, ...updates };
}

// 멤버 삭제
export async function deleteMember(id: string) {
  const { error } = await supabase
    .from('members')
    .delete()
    .eq('id', id);

  if (error) throw error;
}
