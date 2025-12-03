import { supabase } from '@/lib/supabase/client';
import type { Database } from '@/lib/supabase/database.types';

type PerformanceCommentInsert = Database['public']['Tables']['performance_comments']['Insert'];
type PerformanceCommentUpdate = Database['public']['Tables']['performance_comments']['Update'];

// 확장된 코멘트 타입 (작성자, 대상자 정보 포함)
export interface PerformanceCommentWithRelations {
  id: string;
  org_id: string;
  project_id: string;
  member_id: string;
  author_id: string;
  content: string;
  is_read: boolean;
  created_at: string;
  updated_at: string;
  author?: {
    id: string;
    name: string;
  } | null;
  member?: {
    id: string;
    name: string;
  } | null;
  project?: {
    id: string;
    name: string;
  } | null;
}

// 특정 프로젝트의 특정 멤버에 대한 코멘트 조회
export async function getCommentsByProjectAndMember(projectId: string, memberId: string) {
  const { data, error } = await supabase
    .from('performance_comments')
    .select(`
      *,
      author:members!performance_comments_author_id_fkey(id, name),
      member:members!performance_comments_member_id_fkey(id, name),
      project:projects(id, name)
    `)
    .eq('project_id', projectId)
    .eq('member_id', memberId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data as PerformanceCommentWithRelations[];
}

// 특정 멤버에게 달린 모든 코멘트 조회 (본인용)
export async function getCommentsByMember(memberId: string) {
  const { data, error } = await supabase
    .from('performance_comments')
    .select(`
      *,
      author:members!performance_comments_author_id_fkey(id, name),
      project:projects(id, name)
    `)
    .eq('member_id', memberId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data as PerformanceCommentWithRelations[];
}

// 읽지 않은 코멘트 개수 조회
export async function getUnreadCommentCount(memberId: string) {
  const { count, error } = await supabase
    .from('performance_comments')
    .select('*', { count: 'exact', head: true })
    .eq('member_id', memberId)
    .eq('is_read', false);

  if (error) throw error;
  return count || 0;
}

// 읽지 않은 코멘트 목록 조회
export async function getUnreadComments(memberId: string) {
  const { data, error } = await supabase
    .from('performance_comments')
    .select(`
      *,
      author:members!performance_comments_author_id_fkey(id, name),
      project:projects(id, name)
    `)
    .eq('member_id', memberId)
    .eq('is_read', false)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data as PerformanceCommentWithRelations[];
}

// 코멘트 작성
export async function createComment(comment: PerformanceCommentInsert) {
  const { data, error } = await (supabase
    .from('performance_comments') as any)
    .insert(comment)
    .select(`
      *,
      author:members!performance_comments_author_id_fkey(id, name),
      member:members!performance_comments_member_id_fkey(id, name),
      project:projects(id, name)
    `)
    .single();

  if (error) throw error;
  return data as PerformanceCommentWithRelations;
}

// 코멘트 수정
export async function updateComment(id: string, updates: PerformanceCommentUpdate) {
  const { data, error } = await (supabase
    .from('performance_comments') as any)
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

// 코멘트 삭제
export async function deleteComment(id: string) {
  const { error } = await (supabase
    .from('performance_comments') as any)
    .delete()
    .eq('id', id);

  if (error) throw error;
}

// 코멘트 읽음 처리
export async function markCommentAsRead(id: string) {
  const { error } = await (supabase
    .from('performance_comments') as any)
    .update({ is_read: true })
    .eq('id', id);

  if (error) throw error;
}

// 여러 코멘트 읽음 처리
export async function markCommentsAsRead(ids: string[]) {
  const { error } = await (supabase
    .from('performance_comments') as any)
    .update({ is_read: true })
    .in('id', ids);

  if (error) throw error;
}

// 특정 프로젝트의 모든 코멘트 읽음 처리 (본인 것만)
export async function markProjectCommentsAsRead(projectId: string, memberId: string) {
  const { error } = await (supabase
    .from('performance_comments') as any)
    .update({ is_read: true })
    .eq('project_id', projectId)
    .eq('member_id', memberId);

  if (error) throw error;
}
