import { supabase } from '@/lib/supabase/client';
import type { Database } from '@/lib/supabase/database.types';

type WorkTimeSettingUpdate = Database['public']['Tables']['work_time_settings']['Update'];
type OrganizationUpdate = Database['public']['Tables']['organizations']['Update'];

// 근로시간 설정 조회
export async function getWorkTimeSetting() {
  const { data, error } = await supabase
    .from('work_time_settings')
    .select('*')
    .single();

  if (error && error.code !== 'PGRST116') throw error;
  return data;
}

// 근로시간 설정 수정
export async function updateWorkTimeSetting(id: string, updates: WorkTimeSettingUpdate) {
  const { data, error } = await supabase
    .from('work_time_settings')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

// 조직 정보 조회
export async function getOrganization() {
  const { data, error } = await supabase
    .from('organizations')
    .select('*')
    .single();

  if (error) throw error;
  return data;
}

// 조직 정보 수정
export async function updateOrganization(id: string, updates: OrganizationUpdate) {
  const { data, error } = await supabase
    .from('organizations')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

// 대시보드용 통계 데이터 조회
export async function getDashboardStats() {
  // 병렬로 여러 통계 조회
  const [
    projectsResult,
    membersResult,
    schedulesResult,
  ] = await Promise.all([
    supabase.from('projects').select('id, status, contract_amount'),
    supabase.from('members').select('id, is_active').eq('is_active', true),
    supabase.from('schedules').select('id, minutes, date'),
  ]);

  if (projectsResult.error) throw projectsResult.error;
  if (membersResult.error) throw membersResult.error;
  if (schedulesResult.error) throw schedulesResult.error;

  return {
    projects: projectsResult.data,
    activeMembers: membersResult.data,
    schedules: schedulesResult.data,
  };
}
