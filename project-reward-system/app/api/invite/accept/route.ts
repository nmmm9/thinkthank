import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// 서버 사이드에서 사용할 Supabase 클라이언트 (service role)
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { token, userId, email, name } = body;

    // 유효성 검사
    if (!token || !userId || !email) {
      return NextResponse.json(
        { error: '필수 정보가 누락되었습니다.' },
        { status: 400 }
      );
    }

    // 초대 정보 조회
    const { data: invitation, error: inviteError } = await supabaseAdmin
      .from('invitations')
      .select('*')
      .eq('token', token)
      .single();

    if (inviteError || !invitation) {
      return NextResponse.json(
        { error: '유효하지 않은 초대입니다.' },
        { status: 400 }
      );
    }

    // 만료 확인
    if (new Date(invitation.expires_at) < new Date()) {
      return NextResponse.json(
        { error: '만료된 초대입니다.' },
        { status: 400 }
      );
    }

    // 이미 수락됨
    if (invitation.accepted_at) {
      return NextResponse.json(
        { error: '이미 수락된 초대입니다.' },
        { status: 400 }
      );
    }

    // 이미 멤버인지 확인
    const { data: existingMember } = await supabaseAdmin
      .from('members')
      .select('id')
      .eq('auth_user_id', userId)
      .eq('org_id', invitation.org_id)
      .single();

    if (existingMember) {
      return NextResponse.json(
        { error: '이미 등록된 멤버입니다.' },
        { status: 400 }
      );
    }

    // 멤버 생성 (is_approved: true로 바로 승인)
    const { error: memberError } = await supabaseAdmin
      .from('members')
      .insert({
        org_id: invitation.org_id,
        auth_user_id: userId,
        name: name,
        email: email,
        role: invitation.role || 'user',
        is_approved: true,
        is_active: true,
      });

    if (memberError) {
      console.error('Member create error:', memberError);
      return NextResponse.json(
        { error: '멤버 등록에 실패했습니다.' },
        { status: 500 }
      );
    }

    // 초대 수락 처리
    const { error: updateError } = await supabaseAdmin
      .from('invitations')
      .update({ accepted_at: new Date().toISOString() })
      .eq('id', invitation.id);

    if (updateError) {
      console.error('Invitation update error:', updateError);
      // 멤버는 생성되었으므로 에러는 로그만 남김
    }

    return NextResponse.json({
      success: true,
      message: '가입이 완료되었습니다.',
    });

  } catch (error) {
    console.error('Accept invite error:', error);
    return NextResponse.json(
      { error: '초대 수락 처리 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
