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

// 근로시간 설정 업데이트
export async function updateWorkTimeSetting(
  orgId: string,
  updates: {
    work_minutes_per_day?: number;
    work_start_time?: string;
    work_end_time?: string;
    lunch_start_time?: string;
    lunch_end_time?: string;
  }
) {
  // 기존 설정이 있는지 확인
  const { data: existing } = await supabase
    .from('work_time_settings')
    .select('id')
    .eq('org_id', orgId)
    .maybeSingle();

  if (existing) {
    // 업데이트
    const { data, error } = await (supabase
      .from('work_time_settings') as any)
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('org_id', orgId)
      .select();

    if (error) throw error;
    return data?.[0] || null;
  } else {
    // 새로 생성
    const { data, error } = await (supabase
      .from('work_time_settings') as any)
      .insert({
        org_id: orgId,
        work_minutes_per_day: updates.work_minutes_per_day || 480,
        work_start_time: updates.work_start_time || '09:30',
        work_end_time: updates.work_end_time || '18:30',
        lunch_start_time: updates.lunch_start_time || '12:00',
        lunch_end_time: updates.lunch_end_time || '13:00',
      })
      .select();

    if (error) throw error;
    return data?.[0] || null;
  }
}

// 일별 점심시간 조회 (주간)
export async function getDailyLunchTimes(startDate: string, endDate: string) {
  const { data, error } = await supabase
    .from('daily_lunch_times')
    .select('*')
    .gte('date', startDate)
    .lte('date', endDate);

  if (error) throw error;
  return data || [];
}

// 일별 점심시간 저장/업데이트
export async function updateDailyLunchTime(
  orgId: string,
  date: string,
  startTime: string,
  endTime: string
) {
  // 기존 데이터가 있는지 확인
  const { data: existing } = await supabase
    .from('daily_lunch_times')
    .select('id')
    .eq('org_id', orgId)
    .eq('date', date)
    .maybeSingle();

  if (existing) {
    // 업데이트
    const { data, error } = await (supabase
      .from('daily_lunch_times') as any)
      .update({
        start_time: startTime,
        end_time: endTime,
        updated_at: new Date().toISOString(),
      })
      .eq('org_id', orgId)
      .eq('date', date)
      .select();

    if (error) throw error;
    return data?.[0] || null;
  } else {
    // 새로 생성
    const { data, error } = await (supabase
      .from('daily_lunch_times') as any)
      .insert({
        org_id: orgId,
        date,
        start_time: startTime,
        end_time: endTime,
      })
      .select();

    if (error) throw error;
    return data?.[0] || null;
  }
}

// 조직 정보 수정
export async function updateOrganization(id: string, updates: { name?: string; logo_url?: string | null }) {
  const { data, error } = await (supabase
    .from('organizations') as any)
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
