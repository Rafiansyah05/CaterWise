export const dynamic = 'force-dynamic';
import { redirect } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';
import { createAdminClient } from '@/utils/supabase/admin';
import { Sidebar } from '@/components/layout/Sidebar';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const adminSupabase = createAdminClient();
  const { data: otpData } = await adminSupabase
    .from('otps')
    .select('verified')
    .eq('email', user.email)
    .eq('verified', true)
    .single();

  if (!otpData) {
    redirect(`/verify-otp?email=${encodeURIComponent(user.email || '')}`);
  }

  const { data: restaurant } = await supabase
    .from('restaurants')
    .select('id')
    .eq('owner_id', user.id)
    .single();

  if (!restaurant) {
    redirect('/setup/profile');
  }

  const { data: menus } = await supabase
    .from('menus')
    .select('id')
    .eq('restaurant_id', restaurant.id)
    .limit(1);

  if (!menus || menus.length === 0) {
    redirect('/setup/menu');
  }

  let userName = user.user_metadata?.name || 'User';
  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name')
    .eq('id', user.id)
    .single();
  
  if (profile && profile.full_name) {
    userName = profile.full_name;
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col md:flex-row">
      <Sidebar userName={userName} userEmail={user.email || ''} />

      <main className="flex-1 md:h-screen md:overflow-y-auto">
        <div className="p-4 md:p-8">
          {children}
        </div>
      </main>
    </div>
  );
}
