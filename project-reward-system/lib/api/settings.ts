import { supabase } from '@/lib/supabase/client';

// 근로시간 설정 조회
export async function getWorkTimeSetting() {
  const { data, error } = await supabase
    .from('work_time_settings')
    .select('*')
    .single();

  if (error && error.code !== 'PGRST116') throw error;
  return data;
}
