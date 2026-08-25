cat << 'EOF' > apps/web/src/app/dashboard/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import { useRouter } from 'next/navigation';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

interface ForecastItem {
  menu_id: string;
  menu_name: string;
  predicted_quantity: number;
  model_used: string;
  mae?: number;
  mape?: number;
}

interface DashboardStats {
  menus: number;
  sales: number;
  salesPct: number;
  rev: number;
  revPct: number;
  surplus: number;
  surplusPct: number;
  chartData: any[];
}

export default function DashboardPage() {
  const supabase = createClient();
  const router = useRouter();
  
  const [loading, setLoading] = useState(true);
  const [userName, setUserName] = useState('');
  const [restaurantId, setRestaurantId] = useState<string | null>(null);
  
  const [stats, setStats] = useState<DashboardStats>({
    menus: 0, sales: 0, salesPct: 0, rev: 0, revPct: 0, surplus: 0, surplusPct: 0, chartData: []
  });
  
  // AI Forecast Data
  const [forecasts, setForecasts] = useState<ForecastItem[]>([]);
  const [aiInsight, setAiInsight] = useState<string>('');
  const [isForecastLoading, setIsForecastLoading] = useState(false);
  const [forecastError, setForecastError] = useState('');

  useEffect(() => {
    async function loadDashboard() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push('/login');
        return;
      }

      // Fetch User & Restaurant
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', session.user.id)
        .single();
        
      if (profile) setUserName(profile.full_name || 'Pengguna');

      const { data: restaurant } = await supabase
        .from('restaurants')
        .select('id')
        .eq('owner_id', session.user.id)
        .single();

      if (restaurant) {
        setRestaurantId(restaurant.id);
        
        // 1. Fetch active menus
        const { count: menuCount } = await supabase
          .from('menus')
          .select('*', { count: 'exact', head: true })
          .eq('restaurant_id', restaurant.id)
          .eq('is_active', true);
          
        // Device local dates
        const todayStr = new Date().toLocaleDateString('en-CA');
        const yesterdayDate = new Date();
        yesterdayDate.setDate(yesterdayDate.getDate() - 1);
        const yesterdayStr = yesterdayDate.toLocaleDateString('en-CA');

        // 2. Fetch daily sales with prices
        const { data: salesData } = await supabase
          .from('daily_sales')
          .select('sales_date, quantity_sold, menus!inner(selling_price)')
          .eq('menus.restaurant_id', restaurant.id);
          
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
            
            chartMap[s.sales_date] = (chartMap[s.sales_date] || 0) + rev;
          });
        }
        
        // 3. Fetch Production for Surplus
        const { data: prodData } = await supabase
          .from('daily_production')
          .select('production_date, quantity, menus!inner(restaurant_id)')
          .eq('menus.restaurant_id', restaurant.id);
          
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

        // Calc percentages
        const calcPct = (today: number, yday: number) => {
          if (yday === 0) return today > 0 ? 100 : (today < 0 ? -100 : 0);
          return ((today - yday) / Math.abs(yday)) * 100;
        };

        const salesPct = calcPct(todaySales, ydaySales);
        const revPct = calcPct(todayRev, ydayRev);
        const surplusPct = calcPct(todaySurplus, ydaySurplus);
        
        const sortedDates = Object.keys(chartMap).sort((a, b) => new Date(a).getTime() - new Date(b).getTime());
        const cData = sortedDates.map(d => {
           const dt = new Date(d);
           return {
             date: dt.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' }),
             pendapatan: chartMap[d]
           };
        });

        setStats({
          menus: menuCount || 0,
          sales: tSales,
          salesPct,
          rev: tRev,
          revPct,
          surplus: tSurplus,
          surplusPct,
          chartData: cData.slice(-14) // Last 14 days
        });
      }
      setLoading(false);
    }
    
    loadDashboard();
  }, [supabase, router]);

  const generateForecast = async () => {
    if (!restaurantId) return;
    setIsForecastLoading(true);
    setForecastError('');
    
    try {
      const targetDate = new Date();
      targetDate.setDate(targetDate.getDate() + 1); // Predict for tomorrow
      const dateStr = targetDate.toISOString().split('T')[0];
      
      const res = await fetch('http://localhost:8000/forecast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          restaurant_id: restaurantId,
          target_date: dateStr
        })
      });
      
      if (!res.ok) throw new Error('Gagal menghubungi AI Backend (Pastikan server Python berjalan)');
      
      const data = await res.json();
      setForecasts(data.forecasts);
      setAiInsight(data.ai_insight);
    } catch (err: any) {
      setForecastError(err.message || 'Terjadi kesalahan saat membuat prediksi');
    } finally {
      setIsForecastLoading(false);
    }
  };

  const formatCurrency = (val: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(val);
  
  const Indicator = ({ pct, invertGood = false }: { pct: number, invertGood?: boolean }) => {
    const isUp = pct > 0;
    const isNeutral = pct === 0;
    
    // Normal: Up is green, down is red.
    // Invert: Up is red, down is green (for surplus).
    let colorClass = "text-gray-500 bg-gray-50";
    if (!isNeutral) {
      if (invertGood) {
        colorClass = isUp ? "text-red-700 bg-red-50" : "text-green-700 bg-green-50";
      } else {
        colorClass = isUp ? "text-green-700 bg-green-50" : "text-red-700 bg-red-50";
      }
    }
    
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-semibold ${colorClass}`}>
        {!isNeutral && (
          <svg className={`w-3 h-3 ${!isUp && 'rotate-180'}`} fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 10.5 12 3m0 0 7.5 7.5M12 3v18" />
          </svg>
        )}
        {isNeutral ? '0%' : `${Math.abs(pct).toFixed(1)}%`}
      </span>
    );
  };

  if (loading) {
    return <div className="p-8 flex justify-center"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div></div>;
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Selamat datang, {userName} 👋</h1>
          <p className="text-gray-500 mt-1 text-sm">Pantau kinerja penjualan dan optimalkan produksi rumah makan Anda.</p>
        </div>
        <button 
          onClick={generateForecast}
          disabled={isForecastLoading}
          className="bg-gray-900 text-white px-6 py-2.5 rounded-xl font-semibold shadow-sm hover:bg-gray-800 transition-all active:scale-95 disabled:opacity-70 flex items-center gap-2"
        >
          {isForecastLoading ? (
            <>
              <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
              Menganalisa Data...
            </>
          ) : (
            <>
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 0 0-2.456 2.456ZM16.894 20.567 16.5 21.75l-.394-1.183a2.25 2.25 0 0 0-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 0 0 1.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 0 0 1.423 1.423l1.183.394-1.183.394a2.25 2.25 0 0 0-1.423 1.423Z" /></svg>
              Buat Prediksi Besok
            </>
          )}
        </button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Widget 1: Menu Aktif */}
        <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 0 0 6 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 0 1 6 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 0 1 6-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0 0 18 18a8.967 8.967 0 0 0-6 2.292m0-14.25v14.25" /></svg>
            </div>
            <p className="text-sm font-semibold text-gray-500">Menu Aktif</p>
          </div>
          <div className="flex items-end justify-between mt-4">
            <p className="text-3xl font-bold text-gray-900">{stats.menus}</p>
          </div>
        </div>

        {/* Widget 2: Total Menu Terjual */}
        <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5V6a3.75 3.75 0 1 0-7.5 0v4.5m11.356-1.993 1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 0 1-1.12-1.243l1.264-12A1.125 1.125 0 0 1 5.513 7.5h12.974c.576 0 1.059.435 1.119 1.007ZM8.625 10.5a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm7.5 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z" /></svg>
            </div>
            <p className="text-sm font-semibold text-gray-500">Total Terjual</p>
          </div>
          <div className="flex items-end justify-between mt-4">
            <p className="text-3xl font-bold text-gray-900">{stats.sales.toLocaleString('id-ID')}</p>
            <Indicator pct={stats.salesPct} />
          </div>
        </div>

        {/* Widget 3: Total Surplus */}
        <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-amber-50 text-amber-600 rounded-lg">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="m20.25 7.5-.625 10.632a2.25 2.25 0 0 1-2.247 2.118H6.622a2.25 2.25 0 0 1-2.247-2.118L3.75 7.5m8.25 3v6.75m0 0-3-3m3 3 3-3M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125Z" /></svg>
            </div>
            <p className="text-sm font-semibold text-gray-500">Total Surplus (Sisa)</p>
          </div>
          <div className="flex items-end justify-between mt-4">
            <p className="text-3xl font-bold text-gray-900">{stats.surplus.toLocaleString('id-ID')}</p>
            <Indicator pct={stats.surplusPct} invertGood={true} />
          </div>
        </div>

        {/* Widget 4: Total Pendapatan */}
        <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" /></svg>
            </div>
            <p className="text-sm font-semibold text-gray-500">Pendapatan Total</p>
          </div>
          <div className="flex items-end justify-between mt-4">
            <p className="text-2xl font-bold text-gray-900">{formatCurrency(stats.rev)}</p>
            <Indicator pct={stats.revPct} />
          </div>
        </div>
      </div>

      {/* Sales Chart Section */}
      <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
        <h3 className="text-lg font-bold text-gray-900 mb-6">Grafik Pendapatan Harian</h3>
        {stats.chartData.length > 0 ? (
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.chartData} margin={{ top: 10, right: 10, left: 20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                <XAxis 
                  dataKey="date" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 12, fill: '#6B7280' }} 
                  dy={10}
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 12, fill: '#6B7280' }}
                  tickFormatter={(val) => `Rp ${val / 1000}k`}
                  width={80}
                />
                <Tooltip 
                  cursor={{ fill: '#F3F4F6' }}
                  formatter={(value: number) => [formatCurrency(value), 'Pendapatan']}
                  contentStyle={{ borderRadius: '12px', border: '1px solid #E5E7EB', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                />
                <Bar dataKey="pendapatan" fill="#10B981" radius={[4, 4, 0, 0]} maxBarSize={50} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="h-72 flex items-center justify-center text-gray-500 bg-gray-50 rounded-xl border border-dashed border-gray-300">
            Belum ada data pendapatan untuk ditampilkan.
          </div>
        )}
      </div>

      {/* Error State */}
      {forecastError && (
        <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl flex items-center gap-3">
          <svg className="w-6 h-6 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
          <p className="text-sm font-medium">{forecastError}</p>
        </div>
      )}

      {/* Forecast Results */}
      {forecasts.length > 0 && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
          
          {/* AI Insight */}
          {aiInsight && (
            <div className="bg-gray-900 border border-gray-800 p-6 rounded-2xl relative overflow-hidden shadow-md">
              <div className="absolute top-0 right-0 p-4 opacity-5">
                <svg className="w-32 h-32 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2L9 9H2L7 14L5 21L12 17L19 21L17 14L22 9H15L12 2Z"/></svg>
              </div>
              <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <svg className="w-5 h-5 text-blue-400" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 0 0-2.456 2.456ZM16.894 20.567 16.5 21.75l-.394-1.183a2.25 2.25 0 0 0-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 0 0 1.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 0 0 1.423 1.423l1.183.394-1.183.394a2.25 2.25 0 0 0-1.423 1.423Z" /></svg>
                AI Insights & Rekomendasi
              </h3>
              <div className="text-sm text-gray-300 leading-relaxed space-y-3 whitespace-pre-wrap relative z-10">
                {aiInsight}
              </div>
            </div>
          )}

          {/* Tables */}
          <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
            <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between">
              <h3 className="font-bold text-gray-900">Rekomendasi Produksi Besok</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-gray-600">
                <thead className="bg-gray-50 text-xs uppercase font-semibold text-gray-500">
                  <tr>
                    <th className="px-6 py-4">Menu</th>
                    <th className="px-6 py-4 text-right">Rekomendasi (Prediksi)</th>
                    <th className="px-6 py-4">Model Dipilih</th>
                    <th className="px-6 py-4">Akurasi Model</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {forecasts.map((f) => (
                    <tr key={f.menu_id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 font-medium text-gray-900">{f.menu_name}</td>
                      <td className="px-6 py-4 text-right">
                        <span className="inline-flex items-center justify-center bg-gray-900 text-white font-bold px-3 py-1 rounded-lg text-base shadow-sm">
                          {f.predicted_quantity}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex px-2 py-1 rounded-md text-xs font-semibold ${
                          f.model_used === 'XGBoost' ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' : 
                          f.model_used === 'WMA' ? 'bg-purple-100 text-purple-800 border border-purple-200' : 'bg-gray-100 text-gray-700'
                        }`}>
                          {f.model_used}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-xs text-gray-500">
                        {f.mae !== null ? (
                          <div className="space-y-1">
                            <div className="flex justify-between w-24"><span>MAE:</span> <span className="font-semibold text-gray-700">{f.mae}</span></div>
                            <div className="flex justify-between w-24"><span>MAPE:</span> <span className="font-semibold text-gray-700">{f.mape}%</span></div>
                          </div>
                        ) : (
                          <span className="italic">Data belum cukup</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
EOF