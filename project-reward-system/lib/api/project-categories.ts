import { supabase } from '@/lib/supabase/client';
import type { Database } from '@/lib/supabase/database.types';

type ProjectCategoryInsert = Database['public']['Tables']['project_categories']['Insert'];
type ProjectCategoryUpdate = Database['public']['Tables']['project_categories']['Update'];

// 프로젝트 카테고리 목록 조회
export async function getProjectCategories() {
  const { data, error } = await supabase
    .from('project_categories')
    .select('*')
    .order('sort_order');

  if (error) throw error;
  return data;
}

// 활성 카테고리 목록 조회
export async function getActiveProjectCategories() {
  const { data, error } = await supabase
    .from('project_categories')
    .select('*')
    .eq('is_active', true)
    .order('sort_order');

  if (error) throw error;
  return data;
}

// 카테고리 생성
export async function createProjectCategory(category: ProjectCategoryInsert) {
  const { data, error } = await supabase
    .from('project_categories')
    .insert(category)
    .select()
    .single();

  if (error) throw error;
  return data;
}

// 카테고리 수정
export async function updateProjectCategory(id: string, updates: ProjectCategoryUpdate) {
  const { data, error } = await supabase
    .from('project_categories')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

// 카테고리 삭제
export async function deleteProjectCategory(id: string) {
  const { error } = await supabase
    .from('project_categories')
    .delete()
    .eq('id', id);

  if (error) throw error;
}
