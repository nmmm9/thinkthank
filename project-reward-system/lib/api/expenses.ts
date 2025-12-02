import { supabase } from '@/lib/supabase/client';
import type { Database } from '@/lib/supabase/database.types';

type ExpenseInsert = Database['public']['Tables']['expenses']['Insert'];
type ExpenseUpdate = Database['public']['Tables']['expenses']['Update'];

// 지출내역 목록 조회
export async function getExpenses() {
  const { data, error } = await supabase
    .from('expenses')
    .select(`
      *,
      project:projects(*)
    `)
    .order('date', { ascending: false });

  if (error) throw error;
  return data;
}

// 기간별 지출내역 조회
export async function getExpensesByDateRange(startDate: string, endDate: string) {
  const { data, error } = await supabase
    .from('expenses')
    .select(`
      *,
      project:projects(*)
    `)
    .gte('date', startDate)
    .lte('date', endDate)
    .order('date', { ascending: false });

  if (error) throw error;
  return data;
}

// 프로젝트별 지출내역 조회
export async function getExpensesByProject(projectId: string) {
  const { data, error } = await supabase
    .from('expenses')
    .select('*')
    .eq('project_id', projectId)
    .order('date', { ascending: false });

  if (error) throw error;
  return data;
}

// 지출내역 생성
export async function createExpense(expense: ExpenseInsert) {
  const { data, error } = await supabase
    .from('expenses')
    .insert(expense)
    .select()
    .single();

  if (error) throw error;
  return data;
}

// 지출내역 수정
export async function updateExpense(id: string, updates: ExpenseUpdate) {
  const { data, error } = await supabase
    .from('expenses')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

// 지출내역 삭제
export async function deleteExpense(id: string) {
  const { error } = await supabase
    .from('expenses')
    .delete()
    .eq('id', id);

  if (error) throw error;
}
