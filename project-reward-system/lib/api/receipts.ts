import { supabase } from '@/lib/supabase/client';
import type { Database } from '@/lib/supabase/database.types';

type ReceiptInsert = Database['public']['Tables']['receipts']['Insert'];
type ReceiptUpdate = Database['public']['Tables']['receipts']['Update'];

// 입금내역 목록 조회
export async function getReceipts() {
  const { data, error } = await supabase
    .from('receipts')
    .select(`
      *,
      project:projects(*)
    `)
    .order('date', { ascending: false });

  if (error) throw error;
  return data;
}

// 기간별 입금내역 조회
export async function getReceiptsByDateRange(startDate: string, endDate: string) {
  const { data, error } = await supabase
    .from('receipts')
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

// 프로젝트별 입금내역 조회
export async function getReceiptsByProject(projectId: string) {
  const { data, error } = await supabase
    .from('receipts')
    .select('*')
    .eq('project_id', projectId)
    .order('date', { ascending: false });

  if (error) throw error;
  return data;
}

// 입금내역 생성
export async function createReceipt(receipt: ReceiptInsert) {
  const { data, error } = await supabase
    .from('receipts')
    .insert(receipt)
    .select()
    .single();

  if (error) throw error;
  return data;
}

// 입금내역 수정
export async function updateReceipt(id: string, updates: ReceiptUpdate) {
  const { data, error } = await supabase
    .from('receipts')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

// 입금내역 삭제
export async function deleteReceipt(id: string) {
  const { error } = await supabase
    .from('receipts')
    .delete()
    .eq('id', id);

  if (error) throw error;
}
