import { supabase } from '@/lib/supabase/client';
import type { MemberInsert, MemberUpdate } from '@/lib/supabase/database.types';

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

// 단일 멤버 조회
export async function getMember(id: string) {
  const { data, error } = await supabase
    .from('members')
    .select(`
      *,
      team:teams(*)
    `)
    .eq('id', id)
    .single();

  if (error) throw error;
  return data;
}

// 이메일로 멤버 조회
export async function getMemberByEmail(email: string) {
  const { data, error } = await supabase
    .from('members')
    .select(`
      *,
      team:teams(*)
    `)
    .eq('email', email)
    .single();

  if (error) throw error;
  return data;
}

// auth_user_id로 멤버 조회
export async function getMemberByAuthId(authUserId: string) {
  const { data, error } = await supabase
    .from('members')
    .select(`
      *,
      team:teams(*),
      organization:organizations(*)
    `)
    .eq('auth_user_id', authUserId)
    .single();

  if (error) throw error;
  return data;
}

// 멤버 생성
export async function createMember(member: MemberInsert) {
  const { data, error } = await supabase
    .from('members')
    .insert(member)
    .select()
    .single();

  if (error) throw error;
  return data;
}

// 멤버 수정
export async function updateMember(id: string, updates: MemberUpdate) {
  const { data, error } = await supabase
    .from('members')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

// 멤버 삭제
export async function deleteMember(id: string) {
  const { error } = await supabase
    .from('members')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

// 활성 멤버 목록 조회
export async function getActiveMembers() {
  const { data, error } = await supabase
    .from('members')
    .select(`
      *,
      team:teams(*)
    `)
    .eq('is_active', true)
    .eq('is_approved', true)
    .order('name');

  if (error) throw error;
  return data;
}

// 팀별 멤버 조회
export async function getMembersByTeam(teamId: string) {
  const { data, error } = await supabase
    .from('members')
    .select(`
      *,
      team:teams(*)
    `)
    .eq('team_id', teamId)
    .order('name');

  if (error) throw error;
  return data;
}
