'use client';
export const dynamic = 'force-dynamic';
import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import { useRouter } from 'next/navigation';

type SurplusItem = {
  menu_id: string;
  menu_name: string;
  production: number | null;
  sold: number | null;
  estimated_surplus: number | null;
  actual_surplus: number | string;
};

export default function SurplusPage() {
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<SurplusItem[]>([]);
  const [restaurantName, setRestaurantName] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [location, setLocation] = useState('');
  const [agreed, setAgreed] = useState(false);
  const [isSalesRecapped, setIsSalesRecapped] = useState(false);

  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    async function fetchData() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          router.push('/login');
          return;
        }

        const { data: profile } = await supabase
          .from('profiles')
          .select('full_name')
          .eq('id', session.user.id)
          .single();
        
        const { data: restaurant } = await supabase
          .from('restaurants')
          .select('id, name, location')
          .eq('owner_id', session.user.id)
          .single();

        if (profile) setOwnerName(profile.full_name || session.user.user_metadata?.name || '');
        if (restaurant) {
          setRestaurantName(restaurant.name || '');
          setLocation(restaurant.location || '');
        }

        if (!restaurant) {
          setLoading(false);
          return;
        }

        const { data: menus } = await supabase
          .from('menus')
          .select('id, name')
          .eq('restaurant_id', restaurant.id)
          .eq('is_active', true);

        if (!menus) return;

        const targetDate = new Date();
        const year = targetDate.getFullYear();
        const month = String(targetDate.getMonth() + 1).padStart(2, '0');
        const day = String(targetDate.getDate()).padStart(2, '0');
        const dateStr = `${year}-${month}-${day}`;

        const { data: productions } = await supabase
          .from('daily_production')
          .select('menu_id, quantity')
          .eq('production_date', dateStr);

        const { data: sales } = await supabase
          .from('daily_sales')
          .select('menu_id, quantity_sold')
          .eq('sales_date', dateStr);

        let anySalesRecapped = false;
        
        const surplusList: SurplusItem[] = menus.map(menu => {
          const prodRecord = productions?.find(p => p.menu_id === menu.id);
          const salesRecord = sales?.find(s => s.menu_id === menu.id);
          
          const prodQty = prodRecord ? prodRecord.quantity : null;
          const soldQty = salesRecord ? salesRecord.quantity_sold : null;
          
          if (soldQty !== null) anySalesRecapped = true;

          let estSurplus = null;
          if (prodQty !== null && soldQty !== null) {
            estSurplus = Math.max(0, prodQty - soldQty);
          } else if (prodQty !== null && soldQty === null) {
            estSurplus = prodQty;
          }

          return {
            menu_id: menu.id,
            menu_name: menu.name,
            production: prodQty,
            sold: soldQty,
            estimated_surplus: estSurplus !== null && soldQty !== null ? estSurplus : null,
            actual_surplus: estSurplus !== null && soldQty !== null ? estSurplus : ''
          };
        });

        setIsSalesRecapped(anySalesRecapped);
        setItems(surplusList);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    
    fetchData();
  }, [supabase, router]);

  const handleSurplusChange = (menu_id: string, value: string) => {
    setItems(items.map(item => 
      item.menu_id === menu_id ? { ...item, actual_surplus: value } : item
    ));
  };

  const handleRequestPickup = () => {
    const surplusItems = items.filter(item => {
      const qty = parseInt(String(item.actual_surplus) || '0');
      return !isNaN(qty) && qty > 0;
    });

    if (surplusItems.length === 0) {
      alert("Harap masukkan setidaknya satu menu dengan jumlah surplus > 0");
      return;
    }

    let message = `Halo Garda Pangan, saya ingin mendonasikan surplus makanan dari restoran saya.\n\n`;
    message += `*Informasi Restoran:*\n`;
    message += `- Nama Restoran: ${restaurantName}\n`;
    message += `- Pemilik: ${ownerName}\n`;
    message += `- Lokasi: ${location}\n\n`;
    message += `*Detail Makanan (Porsi):*\n`;
    
    surplusItems.forEach(item => {
      message += `- ${item.actual_surplus} porsi ${item.menu_name}\n`;
    });

    message += `\nApakah bisa dijemput hari ini? Terima kasih.`;

    const encodedMessage = encodeURIComponent(message);
    const waUrl = `https://wa.me/62895337847614?text=${encodedMessage}`;
    
    window.open(waUrl, '_blank');
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-12">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-bold text-gray-900">Distribusi Surplus Makanan</h1>
        <p className="text-gray-500">Donasikan makanan berlebih yang masih layak konsumsi kepada mitra food rescue.</p>
      </div>

      <div className="bg-blue-50 border border-blue-200 text-blue-900 p-4 rounded-xl flex items-start gap-3">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6 flex-shrink-0 text-blue-600 mt-0.5">
          <path fillRule="evenodd" d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12Zm8.706-1.442c1.146-.573 2.437.463 2.126 1.706l-.709 2.836.042-.02a.75.75 0 0 1 .67 1.34l-.04.022c-1.147.573-2.438-.463-2.127-1.706l.71-2.836-.042.02a.75.75 0 1 1-.671-1.34l.041-.022ZM12 9a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5Z" clipRule="evenodd" />
        </svg>
        <div className="text-sm">
          <p className="font-bold mb-1">Status Penjualan Hari Ini:</p>
          {isSalesRecapped ? (
            <p>Anda <strong>sudah</strong> melakukan rekap penjualan harian. Angka estimasi surplus di bawah otomatis dihitung dari <em>(Produksi - Penjualan)</em>. Anda tetap dapat memverifikasi dan menyesuaikan jumlah fisik aktualnya.</p>
          ) : (
            <p>Anda <strong>belum</strong> merekap penjualan hari ini. Silakan cek sisa makanan dan input secara manual pada kolom "Surplus Fisik Aktual" untuk melakukan distribusi mendadak (Mid-Day).</p>
          )}
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
          <h2 className="font-semibold text-gray-800">Daftar Potensi Surplus</h2>
        </div>
        <div className="p-6">
          {items.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              Belum ada data menu aktif.
            </div>
          ) : (
            <div className="space-y-4">
              <div className="hidden sm:grid sm:grid-cols-12 gap-4 text-xs font-semibold text-gray-500 uppercase pb-2 border-b">
                <div className="sm:col-span-6">Menu</div>
                <div className="sm:col-span-3 text-center">Estimasi Sistem</div>
                <div className="sm:col-span-3 text-center">Fisik Aktual</div>
              </div>

              {items.map((item) => (
                <div
                  key={item.menu_id}
                  className="grid grid-cols-1 sm:grid-cols-12 gap-3 sm:gap-4 sm:items-center py-3 sm:py-2 border-b border-gray-100 last:border-b-0 sm:border-b-0"
                >
                  <div className="sm:col-span-6 font-medium text-gray-900">
                    {item.menu_name}
                  </div>
                  <div className="flex items-center justify-between gap-3 sm:block sm:col-span-3 sm:text-center">
                    <span className="text-xs font-medium text-gray-500 uppercase sm:hidden">Estimasi Sistem</span>
                    {item.estimated_surplus !== null ? (
                      <span className="inline-flex items-center justify-center bg-gray-100 px-2.5 py-1 rounded-md text-gray-700 text-sm font-medium">
                        {item.estimated_surplus} porsi
                      </span>
                    ) : (
                      <span className="text-gray-400 text-sm">-</span>
                    )}
                  </div>
                  <div className="flex items-center justify-between gap-3 sm:block sm:col-span-3">
                    <span className="text-xs font-medium text-gray-500 uppercase sm:hidden">Fisik Aktual</span>
                    <input
                      type="number"
                      min="0"
                      value={item.actual_surplus}
                      onChange={(e) => handleSurplusChange(item.menu_id, e.target.value)}
                      placeholder="0"
                      className="w-28 sm:w-full text-center rounded-lg border-0 py-2 text-gray-900 ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-blue-600 sm:text-sm font-bold"
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-5">
        <h3 className="font-bold text-gray-900">Konfirmasi Kelayakan & Pengiriman</h3>
        
        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={agreed}
            onChange={(e) => setAgreed(e.target.checked)}
            className="mt-1 h-5 w-5 rounded border-gray-300 text-blue-600 focus:ring-blue-600 cursor-pointer"
          />
          <span className="text-sm text-gray-600 leading-relaxed">
            Saya menyatakan bahwa makanan surplus yang dicantumkan di atas <strong>masih dalam kondisi sangat baik, aman dikonsumsi, belum basi, dan memenuhi standar kebersihan pangan</strong>. Sistem CaterWise tidak menjamin kelayakan makanan secara otomatis.
          </span>
        </label>

        <div className="pt-4 border-t border-gray-100">
          <button
            onClick={handleRequestPickup}
            disabled={!agreed}
            className="w-full sm:w-auto flex items-center justify-center gap-2 bg-[#25D366] hover:bg-[#20bd5a] text-white px-6 py-3 rounded-lg font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
              <path fillRule="evenodd" d="M1.5 4.5a3 3 0 0 1 3-3h1.372c.86 0 1.61.586 1.819 1.42l1.105 4.423a1.875 1.875 0 0 1-.694 1.955l-1.293.97c-.135.101-.164.249-.126.352a11.285 11.285 0 0 0 6.697 6.697c.103.038.25.009.352-.126l.97-1.293a1.875 1.875 0 0 1 1.955-.694l4.423 1.105c.834.209 1.42.959 1.42 1.82V19.5a3 3 0 0 1-3 3h-2.25C8.552 22.5 1.5 15.448 1.5 6.75V4.5Z" clipRule="evenodd" />
            </svg>
            Request Penjemputan via WhatsApp
          </button>
          <p className="text-xs text-gray-400 mt-3">
            *Dengan mengklik tombol di atas, Anda akan dialihkan ke WhatsApp Garda Pangan (0895-3378-47614) dengan draft pesan yang sudah otomatis terisi. Proses distribusi selanjutnya ditangani secara langsung oleh pihak mitra.
          </p>
        </div>
      </div>
    </div>
  );
}
