import { supabase } from '@/lib/supabase/client';
import type { ProjectInsert, ProjectUpdate } from '@/lib/supabase/database.types';

// 프로젝트 목록 조회 (카테고리, 팀, 멤버 배분 포함)
export async function getProjects() {
  const { data, error } = await supabase
    .from('projects')
    .select(`
      *,
      category:project_categories(*),
      team:teams(*),
      allocations:project_member_allocations(
        *,
        member:members(*)
      )
    `)
    .order('start_date', { ascending: false });

  if (error) throw error;
  return data;
}

// 단일 프로젝트 조회
export async function getProject(id: string) {
  const { data, error } = await supabase
    .from('projects')
    .select(`
      *,
      category:project_categories(*),
      team:teams(*),
      allocations:project_member_allocations(
        *,
        member:members(*)
      )
    `)
    .eq('id', id)
    .single();

  if (error) throw error;
  return data;
}

// 상태별 프로젝트 조회
export async function getProjectsByStatus(status: string) {
  const { data, error } = await supabase
    .from('projects')
    .select(`
      *,
      category:project_categories(*),
      team:teams(*),
      allocations:project_member_allocations(
        *,
        member:members(*)
      )
    `)
    .eq('status', status)
    .order('start_date', { ascending: false });

  if (error) throw error;
  return data;
}

// 활성 프로젝트 조회 (진행중 + 진행예정)
export async function getActiveProjects() {
  const { data, error } = await supabase
    .from('projects')
    .select(`
      *,
      category:project_categories(*),
      team:teams(*),
      allocations:project_member_allocations(
        *,
        member:members(*)
      )
    `)
    .in('status', ['planning', 'inprogress'])
    .order('start_date', { ascending: false });

  if (error) throw error;
  return data;
}

// 기간별 프로젝트 조회
export async function getProjectsByDateRange(startDate: string, endDate: string) {
  const { data, error } = await supabase
    .from('projects')
    .select(`
      *,
      category:project_categories(*),
      team:teams(*),
      allocations:project_member_allocations(
        *,
        member:members(*)
      )
    `)
    .or(`start_date.gte.${startDate},end_date.lte.${endDate}`)
    .order('start_date');

  if (error) throw error;
  return data;
}

// 프로젝트 생성
export async function createProject(project: ProjectInsert) {
  const { data, error } = await supabase
    .from('projects')
    .insert(project)
    .select()
    .single();

  if (error) throw error;
  return data;
}

// 프로젝트 수정
export async function updateProject(id: string, updates: ProjectUpdate) {
  const { data, error } = await supabase
    .from('projects')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

// 프로젝트 삭제
export async function deleteProject(id: string) {
  const { error } = await supabase
    .from('projects')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

// 프로젝트 즐겨찾기 토글
export async function toggleProjectStar(id: string, starred: boolean) {
  const { data, error } = await supabase
    .from('projects')
    .update({ starred })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

// 프로젝트 멤버 배분 설정
export async function setProjectAllocations(
  projectId: string,
  orgId: string,
  allocations: Array<{
    memberId: string;
    balancePercent?: number;
    allocatedAmount?: number;
    plannedDays?: number;
    startDate?: string;
    endDate?: string;
  }>
) {
  // 기존 배분 삭제
  await supabase
    .from('project_member_allocations')
    .delete()
    .eq('project_id', projectId);

  // 새 배분 추가
  if (allocations.length > 0) {
    const { error } = await supabase
      .from('project_member_allocations')
      .insert(
        allocations.map((a) => ({
          org_id: orgId,
          project_id: projectId,
          member_id: a.memberId,
          balance_percent: a.balancePercent || 0,
          allocated_amount: a.allocatedAmount || 0,
          planned_days: a.plannedDays || 0,
          start_date: a.startDate || null,
          end_date: a.endDate || null,
        }))
      );

    if (error) throw error;
  }
}
