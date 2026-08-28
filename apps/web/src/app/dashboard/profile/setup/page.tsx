'use client';
export const dynamic = 'force-dynamic';
import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import { useRouter } from 'next/navigation';

export default function RestaurantSetupPage() {
  // Owner state
  const [ownerName, setOwnerName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');

  // Restaurant state
  const [name, setName] = useState('');
  const [location, setLocation] = useState('');
  const [operatingDays, setOperatingDays] = useState<string[]>([]);
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  const router = useRouter();
  const supabase = createClient();
  const days = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu'];

  useEffect(() => {
    async function loadData() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Load Profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (profile) {
        setOwnerName(profile.full_name || user.user_metadata?.name || '');
        setPhoneNumber(profile.phone_number || '');
      } else {
        setOwnerName(user.user_metadata?.name || '');
      }

      // Load Restaurant
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
    setSuccess('');

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Save Profile (Owner Details)
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

    // Check if restaurant exists
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

    setLoading(false);
    if (saveError) {
      setError('Gagal menyimpan restoran: ' + saveError.message);
    } else {
      setSuccess('Data profil dan restoran berhasil disimpan!');
      // Route to dashboard since they want to go to dashboard after setup
      setTimeout(() => {
        router.push('/');
      }, 1000);
    }
  };

  return (
    <div className="max-w-2xl mx-auto bg-white p-8 rounded-xl shadow-sm border border-gray-100">
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Lengkapi Profil & Restoran</h2>
      {error && <div className="mb-4 text-red-500 text-sm bg-red-50 p-3 rounded-lg">{error}</div>}
      {success && <div className="mb-4 text-green-600 text-sm bg-green-50 p-3 rounded-lg">{success}</div>}
      
      <form onSubmit={handleSave} className="space-y-8">
        
        {/* Seksi Data Diri */}
        <section>
          <h3 className="text-lg font-semibold text-gray-800 mb-4 border-b pb-2">Data Diri Pemilik</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium leading-6 text-gray-900">Nama Lengkap</label>
              <input type="text" required value={ownerName} onChange={e => setOwnerName(e.target.value)} className="mt-2 block w-full rounded-lg border-0 py-2 px-3 text-gray-900 ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-blue-600 sm:text-sm" placeholder="Nama Anda" />
            </div>
            <div>
              <label className="block text-sm font-medium leading-6 text-gray-900">Nomor Telepon (WhatsApp)</label>
              <input type="tel" required value={phoneNumber} onChange={e => setPhoneNumber(e.target.value)} className="mt-2 block w-full rounded-lg border-0 py-2 px-3 text-gray-900 ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-blue-600 sm:text-sm" placeholder="081234567890" />
            </div>
          </div>
        </section>

        {/* Seksi Data Restoran */}
        <section>
          <h3 className="text-lg font-semibold text-gray-800 mb-4 border-b pb-2">Data Restoran Prasmanan</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium leading-6 text-gray-900">Nama Rumah Makan</label>
              <input type="text" required value={name} onChange={e => setName(e.target.value)} className="mt-2 block w-full rounded-lg border-0 py-2 px-3 text-gray-900 ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-blue-600 sm:text-sm" placeholder="Contoh: Warung Prasmanan Berkah" />
            </div>
            <div>
              <label className="block text-sm font-medium leading-6 text-gray-900">Alamat Lengkap (Lokasi)</label>
              <input type="text" required value={location} onChange={e => setLocation(e.target.value)} className="mt-2 block w-full rounded-lg border-0 py-2 px-3 text-gray-900 ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-blue-600 sm:text-sm" placeholder="Jalan Raya No. 123, Kota" />
            </div>
            <div>
              <label className="block text-sm font-medium leading-6 text-gray-900 mb-2">Hari Operasional Buka</label>
              <div className="flex flex-wrap gap-2">
                {days.map(day => (
                  <button
                    key={day}
                    type="button"
                    onClick={() => toggleDay(day)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${operatingDays.includes(day) ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'}`}
                  >
                    {day}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </section>

        <button type="submit" disabled={loading || operatingDays.length === 0} className="w-full rounded-lg bg-blue-600 px-4 py-3 text-sm font-semibold text-white shadow-sm transition-all hover:bg-blue-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-600 disabled:opacity-50">
          {loading ? 'Menyimpan...' : 'Simpan dan Lanjutkan ke Dashboard'}
        </button>
      </form>
    </div>
  );
}
