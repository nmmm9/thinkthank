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

// 프로젝트 생성
export async function createProject(project: ProjectInsert) {
  const { error } = await (supabase
    .from('projects') as any)
    .insert(project);

  if (error) throw error;
  return project;
}

// 프로젝트 수정
export async function updateProject(id: string, updates: ProjectUpdate) {
  const { error } = await (supabase
    .from('projects') as any)
    .update(updates)
    .eq('id', id);

  if (error) throw error;
  return { id, ...updates };
}

// 프로젝트 즐겨찾기 토글
export async function toggleProjectStar(id: string, starred: boolean) {
  const { error } = await (supabase
    .from('projects') as any)
    .update({ starred })
    .eq('id', id);

  if (error) throw error;
  return { id, starred };
}

// 프로젝트 정산 완료 처리
export async function settleProject(id: string) {
  const { error } = await (supabase
    .from('projects') as any)
    .update({
      is_settled: true,
      settled_at: new Date().toISOString()
    })
    .eq('id', id);

  if (error) throw error;
  return { id, is_settled: true };
}

// 프로젝트 정산 취소
export async function unsettleProject(id: string) {
  const { error } = await (supabase
    .from('projects') as any)
    .update({
      is_settled: false,
      settled_at: null
    })
    .eq('id', id);

  if (error) throw error;
  return { id, is_settled: false };
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
  console.log('API setProjectAllocations:', { projectId, orgId, allocationsCount: allocations.length });

  // 기존 배분 삭제
  const { error: deleteError } = await (supabase
    .from('project_member_allocations') as any)
    .delete()
    .eq('project_id', projectId);

  console.log('Delete result:', { deleteError });
  if (deleteError) throw deleteError;

  // 새 배분 추가
  if (allocations.length > 0) {
    const insertData = allocations.map((a) => ({
      org_id: orgId,
      project_id: projectId,
      member_id: a.memberId,
      balance_percent: a.balancePercent || 0,
      allocated_amount: a.allocatedAmount || 0,
      planned_days: a.plannedDays || 0,
      start_date: a.startDate || null,
      end_date: a.endDate || null,
    }));
    console.log('Insert data:', insertData);

    const { error } = await (supabase
      .from('project_member_allocations') as any)
      .insert(insertData);

    console.log('Insert result:', { error });
    if (error) throw error;
  }
  console.log('setProjectAllocations 완료');
}
