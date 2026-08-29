'use client';
export const dynamic = 'force-dynamic';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import { FormattedNumberInput } from '@/components/ui/FormattedNumberInput';
import { Spinner } from '@/components/ui/Spinner';

interface Menu {
  id: string;
  name: string;
  unit: string;
}

interface HistorySummary {
  date: string;
  totalQuantity: number;
  menusCount: number;
}

export default function SalesPage() {
  const router = useRouter();
  const supabase = createClient();

  const [menus, setMenus] = useState<Menu[]>([]);
  const [salesData, setSalesData] = useState<Record<string, string>>({});
  const [productionData, setProductionData] = useState<Record<string, string>>({});
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toLocaleDateString('en-CA'));

  const [history, setHistory] = useState<HistorySummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [hasTomorrowStock, setHasTomorrowStock] = useState(false);
  const [success, setSuccess] = useState('');
  const [restaurantId, setRestaurantId] = useState<string | null>(null);

  useEffect(() => {
    async function initData() {
      setLoading(true);
      try {
        const { data: { session } } = await supabase.auth.getSession();

        if (!session) {
          router.push('/login');
          return;
        }

        const { data: restaurants } = await supabase
          .from('restaurants')
          .select('id')
          .eq('owner_id', session.user.id)
          .limit(1);
          
        const restaurant = restaurants?.[0];

        if (restaurant) {
          setRestaurantId(restaurant.id);
          await Promise.all([
            loadMenus(restaurant.id),
            loadHistory(restaurant.id)
          ]);
          
          const tomorrow = new Date();
          tomorrow.setDate(tomorrow.getDate() + 1);
          const tmrStr = tomorrow.getFullYear() + '-' + String(tomorrow.getMonth() + 1).padStart(2, '0') + '-' + String(tomorrow.getDate()).padStart(2, '0');
          const { count } = await supabase
            .from('daily_production')
            .select('*', { count: 'exact', head: true })
            .eq('production_date', tmrStr);
          if (count && count > 0) setHasTomorrowStock(true);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    initData();
  }, [supabase, router]);

  useEffect(() => {
    if (restaurantId) {
      loadSalesForDate(selectedDate, menus);
    }
  }, [selectedDate, restaurantId, menus.length]);

  const loadMenus = async (restId: string) => {
    const { data: menuData } = await supabase
      .from('menus')
      .select('id, name, unit')
      .eq('restaurant_id', restId)
      .eq('is_active', true)
      .order('name');

    if (menuData) {
      setMenus(menuData);
    }
  };

  const loadHistory = async (restId: string) => {
    const { data: salesData } = await supabase
      .from('daily_sales')
      .select(`sales_date, quantity_sold, menus!inner(id)`)
      .eq('menus.restaurant_id', restId)
      .order('sales_date', { ascending: false });

    if (salesData) {
      const summaryMap: Record<string, HistorySummary> = {};
      salesData.forEach((item: any) => {
        const date = item.sales_date;
        if (!summaryMap[date]) {
          summaryMap[date] = { date: date, totalQuantity: 0, menusCount: 0 };
        }
        summaryMap[date].totalQuantity += item.quantity_sold;
        summaryMap[date].menusCount += 1;
      });

      const summaryArray = Object.values(summaryMap)
        .sort((a, c) => new Date(c.date).getTime() - new Date(a.date).getTime())
        .slice(0, 14);

      setHistory(summaryArray);
    }
  };

  const loadSalesForDate = async (date: string, currentMenus: Menu[]) => {
    if (currentMenus.length === 0) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const { data: existingSales, error: salesError } = await supabase
        .from('daily_sales')
        .select('menu_id, quantity_sold')
        .in('menu_id', currentMenus.map(m => m.id))
        .eq('sales_date', date);

      if (salesError) {
        if (Object.keys(salesError).length > 0) {
          console.warn('Error fetching sales:', salesError);
          setError('Gagal memuat data penjualan untuk tanggal ini.');
        }
      } else if (existingSales) {
        const newSalesData: Record<string, string> = {};
        existingSales.forEach((item) => {
          newSalesData[item.menu_id] = item.quantity_sold.toString();
        });
        setSalesData(newSalesData);
      }

      const { data: existingProduction, error: prodError } = await supabase
        .from('daily_production')
        .select('menu_id, quantity')
        .in('menu_id', currentMenus.map(m => m.id))
        .eq('production_date', date);

      if (!prodError && existingProduction) {
        const newProdData: Record<string, string> = {};
        existingProduction.forEach((item) => {
          newProdData[item.menu_id] = item.quantity.toString();
        });
        setProductionData(newProdData);
      }
    } catch (err) {
      console.error("Error in loadSalesForDate:", err);
      setError('Terjadi kesalahan saat memuat data.');
    } finally {
      setLoading(false);
    }
  };

  const handleSaleChange = (menuId: string, value: string) => {
    setSalesData(prev => ({ ...prev, [menuId]: value }));
  };

  const handleProductionChange = (menuId: string, value: string) => {
    setProductionData(prev => ({ ...prev, [menuId]: value }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSuccess('');

    try {
      const salesPayload = menus.map(menu => ({
        menu_id: menu.id,
        sales_date: selectedDate,
        quantity_sold: parseInt(salesData[menu.id] || '0', 10)
      }));
      const { error: salesErr } = await supabase
        .from('daily_sales')
        .upsert(salesPayload, { onConflict: 'menu_id, sales_date' });
      if (salesErr) throw salesErr;

      const prodPayload = menus.map(menu => ({
        menu_id: menu.id,
        production_date: selectedDate,
        quantity: parseInt(productionData[menu.id] || '0', 10)
      }));
      const { error: prodErr } = await supabase
        .from('daily_production')
        .upsert(prodPayload, { onConflict: 'menu_id, production_date' });
      if (prodErr) throw prodErr;

      setSuccess('Data penjualan dan stok berhasil disimpan!');
      if (restaurantId) {
        await loadHistory(restaurantId);
      }

      setTimeout(() => setSuccess(''), 4000);
    } catch (err: any) {
      setError(err.message || 'Gagal menyimpan data');
    } finally {
      setSaving(false);
    }
  };

  const formatDate = (dateString: string) => {
    const options: Intl.DateTimeFormatOptions = {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    };
    return new Date(dateString).toLocaleDateString('id-ID', options);
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-12">
      <div className="flex flex-col gap-1 border-b border-gray-100 pb-4">
        <h1 className="text-2xl font-bold text-gray-900">Input Data Harian</h1>
        <p className="text-gray-500 text-sm">Catat stok dan penjualan atau pantau prediksi yang sudah disimpan.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-3">
          <div className="bg-white rounded-2xl border border-gray-200/60 shadow-sm overflow-hidden">
            <div className="bg-gray-50/50 p-4 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 text-blue-600 rounded-lg">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8 14V6m8 8v-4m-4 4v6M0 22h24m-2 0v1a2 2 0 01-2 2H2a2 2 0 01-2-2v-1h24z" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">Form Penjualan</h3>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                <div className="flex items-center gap-3">
                  <label className="text-sm font-medium text-gray-700">Tanggal:</label>
                  <input
                    type="date"
                    onClick={(e) => {
                      const el = e.currentTarget;
                      if (typeof el.showPicker === 'function') {
                        try { el.showPicker(); } catch {}
                      }
                    }}
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="block w-full sm:w-48 rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-blue-600 sm:text-sm sm:leading-6"
                    max={new Date(Date.now() + 86400000).toISOString().split('T')[0]}
                  />
                </div>
                {hasTomorrowStock && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-100">
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" /></svg>
                    Stok besok telah dijadwalkan
                  </span>
                )}
              </div>
            </div>

            <form onSubmit={handleSave} className="p-5 sm:p-6 flex flex-col gap-6">
              {error && <div className="text-red-700 text-sm bg-red-50 p-3 rounded-lg border border-red-200 flex items-start gap-3"><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 shrink-0" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 0011v 4a1 1 0 102 0v4-1a1 1 0 0011z" clipRule="evenodd" /></svg>{error}</div>}
              {success && <div className="text-green-700 text-sm bg-green-50 p-3 rounded-lg border border-green-200 flex items-start gap-3"><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 shrink-0" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>{success}</div>}

              {loading ? (
                <div className="flex items-center justify-center py-20">
                  <Spinner />
                </div>
              ) : menus.length === 0 ? (
                <div className="text-center py-16 bg-gray-50 rounded-lg border border-dashed border-gray-300">
                  <p className="text-gray-900 font-medium mb-1">Tidak ada menu aktif</p>
                  <p className="text-gray-500 text-sm mb-4">Anda belum memiliki menu yang siap dijual.</p>
                  <button
                    type="button"
                    onClick={() => router.push('/dashboard/menu')}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    Atur Menu Sekarang
                  </button>
                </div>
              ) : (
                <div>
                  <div className="hidden sm:grid sm:grid-cols-12 gap-4 font-medium text-gray-500 text-xs uppercase tracking-wider px-2 mb-2">
                    <div className="col-span-4">Daftar Menu</div>
                    <div className="col-span-4 text-right">Stok (Awal)</div>
                    <div className="col-span-4 text-right">Jumlah Terjual</div>
                  </div>

                  <div className="border-t border-gray-100">
                    {menus.map((menu) => (
                      <div key={menu.id} className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-center py-3 sm:py-4 px-2 border-b border-gray-100 hover:bg-gray-50/50 transition-colors">
                        <div className="sm:col-span-4 flex flex-col justify-center">
                          <span className="font-medium text-gray-900">{menu.name}</span>
                          <span className="text-xs text-gray-500 mt-0.5">
                            Satuan: {menu.unit}
                          </span>
                        </div>

                        <div className="sm:col-span-4 relative mt-1 sm:mt-0">
                          <label className="block sm:hidden text-xs font-medium text-gray-500 mb-1.5">Stok</label>
                          <div className="relative flex rounded-lg ring-1 ring-inset ring-gray-200 focus-within:ring-2 focus-within:ring-inset focus-within:ring-blue-600 overflow-hidden bg-white transition-all">
                            <FormattedNumberInput
                              value={productionData[menu.id] || ''}
                              onChange={(val) => handleProductionChange(menu.id, val)}
                              className="block w-full border-0 bg-transparent py-2 pl-3 pr-2 text-gray-900 focus:ring-0 text-right sm:text-base"
                              placeholder="0"
                            />
                            <div className="flex items-center justify-center bg-gray-50 px-3 border-l border-gray-200 text-sm text-gray-500 select-none min-w-[3.5rem]">
                              {menu.unit}
                            </div>
                          </div>
                        </div>

                        <div className="sm:col-span-4 relative mt-1 sm:mt-0">
                          <label className="block sm:hidden text-xs font-medium text-gray-500 mb-1.5">Jumlah Terjual</label>
                          <div className="relative flex rounded-lg ring-1 ring-inset ring-gray-200 focus-within:ring-2 focus-within:ring-inset focus-within:ring-blue-600 overflow-hidden bg-white transition-all">
                            <FormattedNumberInput
                              value={salesData[menu.id] || ''}
                              onChange={(val) => handleSaleChange(menu.id, val)}
                              className="block w-full border-0 bg-transparent py-2 pl-3 pr-2 text-gray-900 focus:ring-0 text-right sm:text-base"
                              placeholder="0"
                            />
                            <div className="flex items-center justify-center bg-gray-50 px-3 border-l border-gray-200 text-sm text-gray-500 select-none min-w-[3.5rem]">
                              {menu.unit}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {!loading && menus.length > 0 && (
                <div className="flex justify-end pt-4">
                  <button
                    type="submit"
                    disabled={saving}
                    className="rounded-lg bg-blue-600 px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-blue-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-600 disabled:opacity-50 flex items-center gap-2"
                  >
                    {saving && (
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                    )}
                    {saving ? 'Menyimpan...' : 'Simpan Data'}
                  </button>
                </div>
              )}
            </form>
          </div>
        </div>

        <div className="lg:col-span-1">
          <div className="bg-gray-50/50 p-5 rounded-xl border border-gray-200/60 sticky top-6">
            <div className="flex items-center gap-2 mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
              </svg>
              <h3 className="font-medium text-gray-900">Riwayat Terakhir</h3>
            </div>

            {history.length === 0 ? (
              <div className="text-center py-6">
                <p className="text-sm text-gray-500">Belum ada data penjualan.</p>
              </div>
            ) : (
              <div className="space-y-2.5 max-h-[calc(100vh-12rem)] overflow-y-auto pr-1">
                {history.map((item, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setSelectedDate(item.date)}
                    className={`w-full text-left p-3 rounded-lg border transition-colors ${selectedDate === item.date
                      ? 'bg-blue-50/50 border-blue-600'
                      : 'bg-white border-gray-200 hover:border-gray-300'
                      }`}
                  >
                    <div className={`text-sm font-medium mb-1 truncate ${selectedDate === item.date ? 'text-blue-900' : 'text-gray-900'}`}>
                      {formatDate(item.date)}
                    </div>
                    <div className="flex justify-between items-center text-xs mt-1.5">
                      <span className="text-gray-500">{item.menusCount} Menu</span>
                      <span className={selectedDate === item.date ? 'text-blue-700 font-medium' : 'text-gray-600'}>
                        {item.totalQuantity.toLocaleString('id-ID')} items
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
