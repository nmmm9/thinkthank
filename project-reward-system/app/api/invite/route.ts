import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';
import { createClient } from '@supabase/supabase-js';

const resend = new Resend(process.env.RESEND_API_KEY);

// 서버 사이드에서 사용할 Supabase 클라이언트 (service role)
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// 랜덤 토큰 생성
function generateToken(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let token = '';
  for (let i = 0; i < 32; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return token;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, role, orgId, invitedBy } = body;

    // 유효성 검사
    if (!email || !orgId) {
      return NextResponse.json(
        { error: '이메일과 조직 정보가 필요합니다.' },
        { status: 400 }
      );
    }

    // 이미 멤버인지 확인
    const { data: existingMember } = await supabaseAdmin
      .from('members')
      .select('id')
      .eq('email', email)
      .eq('org_id', orgId)
      .single();

    if (existingMember) {
      return NextResponse.json(
        { error: '이미 등록된 멤버입니다.' },
        { status: 400 }
      );
    }

    // 이미 대기 중인 초대가 있는지 확인
    const { data: existingInvite } = await supabaseAdmin
      .from('invitations')
      .select('id')
      .eq('email', email)
      .eq('org_id', orgId)
      .is('accepted_at', null)
      .single();

    if (existingInvite) {
      return NextResponse.json(
        { error: '이미 초대가 발송된 이메일입니다.' },
        { status: 400 }
      );
    }

    // 조직 정보 가져오기
    const { data: org } = await supabaseAdmin
      .from('organizations')
      .select('name')
      .eq('id', orgId)
      .single();

    // 토큰 생성 및 만료일 설정 (7일)
    const token = generateToken();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    // 초대 레코드 생성
    const { error: insertError } = await supabaseAdmin
      .from('invitations')
      .insert({
        org_id: orgId,
        email,
        role: role || 'user',
        invited_by: invitedBy,
        token,
        expires_at: expiresAt.toISOString(),
      });

    if (insertError) {
      console.error('Insert error:', insertError);
      return NextResponse.json(
        { error: '초대 생성에 실패했습니다.' },
        { status: 500 }
      );
    }

    // 초대 링크 생성
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const inviteLink = `${baseUrl}/invite/${token}`;

    // 이메일 발송
    const { error: emailError } = await resend.emails.send({
      from: 'CO.UP <onboarding@resend.dev>',
      to: email,
      subject: `[CO.UP] ${org?.name || '조직'}에서 초대했습니다`,
      html: `
        <div style="font-family: 'Apple SD Gothic Neo', 'Malgun Gothic', sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
          <h1 style="color: #1f2937; font-size: 24px; margin-bottom: 24px;">CO.UP 초대</h1>

          <p style="color: #4b5563; font-size: 16px; line-height: 1.6; margin-bottom: 16px;">
            안녕하세요!<br/>
            <strong>${org?.name || '조직'}</strong>에서 CO.UP 서비스에 초대했습니다.
          </p>

          <p style="color: #4b5563; font-size: 16px; line-height: 1.6; margin-bottom: 32px;">
            아래 버튼을 클릭하여 초대를 수락하고 서비스를 시작하세요.
          </p>

          <a href="${inviteLink}"
             style="display: inline-block; background-color: #2563eb; color: white; padding: 14px 32px;
                    text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">
            초대 수락하기
          </a>

          <p style="color: #9ca3af; font-size: 14px; margin-top: 32px;">
            이 링크는 7일 후 만료됩니다.<br/>
            본인이 요청하지 않은 초대라면 이 이메일을 무시하세요.
          </p>

          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 32px 0;" />

          <p style="color: #9ca3af; font-size: 12px;">
            © 2025 CO.UP. All rights reserved.
          </p>
        </div>
      `,
    });

    if (emailError) {
      console.error('Email error:', emailError);
      // 이메일 발송 실패해도 초대는 생성됨 - 링크 직접 공유 가능
      return NextResponse.json({
        success: true,
        message: '초대가 생성되었습니다. (이메일 발송 실패 - 링크를 직접 공유하세요)',
        inviteLink,
      });
    }

    return NextResponse.json({
      success: true,
      message: '초대 이메일이 발송되었습니다.',
    });

  } catch (error) {
    console.error('Invite error:', error);
    return NextResponse.json(
      { error: '초대 처리 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
