import { NextResponse } from 'next/server';
import { createAdminClient } from '@/utils/supabase/admin';
import { Resend } from 'resend';

export async function POST(request: Request) {
  try {
    const resend = new Resend(process.env.RESEND_API_KEY);
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    const supabase = createAdminClient();
    
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 10);

    await supabase.from('otps').update({ verified: true }).eq('email', email);

    const { error: insertError } = await supabase
      .from('otps')
      .insert({
        email,
        otp,
        expires_at: expiresAt.toISOString(),
      });

    if (insertError) {
      console.error('Insert OTP error:', insertError);
      return NextResponse.json({ error: 'Failed to create OTP' }, { status: 500 });
    }

    const { data: resendData, error: resendError } = await resend.emails.send({
      from: 'CaterWise <noreply@adatelur.web.id>',
      to: [email],
      subject: 'CaterWise',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e5e7eb; border-radius: 8px;">
          <h2 style="color: #2563eb;">Selamat datang di CaterWise!</h2>
          <p>Gunakan kode rahasia di bawah ini untuk memverifikasi akun Anda:</p>
          <div style="background-color: #f3f4f6; padding: 16px; text-align: center; font-size: 24px; font-weight: bold; letter-spacing: 4px; border-radius: 6px; margin: 20px 0;">
            ${otp}
          </div>
          <p style="color: #6b7280; font-size: 14px;">Kode ini hanya berlaku selama 10 menit. Mohon jangan membagikan kode ini kepada siapapun.</p>
        </div>
      `,
    });

    if (resendError) {
      console.error('Resend error:', resendError);
      return NextResponse.json({ error: `Gagal mengirim email: ${resendError.message}` }, { status: 500 });
    }

    return NextResponse.json({ message: 'OTP sent successfully' });
  } catch (error) {
    console.error('send-otp exception:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
