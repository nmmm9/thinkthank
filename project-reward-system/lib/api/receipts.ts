import { supabase } from '@/lib/supabase/client';

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
