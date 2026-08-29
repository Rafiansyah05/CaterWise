'use client';
export const dynamic = 'force-dynamic';
import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import { useRouter } from 'next/navigation';
import { FormattedNumberInput } from '@/components/ui/FormattedNumberInput';

export default function MenuSetupPage() {
  const [menus, setMenus] = useState<any[]>([
    { name: '', unit: 'Porsi', selling_price: '', hpp: '' },
    { name: '', unit: 'Porsi', selling_price: '', hpp: '' },
    { name: '', unit: 'Porsi', selling_price: '', hpp: '' }
  ]);
  const [deletedMenuIds, setDeletedMenuIds] = useState<string[]>([]);
  const [restaurantId, setRestaurantId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const router = useRouter();
  const supabase = createClient();
  const unitOptions = ['Porsi', 'PCS', 'KG', 'Liter', 'Sendok'];

  useEffect(() => {
    async function loadData() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      
      const { data: restaurant } = await supabase
        .from('restaurants')
        .select('id')
        .eq('owner_id', user.id)
        .single();
      
      if (restaurant) {
        setRestaurantId(restaurant.id);
        
        const { data: existingMenus } = await supabase
          .from('menus')
          .select('*')
          .eq('restaurant_id', restaurant.id)
          .order('created_at', { ascending: true });
          
        if (existingMenus && existingMenus.length > 0) {
          setMenus(existingMenus.map(m => ({
            id: m.id,
            name: m.name,
            unit: m.unit || 'Porsi',
            selling_price: m.selling_price.toString(),
            hpp: m.hpp.toString()
          })));
        }
      } else {
        router.push('/setup/profile');
      }
    }
    loadData();
  }, [supabase, router]);

  const handleMenuChange = (index: number, field: string, value: string) => {
    const newMenus = [...menus];
    newMenus[index] = { ...newMenus[index], [field]: value };
    setMenus(newMenus);
  };

  const addMenuRow = () => {
    setMenus([...menus, { name: '', unit: 'Porsi', selling_price: '', hpp: '' }]);
  };

  const removeMenuRow = (index: number) => {
    const targetMenu = menus[index];
    if (targetMenu.id) {
      setDeletedMenuIds([...deletedMenuIds, targetMenu.id]);
    }
    const newMenus = menus.filter((_, i) => i !== index);
    setMenus(newMenus);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const validMenus = menus.filter(m => m.name.trim() !== '' && m.selling_price !== '' && m.hpp !== '');
    
    if (validMenus.length === 0) {
      setError('Masukkan minimal 1 menu dengan data lengkap (Nama, Harga Jual, HPP).');
      setLoading(false);
      return;
    }

    if (!restaurantId) {
      setError('ID Restoran tidak ditemukan. Pastikan Anda sudah mengisi Profil.');
      setLoading(false);
      return;
    }

    if (deletedMenuIds.length > 0) {
      await supabase.from('menus').delete().in('id', deletedMenuIds);
    }

    const menusToUpdate = validMenus
      .filter(m => m.id)
      .map(m => ({
        id: m.id,
        restaurant_id: restaurantId,
        name: m.name,
        unit: m.unit || 'Porsi',
        selling_price: parseFloat(m.selling_price),
        hpp: parseFloat(m.hpp),
        is_active: true
      }));

    const menusToInsert = validMenus
      .filter(m => !m.id)
      .map(m => ({
        restaurant_id: restaurantId,
        name: m.name,
        unit: m.unit || 'Porsi',
        selling_price: parseFloat(m.selling_price),
        hpp: parseFloat(m.hpp),
        is_active: true
      }));

    let hasError = false;
    let errorMessage = '';

    if (menusToUpdate.length > 0) {
      const { error } = await supabase.from('menus').upsert(menusToUpdate);
      if (error) { hasError = true; errorMessage = error.message; }
    }

    if (!hasError && menusToInsert.length > 0) {
      const { error } = await supabase.from('menus').insert(menusToInsert);
      if (error) { hasError = true; errorMessage = error.message; }
    }

    if (hasError) {
      setError('Gagal menyimpan menu: ' + errorMessage);
      setLoading(false);
      return;
    }

    router.push('/setup/history');
  };

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-[1.6rem] font-bold leading-tight tracking-[-0.02em] text-ink sm:text-[2rem]">
          Tambahkan menu awal
        </h1>
        <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted sm:text-base">
          Harga jual dan HPP dipakai untuk menghitung estimasi keuntungan.
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
          <h2 className="text-base font-bold text-ink">Daftar menu</h2>
          <p className="mt-1 text-sm text-muted">Bisa ditambah atau diubah kapan saja setelah ini.</p>

          <div className="mt-6 space-y-4">
            <div className="hidden gap-4 px-1 text-xs font-semibold uppercase tracking-wider text-muted sm:grid sm:grid-cols-12">
              <div className="col-span-4">Nama menu</div>
              <div className="col-span-2">Satuan</div>
              <div className="col-span-3">Harga jual</div>
              <div className="col-span-2">HPP</div>
              <div className="col-span-1"></div>
            </div>

            {menus.map((menu, index) => (
              <div
                key={index}
                className="grid grid-cols-1 items-center gap-4 rounded-xl border border-hairline bg-gray-50 p-4 sm:grid-cols-12 sm:border-0 sm:bg-transparent sm:p-0"
              >
                <div className="sm:col-span-4">
                  <label className="mb-1 block text-xs font-medium text-muted sm:hidden">Nama menu</label>
                  <input
                    type="text"
                    value={menu.name}
                    onChange={(e) => handleMenuChange(index, 'name', e.target.value)}
                    className="block h-11 w-full rounded-xl border-0 bg-white px-3.5 text-sm text-ink ring-1 ring-inset ring-hairline placeholder:text-[#9aa5bd] focus:outline-none focus:ring-2 focus:ring-inset focus:ring-brand"
                    placeholder="Cth: Ayam Goreng"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="mb-1 block text-xs font-medium text-muted sm:hidden">Satuan</label>
                  <div className="relative">
                    <select
                      value={menu.unit}
                      onChange={(e) => handleMenuChange(index, 'unit', e.target.value)}
                      className="block h-11 w-full cursor-pointer appearance-none rounded-xl border-0 bg-white py-0 pl-3.5 pr-9 text-sm text-ink ring-1 ring-inset ring-hairline focus:outline-none focus:ring-2 focus:ring-inset focus:ring-brand"
                    >
                      {unitOptions.map((opt) => (
                        <option key={opt} value={opt}>{opt}</option>
                      ))}
                    </select>
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted"
                      aria-hidden="true"
                    >
                      <path d="m6 9 6 6 6-6" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </div>
                </div>
                <div className="sm:col-span-3">
                  <label className="mb-1 block text-xs font-medium text-muted sm:hidden">Harga jual (Rp)</label>
                  <FormattedNumberInput
                    value={menu.selling_price}
                    onChange={(val) => handleMenuChange(index, 'selling_price', val)}
                    className="block h-11 w-full rounded-xl border-0 bg-white px-3.5 text-sm text-ink ring-1 ring-inset ring-hairline placeholder:text-[#9aa5bd] focus:outline-none focus:ring-2 focus:ring-inset focus:ring-brand"
                    placeholder="15.000"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="mb-1 block text-xs font-medium text-muted sm:hidden">HPP (Rp)</label>
                  <FormattedNumberInput
                    value={menu.hpp}
                    onChange={(val) => handleMenuChange(index, 'hpp', val)}
                    className="block h-11 w-full rounded-xl border-0 bg-white px-3.5 text-sm text-ink ring-1 ring-inset ring-hairline placeholder:text-[#9aa5bd] focus:outline-none focus:ring-2 focus:ring-inset focus:ring-brand"
                    placeholder="9.000"
                  />
                </div>
                <div className="mt-1 text-right sm:col-span-1 sm:mt-0 sm:text-center">
                  {menus.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeMenuRow(index)}
                      title="Hapus baris"
                      className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-[#9aa5bd] transition-colors hover:bg-red-50 hover:text-red-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
                    >
                      <svg viewBox="0 0 24 24" fill="none" strokeWidth={1.8} stroke="currentColor" className="h-5 w-5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                      </svg>
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          <button
            type="button"
            onClick={addMenuRow}
            className="mt-5 inline-flex items-center gap-1.5 rounded-lg text-sm font-semibold text-brand transition-colors hover:text-[#1540e0] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
          >
            <svg viewBox="0 0 24 24" fill="none" strokeWidth={2.5} stroke="currentColor" className="h-4 w-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            Tambah baris menu
          </button>
        </section>

        <div className="flex flex-col gap-3 pt-1 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={() => router.push('/setup/profile')}
            className="inline-flex h-12 items-center justify-center rounded-xl bg-white px-6 text-sm font-bold text-ink ring-1 ring-inset ring-hairline transition-colors hover:ring-[#c9d4f5] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
          >
            Kembali
          </button>
          <button
            type="submit"
            disabled={loading}
            className="inline-flex h-12 items-center justify-center rounded-xl bg-brand px-8 text-sm font-bold text-white transition-all hover:bg-[#1540e0] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink disabled:cursor-not-allowed disabled:bg-[#c3ccdf]"
          >
            {loading ? 'Menyimpan...' : 'Simpan dan lanjutkan'}
          </button>
        </div>
      </form>
    </div>
  );
}
