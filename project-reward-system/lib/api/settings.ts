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

// 조직 정보 수정
export async function updateOrganization(id: string, updates: { name?: string; logo_url?: string | null }) {
  const { data, error } = await supabase
    .from('organizations')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

// 로고 업로드
export async function uploadLogo(orgId: string, file: File) {
  const fileExt = file.name.split('.').pop();
  const fileName = `${orgId}/logo.${fileExt}`;

  // 기존 로고 삭제 시도 (에러 무시)
  await supabase.storage.from('logos').remove([fileName]).catch(() => {});

  // 새 로고 업로드
  const { error: uploadError } = await supabase.storage
    .from('logos')
    .upload(fileName, file, { upsert: true });

  if (uploadError) throw uploadError;

  // 공개 URL 가져오기
  const { data: urlData } = supabase.storage
    .from('logos')
    .getPublicUrl(fileName);

  return urlData.publicUrl;
}
