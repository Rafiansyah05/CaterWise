'use client';
import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import { useRouter } from 'next/navigation';
import { API_BASE_URL } from '@/utils/api';
import Link from 'next/link';

interface MenuData {
  id: string;
  name: string;
  price: number;
  hpp: number;
}

interface SimulationInput {
  menu_id: string;
  menu_name: string;
  stock: number;
  price: number;
  hpp: number;
}

interface SimulationResultItem {
  menu_id: string;
  menu_name: string;
  stock: number;
  estimated_demand: number;
  simulated_sold: number;
  simulated_surplus: number;
  revenue: number;
  cost: number;
  profit: number;
}

interface SimulationResponse {
  target_date: string;
  results: SimulationResultItem[];
  total_revenue: number;
  total_cost: number;
  total_profit: number;
  ai_summary: string;
}

export default function SimulationPage() {
  const router = useRouter();
  const supabase = createClient();

  const [loadingInitial, setLoadingInitial] = useState(true);
  const [restaurantId, setRestaurantId] = useState('');
  const [menus, setMenus] = useState<MenuData[]>([]);
  const [inputs, setInputs] = useState<Record<string, number>>({});
  const [targetDate, setTargetDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1); // Default to tomorrow
    return d.toISOString().split('T')[0];
  });
  
  const [isSimulating, setIsSimulating] = useState(false);
  const [result, setResult] = useState<SimulationResponse | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    async function loadData() {
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

      if (!restaurant) {
        setLoadingInitial(false);
        return;
      }

      setRestaurantId(restaurant.id);

      const { data: menuData, error: menuErr } = await supabase
        .from('menus')
        .select('id, name, selling_price, hpp')
        .eq('restaurant_id', restaurant.id)
        .eq('is_active', true);

      if (menuErr) {
        console.error("Error fetching menus:", menuErr);
      }

      if (menuData) {
        const mapped = menuData.map(m => ({
          id: m.id,
          name: m.name,
          price: Number(m.selling_price),
          hpp: Number(m.hpp)
        }));
        setMenus(mapped);
        const initInputs: Record<string, number> = {};
        mapped.forEach(m => { initInputs[m.id] = 0; });
        setInputs(initInputs);
      }
      setLoadingInitial(false);
    }
    loadData();
  }, [supabase, router]);

  const handleInputChange = (id: string, value: string) => {
    const num = parseInt(value, 10);
    setInputs(prev => ({ ...prev, [id]: isNaN(num) ? 0 : num }));
  };

  const handleSimulate = async () => {
    const payloadInputs: SimulationInput[] = menus.map(m => ({
      menu_id: m.id,
      menu_name: m.name,
      stock: inputs[m.id] || 0,
      price: m.price,
      hpp: m.hpp
    })).filter(m => m.stock > 0);

    if (payloadInputs.length === 0) {
      setError('Harap masukkan rencana produksi minimal untuk 1 menu.');
      return;
    }

    setError('');
    setIsSimulating(true);

    try {
        let wName = 'Cerah';
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 2000);
          const wRes = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=-7.2504&longitude=112.7688&daily=weathercode&timezone=Asia%2FJakarta&start_date=${targetDate}&end_date=${targetDate}`, { signal: controller.signal });
          clearTimeout(timeoutId);
          const wData = await wRes.json();
          const code = wData?.daily?.weathercode?.[0];
          if (code !== undefined) {
            if (code >= 50 && code <= 69) wName = 'Gerimis / Hujan Ringan';
            else if (code >= 70 && code <= 99) wName = 'Hujan Lebat / Badai';
            else if (code >= 1 && code <= 3) wName = 'Berawan';
          }
        } catch (e) { /* fallback default cerah */ }

      const res = await fetch(`${API_BASE_URL}/simulate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          restaurant_id: restaurantId,
          target_date: targetDate,
          weather_info: wName,
          inputs: payloadInputs
        })
      });

      if (!res.ok) {
        throw new Error('Gagal menjalankan simulasi dari server.');
      }

      const data = await res.json();
      setResult(data);
    } catch (err: any) {
      setError(err.message || 'Terjadi kesalahan.');
    } finally {
      setIsSimulating(false);
    }
  };

  if (loadingInitial) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // 3D Loading Animation Component (Pure CSS)
  const Loading3D = () => (
    <div className="flex flex-col items-center justify-center py-24 space-y-12">
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes float3d {
          0%, 100% { transform: translateY(0) rotateX(10deg) rotateY(0deg); }
          50% { transform: translateY(-20px) rotateX(15deg) rotateY(180deg); }
        }
        @keyframes bounce-slow {
          0%, 100% { transform: translateY(0) scale(1); }
          50% { transform: translateY(-15px) scale(1.1); }
        }
        @keyframes pulse-glass {
          0%, 100% { transform: scale(1) rotate(-10deg); }
          50% { transform: scale(1.2) rotate(10deg); }
        }
      `}} />
      <div className="relative w-40 h-40 [perspective:1000px]">
        <div className="w-full h-full relative [transform-style:preserve-3d]" style={{ animation: 'float3d 4s ease-in-out infinite' }}>
          
          {/* Main Store Box */}
          <div className="absolute inset-0 bg-gradient-to-br from-blue-400 to-indigo-600 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.3)] flex items-center justify-center border-4 border-white/20">
            <span className="text-6xl drop-shadow-md">🏪</span>
          </div>

          {/* Money / Transaction Elements */}
          <div className="absolute -top-8 -left-8 bg-green-100 p-3 rounded-full shadow-lg border border-green-300" style={{ animation: 'bounce-slow 3s ease-in-out infinite' }}>
            <span className="text-3xl">💵</span>
          </div>
          <div className="absolute -bottom-6 -right-6 bg-yellow-100 p-3 rounded-full shadow-lg border border-yellow-300" style={{ animation: 'bounce-slow 3s ease-in-out infinite 1.5s' }}>
            <span className="text-3xl">🪙</span>
          </div>

          {/* Analysis Magnifying Glass */}
          <div className="absolute top-1/2 -right-12 bg-white/90 backdrop-blur p-4 rounded-full shadow-xl border border-gray-100 z-10" style={{ animation: 'pulse-glass 2s ease-in-out infinite' }}>
            <span className="text-4xl">🔍</span>
          </div>

        </div>
      </div>
      <div className="text-center space-y-2">
        <h3 className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">
          AI & Algoritma Sedang Bekerja
        </h3>
        <p className="text-gray-500 font-medium">Menganalisis pola historis, cuaca, dan menghitung simulasi profit Anda...</p>
      </div>
    </div>
  );

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-12">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-gray-100 pb-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Simulasi Risiko & Keuntungan</h1>
          <p className="text-sm text-gray-500 mt-1">Uji skenario produksi untuk memaksimalkan profit dan meminimalisir surplus.</p>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-600 p-4 rounded-xl text-sm font-medium">
          {error}
        </div>
      )}

      {isSimulating ? (
        <Loading3D />
      ) : result ? (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
          
          {/* Gemini AI Summary */}
          <div className="bg-gray-900 border border-gray-800 p-6 md:p-8 rounded-2xl relative overflow-hidden shadow-xl">
            <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
              <svg className="w-48 h-48 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2L9 9H2L7 14L5 21L12 17L19 21L17 14L22 9H15L12 2Z"/></svg>
            </div>
            <h3 className="text-lg md:text-xl font-bold text-white mb-5 flex items-center gap-3">
              <div className="p-2 bg-blue-500/20 rounded-lg">
                <svg className="w-6 h-6 text-blue-400" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 0 0-2.456 2.456ZM16.894 20.567 16.5 21.75l-.394-1.183a2.25 2.25 0 0 0-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 0 0 1.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 0 0 1.423 1.423l1.183.394-1.183.394a2.25 2.25 0 0 0-1.423 1.423Z" />
                </svg>
              </div>
              AI Insight & Analisis Simulasi
            </h3>
            <div className="text-sm md:text-base text-gray-300 leading-relaxed space-y-3 whitespace-pre-wrap relative z-10">
              {result.ai_summary}
            </div>
          </div>

          {/* Financial Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
              <p className="text-sm font-medium text-gray-500 mb-1">Proyeksi Pendapatan</p>
              <h4 className="text-2xl font-bold text-gray-900">Rp{result.total_revenue.toLocaleString('id-ID')}</h4>
            </div>
            <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
              <p className="text-sm font-medium text-gray-500 mb-1">Total Biaya Produksi (HPP)</p>
              <h4 className="text-2xl font-bold text-red-600">Rp{result.total_cost.toLocaleString('id-ID')}</h4>
            </div>
            <div className={`p-5 rounded-xl border shadow-sm ${result.total_profit >= 0 ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
              <p className={`text-sm font-medium mb-1 ${result.total_profit >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                {result.total_profit >= 0 ? 'Proyeksi Keuntungan Kotor' : 'Proyeksi Kerugian'}
              </p>
              <h4 className={`text-2xl font-bold ${result.total_profit >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                {result.total_profit >= 0 ? '+' : ''}Rp{result.total_profit.toLocaleString('id-ID')}
              </h4>
            </div>
          </div>

          {/* Detail Table */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 bg-gray-50">
              <h2 className="font-semibold text-gray-800">Rincian per Menu</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50/50 text-gray-500 text-xs uppercase tracking-wider">
                    <th className="px-6 py-4 font-medium">Menu</th>
                    <th className="px-6 py-4 font-medium text-center">Rencana Produksi</th>
                    <th className="px-6 py-4 font-medium text-center">Est. Terjual</th>
                    <th className="px-6 py-4 font-medium text-center">Est. Surplus</th>
                    <th className="px-6 py-4 font-medium text-right">Profit Margin</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {result.results.map(r => (
                    <tr key={r.menu_id} className="hover:bg-gray-50/50 transition-colors text-sm">
                      <td className="px-6 py-4 font-medium text-gray-900">{r.menu_name}</td>
                      <td className="px-6 py-4 text-center font-bold text-gray-900">{r.stock}</td>
                      <td className="px-6 py-4 text-center text-green-600 font-medium">{r.simulated_sold}</td>
                      <td className="px-6 py-4 text-center text-yellow-600 font-medium">{r.simulated_surplus}</td>
                      <td className={`px-6 py-4 text-right font-medium ${r.profit >= 0 ? 'text-gray-900' : 'text-red-600'}`}>
                        Rp{r.profit.toLocaleString('id-ID')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="flex justify-end">
            <button
              onClick={() => setResult(null)}
              className="px-6 py-2.5 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium transition-colors"
            >
              Ubah Angka & Simulasikan Ulang
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Input Form */}
          <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 bg-gray-50">
              <h2 className="font-semibold text-gray-800">Skenario Produksi</h2>
              <p className="text-sm text-gray-500 mt-1">Masukkan rencana jumlah porsi yang akan dimasak untuk melihat risikonya.</p>
            </div>
            <div className="p-6 space-y-6">
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Tanggal Simulasi</label>
                <input
                  type="date"
                  value={targetDate}
                  onChange={(e) => setTargetDate(e.target.value)}
                  className="block w-full max-w-xs rounded-lg border-0 py-2.5 px-3 text-gray-900 ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-blue-600 sm:text-sm"
                />
              </div>

              <div className="space-y-4">
                <label className="block text-sm font-medium text-gray-700">Rencana Porsi per Menu</label>
                {menus.length === 0 ? (
                  <div className="text-gray-500 text-sm">Belum ada data menu aktif.</div>
                ) : (
                  menus.map(menu => (
                    <div key={menu.id} className="flex items-center gap-4">
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900">{menu.name}</p>
                        <p className="text-xs text-gray-500">
                          Jual: Rp{menu.price.toLocaleString('id-ID')} | HPP: Rp{menu.hpp.toLocaleString('id-ID')}
                        </p>
                      </div>
                      <div className="w-32">
                        <input
                          type="number"
                          min="0"
                          value={inputs[menu.id] || ''}
                          onChange={(e) => handleInputChange(menu.id, e.target.value)}
                          placeholder="0 porsi"
                          className="block w-full rounded-lg border-0 py-2 px-3 text-gray-900 ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-blue-600 sm:text-sm text-center"
                        />
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Action / Helper Sidebar */}
          <div className="space-y-4">
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-5">
              <h3 className="font-bold text-blue-900 mb-2">Mengapa Simulasi Penting?</h3>
              <p className="text-sm text-blue-800 leading-relaxed">
                Anda dapat menguji apakah rencana produksi hari ini akan menghasilkan keuntungan maksimal atau justru membuang makanan.
                Algoritma CaterWise akan memperhitungkan <strong>cuaca, tren historis, dan Harga Pokok Penjualan (HPP)</strong>.
              </p>
            </div>
            
            <button
              onClick={handleSimulate}
              disabled={menus.length === 0 || !menus.some(m => (inputs[m.id] || 0) > 0)}
              className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3.5 px-4 rounded-xl shadow-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Jalankan Simulasi
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
