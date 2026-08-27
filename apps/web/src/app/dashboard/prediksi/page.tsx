'use client';
export const dynamic = 'force-dynamic';
import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import { useRouter } from 'next/navigation';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { API_BASE_URL } from '@/utils/api';
import Link from 'next/link';

interface ForecastItem {
  menu_id: string;
  menu_name: string;
  menu_unit?: string;
  predicted_quantity: number;
  model_used: string;
  ai_justification?: string;
  mae?: number;
  mape?: number;
}

export default function PrediksiPage() {
  const supabase = createClient();
  const router = useRouter();
  
  const [loading, setLoading] = useState(true);
  const [forecasts, setForecasts] = useState<ForecastItem[]>([]);
  const [aiInsight, setAiInsight] = useState<string>('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [targetDateStr, setTargetDateStr] = useState('target');
  const [weatherInfo, setWeatherInfo] = useState('');
  const [targetDayName, setTargetDayName] = useState('');
  const [isStockAlreadySet, setIsStockAlreadySet] = useState(false);
  const [metricDialog, setMetricDialog] = useState<any>({ isOpen: false });
  const [loadingStep, setLoadingStep] = useState(0);
  useEffect(() => {
    let isMounted = true;
    let done = false; // Pastikan hanya 1 request yang benar-benar selesai

    async function runPrediction() {
      try {
        setLoadingStep(0);
        const { data: { session } } = await supabase.auth.getSession();
        if (!isMounted || done) return;
        if (!session) { router.push('/login'); return; }

        const { data: restaurants } = await supabase
          .from('restaurants')
          .select('id')
          .eq('owner_id', session.user.id)
          .limit(1);

        const restaurant = restaurants?.[0];
        if (!isMounted || done) return;
        if (!restaurant) throw new Error('Restoran tidak ditemukan. Pastikan Anda sudah mengatur profil restoran.');

        const targetDate = new Date();
        targetDate.setDate(targetDate.getDate() + 1);
        const year = targetDate.getFullYear();
        const month = String(targetDate.getMonth() + 1).padStart(2, '0');
        const day = String(targetDate.getDate()).padStart(2, '0');
        const dateStr = `${year}-${month}-${day}`;

        if (isMounted && !done) {
          setTargetDateStr(dateStr);
          setTargetDayName(['Minggu','Senin','Selasa','Rabu','Kamis','Jumat','Sabtu'][targetDate.getDay()]);
          setLoadingStep(1);
        }

        let wName = 'Cerah';
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 2000);
          const wRes = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=-7.2504&longitude=112.7688&daily=weathercode&timezone=Asia%2FJakarta&start_date=${dateStr}&end_date=${dateStr}`, { signal: controller.signal });
          clearTimeout(timeoutId);
          const wData = await wRes.json();
          const code = wData?.daily?.weathercode?.[0];
          if (code !== undefined) {
            if (code >= 50 && code <= 69) wName = 'Gerimis / Hujan Ringan';
            else if (code >= 70 && code <= 99) wName = 'Hujan Lebat / Badai';
            else if (code >= 1 && code <= 3) wName = 'Berawan';
          }
        } catch (e) { /* gunakan default Cerah */ }
        if (!isMounted || done) return;
        setWeatherInfo(wName);
        setLoadingStep(2);

        const res = await fetch(`${API_BASE_URL}/forecast`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ restaurant_id: restaurant.id, target_date: dateStr, weather_info: wName })
        });

        if (!isMounted || done) return;
        if (!res.ok) throw new Error('Gagal menghubungi AI Backend (Pastikan server Python berjalan)');

        const data = await res.json();
        if (!isMounted || done) return;

        // Tandai selesai agar call paralel kedua (Strict Mode) tidak menimpa
        done = true;

        setForecasts(data.forecasts);
        setAiInsight(data.ai_insight);

        const menuIds = data.forecasts.map((f: any) => f.menu_id);
        if (menuIds.length > 0) {
          const { count } = await supabase
            .from('daily_production')
            .select('*', { count: 'exact', head: true })
            .eq('production_date', dateStr)
            .in('menu_id', menuIds);
          if (isMounted) setIsStockAlreadySet((count || 0) > 0);
        }

        if (isMounted) setLoading(false);

      } catch (err: any) {
        if (isMounted && !done) {
          setError(err.message || 'Terjadi kesalahan saat membuat prediksi');
          setLoading(false);
        }
      }
    }

    runPrediction();
    return () => { isMounted = false; };
  }, []);

  const handleSaveStock = async () => {
    setSaving(true);
    try {
      const payload = forecasts.map(f => ({
        menu_id: f.menu_id,
        production_date: targetDateStr,
        quantity: f.predicted_quantity
      }));

      const { error: upsertErr } = await supabase
        .from('daily_production')
        .upsert(payload, { onConflict: 'menu_id, production_date' });
      
      if (upsertErr) throw upsertErr;

      setIsStockAlreadySet(true);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err: any) {
      alert('Gagal menyimpan stok: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const Loading3D = () => (
    <div className="flex flex-col items-center justify-center py-24 space-y-12 min-h-[60vh]">
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
          <div className="absolute inset-0 bg-gradient-to-br from-blue-400 to-indigo-600 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.3)] flex items-center justify-center border-4 border-white/20">
            <span className="text-6xl drop-shadow-md">🏪</span>
          </div>
          <div className="absolute -top-8 -left-8 bg-green-100 p-3 rounded-full shadow-lg border border-green-300" style={{ animation: 'bounce-slow 3s ease-in-out infinite' }}>
            <span className="text-3xl">💵</span>
          </div>
          <div className="absolute -bottom-6 -right-6 bg-yellow-100 p-3 rounded-full shadow-lg border border-yellow-300" style={{ animation: 'bounce-slow 3s ease-in-out infinite 1.5s' }}>
            <span className="text-3xl">🪙</span>
          </div>
          <div className="absolute top-1/2 -right-12 bg-white/90 backdrop-blur p-4 rounded-full shadow-xl border border-gray-100 z-10" style={{ animation: 'pulse-glass 2s ease-in-out infinite' }}>
            <span className="text-4xl">🔍</span>
          </div>
        </div>
      </div>
      <div className="text-center space-y-2">
        <h3 className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">
          AI & Algoritma Sedang Bekerja
        </h3>
        <p className="text-gray-500 font-medium">Menganalisis pola historis, cuaca, dan menghitung prediksi untuk Anda...</p>
      </div>
    </div>
  );

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-12">
      {/* Breadcrumb & Header */}
      <div className="flex items-center justify-between border-b border-gray-100 pb-4">
        <div className="flex items-center gap-4">
          <Link href="/dashboard" className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-500">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
            </svg>
          </Link>
          <div>
            <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
              <Link href="/dashboard" className="hover:text-blue-600 transition-colors">Dashboard</Link>
              <span>/</span>
              <span className="font-medium text-gray-900">Prediksi AI</span>
            </div>
            <h1 className="text-2xl font-bold text-gray-900">Prediksi Penjualan Besok</h1>
            {!loading && !error && targetDateStr !== 'target' && (
              <div className="flex items-center gap-3 mt-2 text-sm font-medium">
                <div className="bg-blue-50 text-blue-700 px-3 py-1 rounded-full border border-blue-100 flex items-center gap-1.5">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5" /></svg>
                  {targetDayName}, {new Date(targetDateStr).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                </div>
                {weatherInfo && (
                  <div className="bg-slate-50 text-slate-700 px-3 py-1 rounded-full border border-slate-200 flex items-center gap-1.5">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15a4.5 4.5 0 0 0 4.5 4.5H18a3.75 3.75 0 0 0 1.332-7.257 3 3 0 0 0-3.758-3.848 5.25 5.25 0 0 0-10.233 2.33A4.502 4.502 0 0 0 2.25 15Z" /></svg>
                    Perkiraan Cuaca: {weatherInfo}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
        {!loading && !error && ( 
          <div className="flex flex-col items-end gap-1.5">
            <div className="flex items-center gap-3">
              {isStockAlreadySet && !saveSuccess && (
                <span className="text-sm text-emerald-600 font-semibold flex items-center gap-1 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-100">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" /></svg>
                  Sudah Terjadwal
                </span>
              )}
              {saveSuccess && (
                <span className="text-sm text-emerald-600 font-bold animate-bounce flex items-center gap-1">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" /></svg>
                  Tersimpan!
                </span>
              )}
              <button
                onClick={handleSaveStock}
                disabled={saving}
                className="bg-blue-600 text-white px-6 py-2.5 rounded-xl font-semibold shadow-sm hover:bg-blue-700 transition-all active:scale-95 disabled:opacity-70 flex items-center gap-2"
              >
                {saving ? 'Menyimpan...' : (isStockAlreadySet ? 'Perbarui Stok Besok' : 'Simpan Sebagai Stok Besok')}
              </button>
            </div>
            {isStockAlreadySet && (
              <span className="text-xs text-gray-500 mr-1">Data akan otomatis muncul pada form penjualan besok hari</span>
            )}
          </div>
        )}
      </div>

      {loading ? (
        <Loading3D />
      ) : error ? (
        <div className="bg-red-50 border border-red-200 text-red-700 p-6 rounded-2xl flex flex-col items-center justify-center min-h-[40vh] text-center gap-4">
          <svg className="w-12 h-12 text-red-500" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
          <div>
            <h3 className="text-lg font-bold mb-1">Terjadi Kesalahan</h3>
            <p className="text-sm font-medium opacity-90">{error}</p>
          </div>
          <button onClick={() => window.location.reload()} className="mt-2 bg-red-600 hover:bg-red-700 text-white px-6 py-2 rounded-lg font-semibold transition-colors">
            Coba Lagi
          </button>
        </div>
      ) : (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
          {aiInsight && (
            <div className="bg-gray-900 border border-gray-800 p-6 md:p-8 rounded-2xl relative overflow-hidden shadow-xl">
              <div className="absolute top-0,right-0 p-4 opacity-5 pointer-events-none">
                <svg className="w-48 h-48 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2L9 9H2L7 14L5 21L12 17L19 21L17 14L22 9H15L12 2Z"/></svg>
              </div>
              <h3 className="text-lg md:text-xl font-bold text-white mb-5 flex items-center gap-3">
                <div className="p-2 bg-blue-500/20 rounded-lg">
                  <svg className="w-6 h-6 text-blue-400" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 0 0-2.456 2.456ZM16.894 20.567 16.5 21.75l-.394-1.183a2.25 2.25 0 0 0-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 0 0 1.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 0 0 1.423 1.423l1.183.394-1.183.394a2.25 2.25 0 0 0-1.423 1.423Z" /></svg>
                </div>
                AI Insights & Rekomendasi
              </h3>
              <div className="text-sm md:text-base text-gray-300 leading-relaxed space-y-3 whitespace-pre-wrap relative z-10">
                {aiInsight}
              </div>
            </div>
          )}

          <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
            <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between">
              <h3 className="font-bold text-gray-900">Rincian Prediksi Produksi</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-gray-600">
                <thead className="bg-gray-50 text-xs uppercase font-semibold text-gray-500">
                  <tr>
                    <th className="px-6 py-4">Menu</th>
                    <th className="px-6 py-4 text-center">Rekomendasi (Porsi)</th>
                    <th className="px-6 py-4">Alasan AI</th>
                    <th className="px-6 py-4"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {forecasts.map((f) => (
                    <tr key={f.menu_id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 font-medium text-gray-900">{f.menu_name}</td>
                      <td className="px-6 py-4 text-center">
                        <span className="inline-flex items-center justify-center bg-blue-600 text-white font-bold px-4 py-1.5 rounded-lg text-lg shadow-sm">
                          {f.predicted_quantity} <span className="text-xs opacity-80 font-normal ml-1.5">{f.menu_unit || 'porsi'}</span>
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900 font-medium">
                        {f.ai_justification || 'Dipilih berdasarkan pola data historis.'}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button
                          type="button"
                          onClick={() => setMetricDialog({
                            isOpen: true,
                            menuName: f.menu_name,
                            modelUsed: f.model_used,
                            mae: f.mae,
                            mape: f.mape
                          })}
                          className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-200 rounded-md transition-all"
                          title="Detail Metrik"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.75a.75.75 0 1 1 0-1.5.75.75 0 0 1 0 1.5ZM12 12.75a.75.75 0 1 1 0-1.5.75.75 0 0 1 0 1.5ZM12 18.75a.75.75 0 1 1 0-1.5.75.75 0 0 1 0 1.5Z" />
                          </svg>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
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
      <p className="text-xs text-gray-400 text-center mt-2 flex items-center justify-center gap-1.5">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5 flex-shrink-0">
          <path fillRule="evenodd" d="M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0Zm-7-4a1 1 0 1 1-2 0 1 1 0 0 1 2 0ZM9 9a.75.75 0 0 0 0 1.5h.253a.25.25 0 0 1 .244.304l-.459 2.066A1.75 1.75 0 0 0 10.747 15H11a.75.75 0 0 0 0-1.5h-.253a.25.25 0 0 1-.244-.304l.459-2.066A1.75 1.75 0 0 0 9.253 9H9Z" clipRule="evenodd" />
        </svg>
        Hasil ini adalah <strong>estimasi</strong> berdasarkan data historis. Sistem dapat melakukan kesalahan — selalu lakukan pengecekan ulang sebelum mengambil keputusan.
      </p>
    </div>
  );
}
