'use client';
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
  const [success, setSuccess] = useState('');
  
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
        
        // Load existing menus if user goes back
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

    // Filter baris kosong
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

    // Eksekusi penghapusan menu yang di-remove oleh user
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
    } else {
      setSuccess('Menu awal berhasil disimpan! Melanjutkan ke Pengaturan Riwayat...');
      setTimeout(() => {
        router.push('/setup/history');
      }, 1000);
    }
  };

  return (
    <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-100">
      <h2 className="text-2xl font-bold text-gray-900 mb-2">Tambahkan Menu Awal</h2>
      <p className="text-gray-500 mb-8">Masukkan daftar menu masakan yang biasa Anda sajikan. Harga Jual dan HPP (Harga Pokok Penjualan) diperlukan agar CaterWise dapat menghitung estimasi keuntungan.</p>
      
      {error && <div className="mb-4 text-red-500 text-sm bg-red-50 p-3 rounded-lg">{error}</div>}
      {success && <div className="mb-4 text-green-600 text-sm bg-green-50 p-3 rounded-lg">{success}</div>}
      
      <form onSubmit={handleSave} className="space-y-6">
        
        <div className="space-y-4">
          <div className="grid grid-cols-12 gap-4 font-semibold text-gray-700 text-sm px-2 hidden sm:grid">
            <div className="col-span-4">Nama Menu</div>
            <div className="col-span-2">Satuan</div>
            <div className="col-span-3">Harga Jual (Rp)</div>
            <div className="col-span-2">HPP (Rp)</div>
            <div className="col-span-1"></div>
          </div>

          {menus.map((menu, index) => (
            <div key={index} className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-center bg-gray-50 sm:bg-transparent p-4 sm:p-0 rounded-lg border sm:border-0 border-gray-200">
              <div className="sm:col-span-4">
                <label className="block sm:hidden text-xs text-gray-500 mb-1">Nama Menu</label>
                <input 
                  type="text" 
                  value={menu.name}
                  onChange={(e) => handleMenuChange(index, 'name', e.target.value)}
                  className="block w-full rounded-lg border-0 py-2 px-3 text-gray-900 ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-blue-600 sm:text-sm" 
                  placeholder="Cth: Ayam Goreng" 
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block sm:hidden text-xs text-gray-500 mb-1">Satuan</label>
                <select
                  value={menu.unit}
                  onChange={(e) => handleMenuChange(index, 'unit', e.target.value)}
                  className="block w-full rounded-lg border-0 py-2 px-3 text-gray-900 ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-blue-600 sm:text-sm"
                >
                  {unitOptions.map(opt => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
              </div>
              <div className="sm:col-span-3">
                <label className="block sm:hidden text-xs text-gray-500 mb-1">Harga Jual (Rp)</label>
                <FormattedNumberInput 
                  value={menu.selling_price}
                  onChange={(val) => handleMenuChange(index, 'selling_price', val)}
                  className="block w-full rounded-lg border-0 py-2 px-3 text-gray-900 ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-blue-600 sm:text-sm" 
                  placeholder="15.000" 
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block sm:hidden text-xs text-gray-500 mb-1">HPP / Modal (Rp)</label>
                <FormattedNumberInput 
                  value={menu.hpp}
                  onChange={(val) => handleMenuChange(index, 'hpp', val)}
                  className="block w-full rounded-lg border-0 py-2 px-3 text-gray-900 ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-blue-600 sm:text-sm" 
                  placeholder="9.000" 
                />
              </div>
              <div className="sm:col-span-1 text-right sm:text-center mt-2 sm:mt-0">
                {menus.length > 1 && (
                  <button type="button" onClick={() => removeMenuRow(index)} className="text-red-500 hover:text-red-700 p-2">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 inline">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                    </svg>
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>

        <div>
          <button type="button" onClick={addMenuRow} className="text-sm font-semibold text-blue-600 hover:text-blue-500 flex items-center gap-1">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            Tambah Baris Menu
          </button>
        </div>

        <div className="flex gap-4 pt-6 border-t border-gray-100">
          <button 
            type="button" 
            onClick={() => router.push('/setup/profile')} 
            className="px-6 py-3 rounded-lg border border-gray-300 text-gray-700 font-semibold hover:bg-gray-50 transition-all text-sm"
          >
            Kembali
          </button>
          <button type="submit" disabled={loading} className="flex-1 rounded-lg bg-blue-600 px-4 py-3 text-sm font-semibold text-white shadow-sm transition-all hover:bg-blue-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-600 disabled:opacity-50">
            {loading ? 'Menyimpan...' : 'Simpan dan Lanjutkan ke Riwayat Penjualan'}
          </button>
        </div>
      </form>
    </div>
  );
}
