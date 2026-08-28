import { NextResponse } from 'next/server';
import { createAdminClient } from '@/utils/supabase/admin';
import { sendWhatsApp } from '@/utils/fonnte';

const REMINDER_HOUR = 21;

function localDateString(timezone: string, now: Date): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);
}

function localHour(timezone: string, now: Date): number {
  const value = new Intl.DateTimeFormat('en-GB', {
    timeZone: timezone,
    hour: '2-digit',
    hourCycle: 'h23',
  }).format(now);
  return parseInt(value, 10);
}

function localDayName(timezone: string, now: Date): string {
  return new Intl.DateTimeFormat('id-ID', {
    timeZone: timezone,
    weekday: 'long',
  }).format(now);
}

function buildMessage(ownerName: string, restaurantName: string, salesUrl: string): string {
  const greeting = ownerName ? `Halo ${ownerName},` : 'Halo,';
  return (
    `${greeting} penjualan *${restaurantName}* hari ini belum dicatat di CaterWise.\n\n` +
    `Rekap sekarang supaya rekomendasi produksi besok tetap akurat:\n${salesUrl}\n\n` +
    `Kalau sudah dicatat lewat perangkat lain, abaikan pesan ini.`
  );
}

export async function POST(request: Request) {
  const secret = process.env.REMINDER_SECRET;
  if (!secret) {
    return NextResponse.json({ error: 'REMINDER_SECRET belum dikonfigurasi' }, { status: 500 });
  }

  const provided = request.headers.get('authorization');
  if (provided !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;
  if (!siteUrl) {
    return NextResponse.json({ error: 'NEXT_PUBLIC_SITE_URL belum dikonfigurasi' }, { status: 500 });
  }

  const salesUrl = `${siteUrl.replace(/\/+$/, '')}/dashboard/sales`;
  const supabase = createAdminClient();
  const now = new Date();

  const { data: restaurants, error: restaurantError } = await supabase
    .from('restaurants')
    .select('id, name, operating_days, profiles!inner(full_name, phone_number, timezone)');

  if (restaurantError) {
    return NextResponse.json({ error: restaurantError.message }, { status: 500 });
  }

  const summary = { checked: 0, sent: 0, skipped: 0, failed: 0 };
  const failures: string[] = [];

  for (const restaurant of restaurants || []) {
    const profile = Array.isArray(restaurant.profiles) ? restaurant.profiles[0] : restaurant.profiles;
    const timezone = profile?.timezone;
    const phoneNumber = profile?.phone_number;

    if (!timezone || !phoneNumber) {
      summary.skipped += 1;
      continue;
    }

    let hour: number;
    let today: string;
    let dayName: string;
    try {
      hour = localHour(timezone, now);
      today = localDateString(timezone, now);
      dayName = localDayName(timezone, now);
    } catch {
      summary.skipped += 1;
      continue;
    }

    if (hour !== REMINDER_HOUR) {
      summary.skipped += 1;
      continue;
    }

    summary.checked += 1;

    const operatingDays = restaurant.operating_days || [];
    if (operatingDays.length > 0 && !operatingDays.includes(dayName)) {
      summary.skipped += 1;
      continue;
    }

    const { data: existingLog } = await supabase
      .from('reminder_logs')
      .select('id')
      .eq('restaurant_id', restaurant.id)
      .eq('reminder_date', today)
      .maybeSingle();

    if (existingLog) {
      summary.skipped += 1;
      continue;
    }

    const { data: menus } = await supabase
      .from('menus')
      .select('id')
      .eq('restaurant_id', restaurant.id)
      .eq('is_active', true);

    if (!menus || menus.length === 0) {
      summary.skipped += 1;
      continue;
    }

    const { count: salesCount } = await supabase
      .from('daily_sales')
      .select('id', { count: 'exact', head: true })
      .eq('sales_date', today)
      .in('menu_id', menus.map((menu) => menu.id));

    if (salesCount && salesCount > 0) {
      summary.skipped += 1;
      continue;
    }

    const { error: logError } = await supabase
      .from('reminder_logs')
      .insert({ restaurant_id: restaurant.id, reminder_date: today });

    if (logError) {
      summary.skipped += 1;
      continue;
    }

    const message = buildMessage(profile?.full_name || '', restaurant.name, salesUrl);
    const result = await sendWhatsApp(phoneNumber, message);

    if (result.ok) {
      summary.sent += 1;
    } else {
      summary.failed += 1;
      failures.push(`${restaurant.name}: ${result.error}`);
      await supabase
        .from('reminder_logs')
        .delete()
        .eq('restaurant_id', restaurant.id)
        .eq('reminder_date', today);
    }
  }

  return NextResponse.json({ ...summary, failures });
}
