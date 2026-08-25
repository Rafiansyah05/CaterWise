'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import { FormattedNumberInput } from '@/components/ui/FormattedNumberInput';

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
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toLocaleDateString('en-CA') // YYYY-MM-DD format
  );

  const [history, setHistory] = useState<HistorySummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [restaurantId, setRestaurantId] = useState<string | null>(null);

  useEffect(() => {
    async function initData() {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        router.push('/login');
        return;
      }

      const { data: restaurant } = await supabase
        .from('restaurants')
        .select('id')
        .eq('owner_id', session.user.id)
        .single();

      if (restaurant) {
        setRestaurantId(restaurant.id);

        // Fetch active menus
        const { data: activeMenus } = await supabase
          .from('menus')
          .select('id, name, unit')
          .eq('restaurant_id', restaurant.id)
          .eq('is_active', true)
          .order('created_at', { ascending: true });

        if (activeMenus) {
          setMenus(activeMenus);
        }

        loadHistorySummary();
      }
      setLoading(false);
    }

    initData();
  }, [supabase, router]);

  async function loadHistorySummary() {
    // Memuat riwayat penjualan agregat (7 hari terakhir yang ada datanya)
    const { data } = await supabase
      .from('daily_sales')
      .select('sales_date, quantity_sold')
      .order('sales_date', { ascending: false });

    if (data) {
      const grouped = data.reduce((acc, curr) => {
        if (!acc[curr.sales_date]) {
          acc[curr.sales_date] = { totalQty: 0, count: 0 };
        }
        acc[curr.sales_date].totalQty += curr.quantity_sold;
        acc[curr.sales_date].count += 1;
        return acc;
      }, {} as Record<string, { totalQty: number, count: number }>);

      const histArr = Object.entries(grouped)
        .map(([date, stats]) => ({
          date,
          totalQuantity: stats.totalQty,
          menusCount: stats.count
        }))
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        .slice(0, 5); // Tampilkan 5 data terakhir

      setHistory(histArr);
    }
  }

  useEffect(() => {
    async function loadSalesForDate() {
      if (!restaurantId || menus.length === 0 || !selectedDate) return;

      setLoading(true);
      setError('');
      setSuccess('');

      // Load sales data for the selected date
      const { data: existingSales, error } = await supabase
        .from('daily_sales')
        .select('menu_id, quantity_sold')
        .eq('sales_date', selectedDate);

      if (error) {
        console.error('Error fetching sales:', error);
        setError('Gagal memuat data penjualan untuk tanggal ini.');
      } else if (existingSales) {
        const newSalesData: Record<string, string> = {};
        existingSales.forEach(sale => {
          newSalesData[sale.menu_id] = sale.quantity_sold.toString();
        });
        setSalesData(newSalesData);
      }
      setLoading(false);
    }

    loadSalesForDate();
  }, [selectedDate, restaurantId, menus.length, supabase]);

  const handleSaleChange = (menuId: string, value: string) => {
    setSalesData(prev => ({
      ...prev,
      [menuId]: value
    }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!restaurantId) return;

    setSaving(true);
    setError('');
    setSuccess('');

    // Siapkan data yang akan diupsert (hanya yang diisi saja)
    const payload = Object.entries(salesData)
      .filter(([_, qty]) => qty !== '' && !isNaN(parseFloat(qty)))
      .map(([menuId, qty]) => ({
        menu_id: menuId,
        sales_date: selectedDate,
        quantity_sold: parseInt(qty.replace(/\./g, ''), 10)
      }));

    if (payload.length === 0) {
      setError('Belum ada data kuantitas penjualan yang valid untuk disimpan.');
      setSaving(false);
      return;
    }

    const { error: upsertError } = await supabase
      .from('daily_sales')
      .upsert(payload, { onConflict: 'menu_id,sales_date' });

    if (upsertError) {
      setError('Gagal menyimpan riwayat penjualan: ' + upsertError.message);
    } else {
      setSuccess('Data penjualan untuk tanggal tersebut berhasil disimpan!');
      loadHistorySummary(); // Refresh riwayat setelah simpan
      setTimeout(() => setSuccess(''), 3000);
    }
    setSaving(false);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('id-ID', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Input Penjualan Harian</h2>
        <p className="text-gray-500 mt-1 max-w-3xl">
          Catat jumlah menu terjual setiap hari sebagai data historis untuk membantu Sistem memprediksi kebutuhan produksi.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        {/* KOLOM KIRI: FORM INPUT */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white p-6 rounded-xl border border-gray-200/60">
            <form onSubmit={handleSave} className="space-y-8">

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-gray-100">
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Tanggal Pencatatan</label>
                  <input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="block w-full sm:w-auto rounded-lg border-0 py-2.5 px-3 text-gray-900 ring-1 ring-inset ring-gray-200 focus:ring-2 focus:ring-blue-600 sm:text-sm"
                    max={new Date().toLocaleDateString('en-CA')}
                    required
                  />
                </div>
                <div className="text-sm text-gray-500 bg-gray-50 px-3 py-2 rounded-lg border border-gray-100">
                  <span className="font-medium text-gray-700">Tips:</span> Masukkan angka 0 jika menu tidak terjual sama sekali.
                </div>
              </div>

              {error && <div className="text-red-600 text-sm bg-red-50 p-3 rounded-lg border border-red-100 flex items-start gap-3"><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 shrink-0" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" /></svg>{error}</div>}
              {success && <div className="text-green-700 text-sm bg-green-50 p-3 rounded-lg border border-green-200 flex items-start gap-3"><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 shrink-0" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>{success}</div>}

              {loading ? (
                <div className="flex justify-center items-center py-16">
                  <div className="flex flex-col items-center gap-3 text-gray-500">
                    <svg className="animate-spin h-6 w-6 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span className="text-sm">Memuat data...</span>
                  </div>
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
                  <div className="grid grid-cols-12 gap-4 font-medium text-gray-500 text-xs uppercase tracking-wider px-2 hidden sm:grid mb-2">
                    <div className="col-span-8">Daftar Menu</div>
                    <div className="col-span-4 text-right">Jumlah Terjual</div>
                  </div>

                  <div className="border-t border-gray-100">
                    {menus.map((menu) => (
                      <div key={menu.id} className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-center py-3 sm:py-4 px-2 border-b border-gray-100 hover:bg-gray-50/50 transition-colors">
                        <div className="sm:col-span-8 flex flex-col justify-center">
                          <span className="font-medium text-gray-900">{menu.name}</span>
                          <span className="text-xs text-gray-500 mt-0.5">
                            Satuan: {menu.unit}
                          </span>
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
                    type="button"
                    onClick={handleSave}
                    disabled={saving}
                    className="rounded-lg bg-blue-600 px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-blue-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-600 disabled:opacity-50 flex items-center gap-2"
                  >
                    {saving && (
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                    )}
                    {saving ? 'Menyimpan...' : 'Simpan Penjualan'}
                  </button>
                </div>
              )}
            </form>
          </div>
        </div>

        {/* KOLOM KANAN: WIDGET RIWAYAT */}
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
              <div className="space-y-2.5">
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
