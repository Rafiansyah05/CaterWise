'use client';
export const dynamic = 'force-dynamic';
import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import { useRouter } from 'next/navigation';
import { PageLoader } from '@/components/ui/Spinner';

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

  const totalSurplus = items.reduce((jumlah, item) => {
    const qty = parseInt(String(item.actual_surplus) || '0', 10);
    return jumlah + (isNaN(qty) || qty < 0 ? 0 : qty);
  }, 0);

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
    return <PageLoader />;
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-12">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Distribusi Surplus</h1>
        <p className="mt-1 text-sm text-gray-500 sm:text-base">
          Salurkan makanan berlebih yang masih layak konsumsi kepada mitra food rescue.
        </p>
      </div>

      <div className="flex items-start gap-3 rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900">
        <svg viewBox="0 0 24 24" fill="none" className="mt-0.5 h-4 w-4 shrink-0 text-blue-600" aria-hidden="true">
          {isSalesRecapped ? (
            <path d="m5 13 4 4L19 7" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          ) : (
            <path d="M12 16v-4m0-4h.01M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          )}
        </svg>
        <p className="leading-relaxed">
          {isSalesRecapped ? (
            <>Penjualan hari ini sudah direkap. Angka estimasi dihitung dari produksi dikurangi penjualan, silakan sesuaikan bila jumlah fisiknya berbeda.</>
          ) : (
            <>Penjualan hari ini belum direkap, jadi estimasi belum bisa dihitung. Isi jumlah fisik sisa makanan secara langsung.</>
          )}
        </p>
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white shadow-sm">
        <div className="flex items-center justify-between gap-4 border-b border-gray-100 px-6 py-4">
          <div>
            <h2 className="font-bold text-gray-900">Sisa makanan hari ini</h2>
            <p className="mt-0.5 text-sm text-gray-500">Isi jumlah porsi yang benar-benar tersisa.</p>
          </div>
          {totalSurplus > 0 && (
            <span className="shrink-0 rounded-full bg-blue-50 px-3.5 py-1.5 text-sm font-bold tabular-nums text-blue-700">
              {totalSurplus} porsi
            </span>
          )}
        </div>

        {items.length === 0 ? (
          <p className="px-6 py-10 text-center text-sm text-gray-500">Belum ada menu aktif.</p>
        ) : (
          <div className="divide-y divide-gray-100">
            {items.map((item) => (
              <div key={item.menu_id} className="flex flex-wrap items-center gap-x-4 gap-y-3 px-6 py-4">
                <span className="min-w-0 flex-1 truncate font-medium text-gray-900">
                  {item.menu_name}
                </span>

                <span className="text-sm text-gray-500">
                  {item.estimated_surplus !== null ? (
                    <>Estimasi <span className="font-semibold tabular-nums text-gray-700">{item.estimated_surplus}</span></>
                  ) : (
                    'Belum ada estimasi'
                  )}
                </span>

                <input
                  type="number"
                  min="0"
                  value={item.actual_surplus}
                  onChange={(e) => handleSurplusChange(item.menu_id, e.target.value)}
                  placeholder="0"
                  aria-label={`Sisa ${item.menu_name}`}
                  className="h-11 w-24 shrink-0 rounded-xl border-0 bg-white px-3 text-right text-sm font-bold tabular-nums text-gray-900 ring-1 ring-inset ring-gray-200 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-600"
                />
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="font-bold text-gray-900">Konfirmasi kelayakan</h2>

        <label className="mt-4 flex cursor-pointer items-start gap-3 rounded-xl bg-gray-50 p-4">
          <input
            type="checkbox"
            checked={agreed}
            onChange={(e) => setAgreed(e.target.checked)}
            className="mt-0.5 h-5 w-5 shrink-0 cursor-pointer rounded border-gray-300 text-blue-600 focus:ring-blue-600"
          />
          <span className="text-sm leading-relaxed text-gray-600">
            Saya menyatakan makanan di atas <strong className="font-semibold text-gray-900">masih layak dan aman dikonsumsi</strong>.
            CaterWise tidak menilai kelayakan pangan secara otomatis.
          </span>
        </label>

        <button
          onClick={handleRequestPickup}
          disabled={!agreed || totalSurplus === 0}
          className="mt-5 inline-flex h-12 w-full items-center justify-center gap-2.5 rounded-xl bg-[#25D366] px-6 text-sm font-bold text-white transition-colors hover:bg-[#20bd5a] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-900 disabled:cursor-not-allowed disabled:bg-gray-300 sm:w-auto"
        >
          <svg viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5" aria-hidden="true">
            <path fillRule="evenodd" d="M1.5 4.5a3 3 0 0 1 3-3h1.372c.86 0 1.61.586 1.819 1.42l1.105 4.423a1.875 1.875 0 0 1-.694 1.955l-1.293.97c-.135.101-.164.249-.126.352a11.285 11.285 0 0 0 6.697 6.697c.103.038.25.009.352-.126l.97-1.293a1.875 1.875 0 0 1 1.955-.694l4.423 1.105c.834.209 1.42.959 1.42 1.82V19.5a3 3 0 0 1-3 3h-2.25C8.552 22.5 1.5 15.448 1.5 6.75V4.5Z" clipRule="evenodd" />
          </svg>
          Minta penjemputan
        </button>

        <p className="mt-3 text-xs leading-relaxed text-gray-400">
          Anda akan dialihkan ke WhatsApp Garda Pangan (0895-3378-47614) dengan pesan yang sudah terisi.
          Proses penjemputan selanjutnya ditangani langsung oleh mitra.
        </p>
      </div>
    </div>
  );
}
