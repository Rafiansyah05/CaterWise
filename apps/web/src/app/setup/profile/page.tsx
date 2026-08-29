'use client';
export const dynamic = 'force-dynamic';
import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import { useRouter } from 'next/navigation';

export default function RestaurantSetupPage() {
  const [ownerName, setOwnerName] = useState('');
  const [namaTerkunci, setNamaTerkunci] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState('');

  const [name, setName] = useState('');
  const [location, setLocation] = useState('');
  const [operatingDays, setOperatingDays] = useState<string[]>([]);
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const router = useRouter();
  const supabase = createClient();
  const days = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu'];

  useEffect(() => {
    async function loadData() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      const namaAkun = profile
        ? profile.full_name || user.user_metadata?.name || ''
        : user.user_metadata?.name || '';

      setOwnerName(namaAkun);
      setNamaTerkunci(namaAkun.trim() !== '');
      if (profile) {
        setPhoneNumber(profile.phone_number || '');
      }

      const { data: restaurant } = await supabase
        .from('restaurants')
        .select('*')
        .eq('owner_id', user.id)
        .single();
      
      if (restaurant) {
        setName(restaurant.name || '');
        setLocation(restaurant.location || '');
        setOperatingDays(restaurant.operating_days || []);
      }
    }
    loadData();
  }, [supabase]);

  const toggleDay = (day: string) => {
    setOperatingDays(prev => 
      prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]
    );
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error: profileError } = await supabase
      .from('profiles')
      .update({
        full_name: ownerName,
        phone_number: phoneNumber,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
      })
      .eq('id', user.id);

    if (profileError) {
      setError('Gagal menyimpan profil: ' + profileError.message);
      setLoading(false);
      return;
    }

    const { data: existing } = await supabase
      .from('restaurants')
      .select('id')
      .eq('owner_id', user.id)
      .single();

    let saveError;
    if (existing) {
      const { error } = await supabase
        .from('restaurants')
        .update({ name, location, operating_days: operatingDays })
        .eq('id', existing.id);
      saveError = error;
    } else {
      const { error } = await supabase
        .from('restaurants')
        .insert({ owner_id: user.id, name, location, operating_days: operatingDays });
      saveError = error;
    }

    if (saveError) {
      setError('Gagal menyimpan restoran: ' + saveError.message);
      setLoading(false);
      return;
    }

    router.push('/setup/menu');
  };

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-[1.6rem] font-bold leading-tight tracking-[-0.02em] text-ink sm:text-[2rem]">
          Lengkapi profil &amp; restoran
        </h1>
        <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted sm:text-base">
          Dipakai untuk rekomendasi produksi dan pengingat harian.
        </p>
      </div>

      {error && (
        <div className="mb-5 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <svg viewBox="0 0 24 24" fill="none" className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true">
            <path d="M12 8v5m0 3h.01M12 3l9 16H3l9-16z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          {error}
        </div>
      )}
      <form onSubmit={handleSave} className="space-y-5">
        <section className="rounded-2xl border border-hairline bg-white p-6 shadow-[0_1px_2px_rgba(11,16,32,0.03)] sm:p-8">
          <h2 className="text-base font-bold text-ink">Data diri pemilik</h2>
          <p className="mt-1 text-sm text-muted">Nomor WhatsApp dipakai untuk mengirim pengingat.</p>

          <div className="mt-6 space-y-5">
            <div>
              <label htmlFor="ownerName" className="block text-sm font-semibold text-ink">
                Nama lengkap
              </label>
              <input
                id="ownerName"
                type="text"
                required
                readOnly={namaTerkunci}
                value={ownerName}
                onChange={(e) => setOwnerName(e.target.value)}
                className={`mt-2 block h-11 w-full rounded-xl border-0 px-3.5 text-sm ring-1 ring-inset transition-shadow placeholder:text-[#9aa5bd] focus:outline-none ${
                  namaTerkunci
                    ? 'cursor-not-allowed bg-[#f4f6fb] text-muted ring-hairline'
                    : 'bg-white text-ink ring-hairline focus:ring-2 focus:ring-inset focus:ring-brand'
                }`}
                placeholder="Nama Anda"
              />
            </div>
            <div>
              <label htmlFor="phoneNumber" className="block text-sm font-semibold text-ink">
                Nomor telepon (WhatsApp)
              </label>
              <input
                id="phoneNumber"
                type="tel"
                required
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                className="mt-2 block h-11 w-full rounded-xl border-0 bg-white px-3.5 text-sm text-ink ring-1 ring-inset ring-hairline transition-shadow placeholder:text-[#9aa5bd] focus:outline-none focus:ring-2 focus:ring-inset focus:ring-brand"
                placeholder="081234567890"
              />
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-hairline bg-white p-6 shadow-[0_1px_2px_rgba(11,16,32,0.03)] sm:p-8">
          <h2 className="text-base font-bold text-ink">Data rumah makan</h2>
          <p className="mt-1 text-sm text-muted">Lokasi dipakai sebagai konteks cuaca pada perhitungan.</p>

          <div className="mt-6 space-y-5">
            <div>
              <label htmlFor="restaurantName" className="block text-sm font-semibold text-ink">
                Nama rumah makan
              </label>
              <input
                id="restaurantName"
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="mt-2 block h-11 w-full rounded-xl border-0 bg-white px-3.5 text-sm text-ink ring-1 ring-inset ring-hairline transition-shadow placeholder:text-[#9aa5bd] focus:outline-none focus:ring-2 focus:ring-inset focus:ring-brand"
                placeholder="Contoh: Warung Prasmanan Berkah"
              />
            </div>
            <div>
              <label htmlFor="location" className="block text-sm font-semibold text-ink">
                Alamat lengkap
              </label>
              <input
                id="location"
                type="text"
                required
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="mt-2 block h-11 w-full rounded-xl border-0 bg-white px-3.5 text-sm text-ink ring-1 ring-inset ring-hairline transition-shadow placeholder:text-[#9aa5bd] focus:outline-none focus:ring-2 focus:ring-inset focus:ring-brand"
                placeholder="Jalan Raya No. 123, Kota"
              />
            </div>
            <div>
              <span className="block text-sm font-semibold text-ink">Hari operasional</span>
              <p className="mt-1 text-xs text-muted">Pilih hari warung Anda buka. Bisa lebih dari satu.</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {days.map((day) => {
                  const dipilih = operatingDays.includes(day);
                  return (
                    <button
                      key={day}
                      type="button"
                      onClick={() => toggleDay(day)}
                      aria-pressed={dipilih}
                      className={`inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-semibold transition-all focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand ${
                        dipilih
                          ? 'bg-brand text-white shadow-[0_4px_12px_-4px_rgba(27,77,255,0.5)]'
                          : 'bg-white text-muted ring-1 ring-inset ring-hairline hover:text-ink hover:ring-[#c9d4f5]'
                      }`}
                    >
                      {dipilih && (
                        <svg viewBox="0 0 24 24" fill="none" className="h-3.5 w-3.5" aria-hidden="true">
                          <path d="m5 13 4 4L19 7" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      )}
                      {day}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </section>

        <div className="flex pt-1 sm:justify-end">
          <button
            type="submit"
            disabled={loading || operatingDays.length === 0}
            className="inline-flex h-12 w-full items-center justify-center rounded-xl bg-brand px-8 text-sm font-bold text-white transition-all hover:bg-[#1540e0] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink disabled:cursor-not-allowed disabled:bg-[#c3ccdf] sm:w-auto"
          >
            {loading ? 'Menyimpan...' : 'Simpan dan lanjutkan'}
          </button>
        </div>
      </form>
    </div>
  );
}
