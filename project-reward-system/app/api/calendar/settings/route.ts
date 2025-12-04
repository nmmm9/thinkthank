import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getCalendarList } from '@/lib/google-calendar/client';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// GET: 캘린더 설정 및 목록 조회
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const memberId = searchParams.get('memberId');
    const accessToken = searchParams.get('accessToken');

    if (!memberId) {
      return NextResponse.json({ error: 'Missing memberId' }, { status: 400 });
    }

    // 동기화 설정 가져오기
    const { data: settings, error } = await supabase
      .from('calendar_sync_settings')
      .select('*')
      .eq('member_id', memberId)
      .single();

    if (error && error.code !== 'PGRST116') {
      throw error;
    }

    // 캘린더 목록 가져오기 (accessToken이 있는 경우)
    let calendars = null;
    if (accessToken) {
      try {
        const calendarList = await getCalendarList(accessToken);
        // 본인 소유 캘린더만 필터링 (공유받은 캘린더 제외)
        calendars = calendarList.items.filter(
          (cal) => cal.accessRole === 'owner'
        );
      } catch (err) {
        console.error('Failed to fetch calendar list:', err);
      }
    }

    return NextResponse.json({
      settings: settings || null,
      calendars,
    });
  } catch (error: any) {
    console.error('Get calendar settings error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST: 캘린더 연동 활성화
export async function POST(request: NextRequest) {
  try {
    const { memberId, calendarId, accessToken } = await request.json();

    if (!memberId || !calendarId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // 설정 생성/업데이트
    const { data, error } = await supabase
      .from('calendar_sync_settings')
      .upsert(
        {
          member_id: memberId,
          is_enabled: true,
          google_calendar_id: calendarId,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'member_id' }
      )
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ success: true, settings: data });
  } catch (error: any) {
    console.error('Enable calendar sync error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE: 캘린더 연동 해제
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const memberId = searchParams.get('memberId');

    if (!memberId) {
      return NextResponse.json({ error: 'Missing memberId' }, { status: 400 });
    }

    // 설정 삭제
    const { error } = await supabase
      .from('calendar_sync_settings')
      .delete()
      .eq('member_id', memberId);

    if (error) throw error;

    // 스케줄에서 google_event_id 제거
    await supabase
      .from('schedules')
      .update({ google_event_id: null })
      .eq('member_id', memberId);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Disable calendar sync error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
