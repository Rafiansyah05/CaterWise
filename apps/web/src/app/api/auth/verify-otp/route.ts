import { NextResponse } from 'next/server';
import { createAdminClient } from '@/utils/supabase/admin';
import { createClient } from '@/utils/supabase/server';

export async function POST(request: Request) {
  try {
    const { email, otp } = await request.json();

    if (!email || !otp) {
      return NextResponse.json({ error: 'Email and OTP are required' }, { status: 400 });
    }

    const adminSupabase = createAdminClient();

    // Find the latest valid OTP
    const { data: otpRecords, error: fetchError } = await adminSupabase
      .from('otps')
      .select('*')
      .eq('email', email)
      .eq('otp', otp)
      .eq('verified', false)
      .gte('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(1);

    if (fetchError || !otpRecords || otpRecords.length === 0) {
      return NextResponse.json({ error: 'Invalid or expired OTP' }, { status: 400 });
    }

    // Mark as verified
    await adminSupabase
      .from('otps')
      .update({ verified: true })
      .eq('id', otpRecords[0].id);

    // If using custom OTP flow without Supabase's built-in email auth,
    // we assume the user was already created via signUp but without confirmed email.
    // Or we sign them in via signInWithOtp if using Supabase magic link (but we have custom OTP).
    // Let's just update the user's email_confirmed_at using Admin API.
    const { data: users, error: userError } = await adminSupabase.auth.admin.listUsers();
    
    if (userError) {
       return NextResponse.json({ error: 'Auth admin error' }, { status: 500 });
    }
    
    const user = users.users.find((u) => u.email === email);
    if (user) {
      if (!user.email_confirmed_at) {
        await adminSupabase.auth.admin.updateUserById(user.id, { email_confirm: true });
      }

      // Masukkan ke tabel profiles jika belum ada
      const { data: profile } = await adminSupabase
        .from('profiles')
        .select('id')
        .eq('id', user.id)
        .single();
        
      if (!profile) {
        await adminSupabase.from('profiles').insert({
          id: user.id,
          email: user.email,
        });
      }
    }

    // Since we verified custom OTP, we can force-login the user or just tell them to login.
    // However, to force-login, we could return a success and let client sign in with their password,
    // or we could use Supabase's PKCE / magic link. 
    // For simplicity, we just respond with success, and client can route them to login or dashboard.
    return NextResponse.json({ message: 'OTP verified successfully' });

  } catch (error) {
    console.error('verify-otp exception:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
