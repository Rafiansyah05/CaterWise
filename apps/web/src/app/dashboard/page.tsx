'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { createClient } from '@/utils/supabase/client';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { useRouter } from 'next/navigation';

interface ChartData {
  date: string;
  label: string;
  revenue: number;
}

interface DashboardStats {
  menus: number;
  sales: number;
  salesPct: number;
  rev: number;
  revPct: number;
  surplus: number;
  surplusPct: number;
  chartData: ChartData[];
}

export default function DashboardPage() {
  const supabase = createClient();
  const router = useRouter();
  
  const [isLoading, setIsLoading] = useState(true);
  const [metricDialog, setMetricDialog] = useState<any>({ isOpen: false });
  const [restaurantId, setRestaurantId] = useState<string | null>(null);
  const [name, setName] = useState('tamu');
  const [stats, setStats] = useState<DashboardStats>({
    menus: 0, sales: 0, salesPct: 0, rev: 0, revPct: 0, surplus: 0, surplusPct: 0, chartData: []
  });
  
  const [forecastHistory, setForecastHistory] = useState<any[]>([]);
  const [expandedHistory, setExpandedHistory] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [forecastToDelete, setForecastToDelete] = useState<string | null>(null);

  const confirmDeleteForecast = async () => {
    if (!forecastToDelete) return;
    try {
      const res = await fetch(`http://localhost:8000/forecast/${forecastToDelete}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error('Gagal menghapus riwayat dari server');
      
      setForecastHistory(prev => prev.filter(h => h.id !== forecastToDelete));
      setDeleteDialogOpen(false);
      setForecastToDelete(null);
    } catch (e: any) {
      alert('Gagal menghapus: ' + e.message);
    }
  };

  const requestDeleteForecast = (id: string, e: any) => {
    e.stopPropagation();
    setForecastToDelete(id);
    setDeleteDialogOpen(true);
  };

  useEffect(() => {
    async function loadDashboard() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return router.push('/login');
        
        const { data: profile } = await supabase.from('profiles').select('full_name').eq('id', session.user.id).single();
        if (profile?.full_name) setName(profile.full_name);
        else setName('Pengguna');

        const { data: rest } = await supabase.from('restaurants').select('id').eq('owner_id', session.user.id).single();
        if (!rest) return router.push('/dashboard/profile/setup');
        setRestaurantId(rest.id);

        // Load History
        const { data: historyData } = await supabase.from('forecast_history').select('*').eq('restaurant_id', rest.id).order('target_date', { ascending: false }).limit(10);
        if (historyData) setForecastHistory(historyData);

        const { count: menuCount } = await supabase
          .from('menus')
          .select('*', { count: 'exact', head: true })
          .eq('restaurant_id', rest.id)
          .eq('is_active', true);

        // Device local dates
        const todayStr = new Date().toLocaleDateString('en-CA');
        const yesterdayDate = new Date();
        yesterdayDate.setDate(yesterdayDate.getDate() - 1);
        const yesterdayStr = yesterdayDate.toLocaleDateString('en-CA');
        
        const fourteenDaysAgo = new Date();
        fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 13);
        const fourteenDaysAgoStr = fourteenDaysAgo.toLocaleDateString('en-CA');

        const { data: salesData } = await supabase
          .from('daily_sales')
          .select('sales_date, quantity_sold, menus!inner(selling_price, restaurant_id)')
          .eq('menus.restaurant_id', rest.id);

        let tSales = 0, tRev = 0, todaySales = 0, ydaySales = 0, todayRev = 0, ydayRev = 0;
        const chartMap: Record<string, number> = {};

        if (salesData) {
          salesData.forEach((s: any) => {
            const qty = s.quantity_sold;
            const price = s.menus?.selling_price || 0;
            const rev = qty * price;

            tSales += qty;
            tRev += rev;

            if (s.sales_date === todayStr) {
              todaySales += qty;
              todayRev += rev;
            } else if (s.sales_date === yesterdayStr) {
              ydaySales += qty;
              ydayRev += rev;
            }
            
            if (s.sales_date >= fourteenDaysAgoStr) {
              chartMap[s.sales_date] = (chartMap[s.sales_date] || 0) + rev;
            }
          });
        }

        const { data: prodData } = await supabase
          .from('daily_production')
          .select('production_date, quantity, menus!inner(restaurant_id)')
          .eq('menus.restaurant_id', rest.id);

        let tProd = 0, todayProd = 0, ydayProd = 0;

        if (prodData) {
          prodData.forEach((p: any) => {
             tProd += p.quantity;
             if (p.production_date === todayStr) todayProd += p.quantity;
             else if (p.production_date === yesterdayStr) ydayProd += p.quantity;
          });
        }

        const tSurplus = tProd - tSales;
        const todaySurplus = todayProd - todaySales;
        const ydaySurplus = ydayProd - ydaySales;

        const calcPct = (today: number, yday: number) => {
          if (yday === 0) return today > 0 ? 100 : (today < 0 ? -100 : 0);
          return ((today - yday) / Math.abs(yday)) * 100;
        };

        const sortedDates = Object.keys(chartMap).sort((a, b) => new Date(a).getTime() - new Date(b).getTime());
        const chartData = sortedDates.map(date => ({
           date,
           label: new Date(date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' }),
           revenue: chartMap[date]
        }));

        setStats({
          menus: menuCount || 0,
          sales: tSales,
          salesPct: calcPct(todaySales, ydaySales),
          rev: tRev,
          revPct: calcPct(todayRev, ydayRev),
          surplus: tSurplus,
          surplusPct: calcPct(todaySurplus, ydaySurplus),
          chartData
        });
      } catch (error) {
        console.warn("error", error);
      } finally {
        setIsLoading(false);
      }
    }
    loadDashboard();
  }, [supabase, router]);

  const formatCurrency = (val: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(val);
  
  const Indicator = ({ pct, invertGood = false }: { pct: number, invertGood?: boolean }) => {
    const isUp = pct > 0;
    const isDown = pct < 0;
    let colorClass = 'text-gray-500';
    if (isUp) colorClass = invertGood ? 'text-red-600 bg-red-50' : 'text-emerald-600 bg-emerald-50';
    if (isDown) colorClass = invertGood ? 'text-emerald-600 bg-emerald-50' : 'text-red-600 bg-red-50';
    
    return (
      <span className={`${
        pct === 0 ? 'text-gray-500 bg-gray-50' : colorClass
      } text-xs font-medium p-1 rounded-md flex items-center gap-1`}>
        {isUp && <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18l10.5-10.5l4.5 4.5l7.5-7.5" /></svg>}
        {isDown && <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6l10.5 10.5l4.5-4.5l7.5 7.5" /></svg>}
        {Math.abs(Math.round(pct))}%
      </span>
    );
  };

  if (isLoading) return (
    <div className="min-h-screen flex items-center justify-center">
      <svg className="animate-spin h-10 w-10 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
      </svg>
    </div>
  );

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-12">
      <div className="flex flex-col md:flex-row justify-between gap-4 border-b border-gray-100 pb-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Halo, {name}!</h1>
          <p className="text-gray-500 mt-1 text-sm">Pantau kinerja penjualan dan optimalkan produksi rumah makan Anda.</p>
        </div>
        <button 
          onClick={() => router.push('/dashboard/prediksi')}
          className="bg-blue-600 text-white px-6 py-2.5 rounded-xl font-semibold shadow-sm hover:bg-blue-700 transition-all active:scale-95 flex items-center gap-2"
        >
          Buat Prediksi Besok
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" /></svg>
            </div>
            <p className="text-sm font-semibold text-gray-500 whitespace-nowrap">Total Pendapatan</p>
          </div>
          <div className="flex items-end justify-between mt-4 gap-2">
            <p className="text-2xl font-bold text-gray-900">{formatCurrency(stats.rev)}</p>
            <Indicator pct={stats.revPct} />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-amber-50 text-amber-600 rounded-lg">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="m20.25 7.5-.625 10.632a2.25 2.25 0 0 1-2.247 2.118H6.622a2.25 2.25 0 0 1-2.247-2.118L3.75 7.5m8.25 3v6.75m0 0-3-3m3 3 3-3M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125Z" /></svg>
            </div>
            <p className="text-sm font-semibold text-gray-500 whitespace-nowrap">Total Surplus (Sisa)</p>
          </div>
          <div className="flex items-end justify-between mt-4 gap-2">
            <p className="text-3xl font-bold text-gray-900">{stats.surplus.toLocaleString('id-ID')}</p>
            <Indicator pct={stats.surplusPct} invertGood={true} />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5V6a3.75 3.75 0 1 0-7.5 0v4.5m11.356-1.993 1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 0 1-1.12-1.243l1.264-12A1.125 1.125 0 0 1 5.513 7.5h12.974c.576 0 1.059.435 1.119 1.007ZM9.625 10.5a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm7.5 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z" /></svg>
            </div>
            <p className="text-sm font-semibold text-gray-500 whitespace-nowrap">Total Terjual (Porsi)</p>
          </div>
          <div className="flex items-end justify-between mt-4 gap-2">
            <p className="text-3xl font-bold text-gray-900">{stats.sales.toLocaleString('id-ID')}</p>
            <Indicator pct={stats.salesPct} />
          </div>
        </div>
      </div>

      <ConfirmDialog 
        isInfo={true}
        isOpen={metricDialog.isOpen}
        title={`Detail Metrik: ${metricDialog.menuName || ''}`}
        message={
          <div className="space-y-3 mt-4 text-gray-700 text-left">
            <div className="flex justify-between border-b border-gray-100 pb-2">
              <span className="font-medium">Model Terpilih:</span>
              <span className="font-bold text-blue-600">{metricDialog.modelUsed}</span>
            </div>
            {metricDialog.mae !== null && metricDialog.mae !== undefined ? (
              <>
                <div className="flex justify-between border-b border-gray-100 pb-2">
                  <span className="font-medium">MAE (Rata-rata Error):</span>
                  <span className="font-bold">{metricDialog.mae}</span>
                </div>
                <div className="flex justify-between border-b border-gray-100 pb-2">
                  <span className="font-medium">MAPE (Persentase Error):</span>
                  <span className="font-bold">{metricDialog.mape}%</span>
                </div>
                <p className="text-xs text-gray-500 mt-2">Model dan tingkat error dipilih otomatis dari data historis terbaik.</p>
              </>
            ) : (
              <p className="text-sm text-gray-500 italic">Data belum cukup menghitung akurasi model ini.</p>
            )}
          </div>
        }
        onConfirm={() => setMetricDialog({ isOpen: false })}
        onCancel={() => {}}
      />

      <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm">
        <div className="mb-4">
          <h2 className="font-bold text-gray-900">Grafik Pendapatan Harian</h2>
          <p className="text-sm text-gray-500">14 Hari Terakhir</p>
        </div>
        
        {stats.chartData.length > 0 ? (
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.chartData} margin={{top: 10, right: 10, left: 0, bottom: 0}}>
                <XAxis 
                  dataKey="label" 
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#9ca3af', fontSize: 12 }}
                  dy={10}
                />
                <YAxis 
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#9ca3af', fontSize: 12 }}
                  tickFormatter={(value) => `Rp${value / 1000}K`}
                />
                <Tooltip 
                  cursor={{fill: '#f3f4f6', radius: 4}}
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  formatter={(constValue: any) => [formatCurrency(constValue), 'Pendapatan']}
                />
                <Bar dataKey="revenue" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="h-72 flex flex-col items-center justify-center text-gray-500 bg-gray-50 rounded-xl border border-dashed border-gray-300">
            <p>Belum ada data pendapatan untuk ditampilkan.</p>
          </div>
        )}
      </div>

      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <svg className="w-6 h-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4m-2 10.56c-2.41.4-4.724.15-6.839-.718a9.001 9.001 0 1 1 10.815-10.815C19.85 11.275 19.6 13.59 19.2 16m-7.2 4.56c-2.41.4-4.724.15-6.839-.718a14.89 14.89 0 0 1 7.558-4.56z" /></svg>
          <h2 className="text-lg font-bold text-gray-900">Riwayat Prediksi AI</h2>
        </div>

        {forecastHistory.length === 0 ? (
          <div className="text-center py-10 bg-gray-50 rounded-xl border border-dashed border-gray-200">
            <p className="text-gray-500">Belum ada riwayat prediksi yang disimpan.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {forecastHistory.map((item) => (
              <div key={item.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm transition-all">
                <div
                  onClick={() => setExpandedHistory(expandedHistory === item.id ? null : item.id)}
                  className="w-full flex items-center justify-between p-5 hover:bg-gray-50 transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-4">
                    <div className="bg-blue-100 text-blue-600 p-3 rounded-md">
                      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6.75 1a.75.75 0 0 1-1.5 0v1h-.75a4.5 4.5 0 0 0-4.5 4.5v10.5a3.75 3.75 0 0 0 3.75 3.75h15.5a3.75 3.75 0 0 0 3.75-3.75v-10.5a4.5 4.5 0 0 0-4.5-4.5h-.75v-1a.75.75 0 0 1-1.5 0v1h-12v-1zm-2.25 5H4.5a3 3 0 0 1 3-3h12a3 3 0 0 1 3 3v.5h-15v-.5zm0 2v10.5a2.25 2.25 0 0 0 2.25 2.25h15.5a2.25 2.25 0 0 0 2.25-2.25v-10.5h-20z" /></svg>
                    </div>
                    <span className="font-bold text-gray-900">Prediksi Untuk { new Date(item.target_date).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) }</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button 
                      type="button"
                      onClick={(e) => requestDeleteForecast(item.id, e)}
                      className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                      title="Hapus Riwayat"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                      </svg>
                    </button>
                    <svg className={`w-5 h-5 transition-transform ${expandedHistory === item.id ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>
                  </div>
                </div>
                
                {expandedHistory === item.id && (
                  <div className="p-5 border-t border-gray-100 bg-gray-50/50">
                    <div className="bg-gray-900 border border-gray-800 p-5 rounded-xl mb-4 relative overflow-hidden">
                      <h3 className="text-base font-bold text-white mb-2 flex items-center gap-2">
                        <svg className="w-5 h-5 text-blue-400" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 0 0-2.456 2.456ZM16.894 20.567 16.5 21.75l-.394-1.183a2.25 2.25 0 0 0-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 0 0 1.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 0 0 1.423 1.423l1.183.394-1.183.394a2.25 2.25 0 0 0-1.423 1.423Z" /></svg>
                        AI Insights
                      </h3>
                      <div className="text-sm text-gray-300 whitespace-pre-wrap">
                        {item.ai_insight}
                      </div>
                    </div>
                    
                    <table className="w-full text-left text-sm text-gray-600 bg-white rounded-lg overflow-hidden shadow-sm">
                      <thead className="bg-gray-100 text-xs uppercase font-semibold text-gray-500">
                        <tr>
                          <th className="px-4 py-3">Menu</th>
                          <th className="px-4 py-3 text-center">Prediksi</th>
                          <th className="px-4 py-3">Alasan AI</th>
                          <th className="px-4 py-3"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {item.forecast_data.map((f: any) => (
                          <tr key={f.menu_id}>
                            <td className="px-4 py-2">{f.menu_name}</td>
                            <td className="px-4 py-2 text-center font-bold">
                              {f.predicted_quantity} <span className="font-normal opacity-80 text-xs ml-1">{f.menu_unit || 'porsi'}</span>
                            </td>
                            <td className="px-4 py-2 text-xs text-gray-900 font-medium">
                              {f.ai_justification || 'Dipilih berdasarkan pola data historis.'}
                            </td>
                            <td className="px-4 py-2 text-right">
                              <button
                                type="button"
                                onClick={() => setMetricDialog({
                                  isOpen: true,
                                  menuName: f.menu_name,
                                  modelUsed: f.model_used,
                                  mae: f.mae,
                                  mape: f.mape
                                })}
                                className="p-1 text-gray-400 hover:text-gray-700 hover:bg-gray-200 rounded-md transition-all"
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.75a.75.75 0 1 1 0-1.5.75.75 0 0 1 0 1.5ZM12 12.75a.75.75 0 1 1 0-1.5.75.75 0 0 1 0 1.5ZM12 18.75a.75.75 0 1 1 0-1.5.75.75 0 0 1 0 1.5Z" />
                                </svg>
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
        <p className="text-xs text-gray-400 mt-3 flex items-center gap-1.5">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5 flex-shrink-0">
            <path fillRule="evenodd" d="M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0Zm-7-4a1 1 0 1 1-2 0 1 1 0 0 1 2 0ZM9 9a.75.75 0 0 0 0 1.5h.253a.25.25 0 0 1 .244.304l-.459 2.066A1.75 1.75 0 0 0 10.747 15H11a.75.75 0 0 0 0-1.5h-.253a.25.25 0 0 1-.244-.304l.459-2.066A1.75 1.75 0 0 0 9.253 9H9Z" clipRule="evenodd" />
          </svg>
          Riwayat ini merupakan <strong>estimasi</strong> prediksi sistem. Selalu lakukan pengecekan ulang sebelum mengambil keputusan produksi.
        </p>
      </div>
      <ConfirmDialog 
        isOpen={deleteDialogOpen}
        title="Konfirmasi Hapus"
        message="Apakah Anda yakin ingin menghapus riwayat prediksi ini? Data yang sudah dihapus tidak dapat dikembalikan."
        confirmText="Ya, Hapus"
        cancelText="Batal"
        onConfirm={confirmDeleteForecast}
        onCancel={() => {
          setDeleteDialogOpen(false);
          setForecastToDelete(null);
        }}
        isDanger={true}
      />
    </div>
  );
}
