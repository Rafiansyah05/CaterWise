'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import { useRouter } from 'next/navigation';
// If recharts is not available, we could install it later or use a basic UI for now.
// For now, I'll build a clean UI that fetches from our Python Backend.

interface ForecastItem {
  menu_id: string;
  menu_name: string;
  predicted_quantity: number;
  model_used: string;
  mae?: number;
  mape?: number;
}

export default function DashboardPage() {
  const supabase = createClient();
  const router = useRouter();
  
  const [loading, setLoading] = useState(true);
  const [userName, setUserName] = useState('');
  const [restaurantId, setRestaurantId] = useState<string | null>(null);
  
  // Stats
  const [totalMenus, setTotalMenus] = useState(0);
  const [totalSales, setTotalSales] = useState(0);
  
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
        
        // Fetch basic stats
        const { count: menuCount } = await supabase
          .from('menus')
          .select('*', { count: 'exact', head: true })
          .eq('restaurant_id', restaurant.id)
          .eq('is_active', true);
          
        setTotalMenus(menuCount || 0);

        // Fetch total sales (sum)
        const { data: salesData } = await supabase
          .from('daily_sales')
          .select('quantity_sold');
          
        if (salesData) {
          const sum = salesData.reduce((acc, curr) => acc + curr.quantity_sold, 0);
          setTotalSales(sum);
        }
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
      // In production, this URL should be read from env vars (e.g. NEXT_PUBLIC_API_URL)
      const targetDate = new Date();
      targetDate.setDate(targetDate.getDate() + 1); // Predict for tomorrow
      const dateStr = targetDate.toISOString().split('T')[0];
      
      const res = await fetch('http://localhost:8000/forecast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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

  if (loading) {
    return <div className="p-8 flex justify-center"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div></div>;
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Selamat datang, {userName} 👋</h1>
          <p className="text-gray-500 mt-1">Pantau kinerja dan prediksi produksi rumah makan Anda.</p>
        </div>
        <button 
          onClick={generateForecast}
          disabled={isForecastLoading}
          className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-6 py-2.5 rounded-xl font-semibold shadow-md hover:shadow-lg transition-all active:scale-95 disabled:opacity-70 flex items-center gap-2"
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
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex flex-col justify-center">
          <p className="text-sm font-medium text-gray-500 mb-1">Total Menu Aktif</p>
          <p className="text-3xl font-bold text-gray-900">{totalMenus}</p>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex flex-col justify-center">
          <p className="text-sm font-medium text-gray-500 mb-1">Total Penjualan Historis</p>
          <p className="text-3xl font-bold text-gray-900">{totalSales.toLocaleString('id-ID')}</p>
        </div>
        {/* We can add more stats like Average Surplus later */}
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
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
          
          {/* AI Insight */}
          {aiInsight && (
            <div className="bg-gradient-to-br from-indigo-50 to-blue-50 border border-indigo-100 p-6 rounded-2xl relative overflow-hidden">
              <div className="absolute top-0 right-0 p-4 opacity-10">
                <svg className="w-24 h-24" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2L9 9H2L7 14L5 21L12 17L19 21L17 14L22 9H15L12 2Z"/></svg>
              </div>
              <h3 className="text-lg font-bold text-indigo-900 mb-3 flex items-center gap-2">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 0 0-2.456 2.456ZM16.894 20.567 16.5 21.75l-.394-1.183a2.25 2.25 0 0 0-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 0 0 1.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 0 0 1.423 1.423l1.183.394-1.183.394a2.25 2.25 0 0 0-1.423 1.423Z" /></svg>
                AI Insights & Rekomendasi
              </h3>
              <div className="text-sm text-indigo-900/80 leading-relaxed space-y-3 whitespace-pre-wrap relative z-10">
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
                        <span className="inline-flex items-center justify-center bg-blue-100 text-blue-800 font-bold px-3 py-1 rounded-lg text-base">
                          {f.predicted_quantity}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex px-2 py-1 rounded text-xs font-medium ${
                          f.model_used === 'XGBoost' ? 'bg-green-100 text-green-700' : 
                          f.model_used === 'WMA' ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-600'
                        }`}>
                          {f.model_used}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-xs text-gray-500">
                        {f.mae !== null ? (
                          <div>
                            <div>MAE: <span className="font-medium text-gray-700">{f.mae}</span></div>
                            <div>MAPE: <span className="font-medium text-gray-700">{f.mape}%</span></div>
                          </div>
                        ) : (
                          <span className="italic">Data belum cukup (butuh &ge;14 hari)</span>
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

