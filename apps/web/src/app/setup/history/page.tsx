'use client';
export const dynamic = 'force-dynamic';
import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import { useRouter } from 'next/navigation';
import { FormattedNumberInput } from '@/components/ui/FormattedNumberInput';
import { SuccessDialog } from '@/components/ui/SuccessDialog';

export default function HistorySetupPage() {
  const [activeTab, setActiveTab] = useState<'manual' | 'upload'>('manual');
  const [menus, setMenus] = useState<any[]>([]);
  const [restaurantId, setRestaurantId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [hasData, setHasData] = useState(false);
  const [savedDates, setSavedDates] = useState<string[]>([]);

  const [manualDate, setManualDate] = useState('');
  const [quantities, setQuantities] = useState<Record<string, string>>({});

  const [csvData, setCsvData] = useState<any[]>([]);
  const [unmatchedMenus, setUnmatchedMenus] = useState<string[]>([]);
  const [selesaiTerbuka, setSelesaiTerbuka] = useState(false);

  const router = useRouter();
  const supabase = createClient();

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
        const { data: menuData } = await supabase
          .from('menus')
          .select('*')
          .eq('restaurant_id', restaurant.id);

        if (menuData) setMenus(menuData);

        const { data: sales } = await supabase
          .from('daily_sales')
          .select('sales_date')
          .in('menu_id', menuData ? menuData.map(m => m.id) : []);

        if (sales && sales.length > 0) {
          setHasData(true);
          const dates = Array.from(new Set(sales.map(s => s.sales_date)));
          setSavedDates(dates.sort((a, b) => new Date(b).getTime() - new Date(a).getTime()));
        }

      } else {
        router.push('/setup/profile');
      }
    }
    loadData();
  }, [supabase, router]);

  useEffect(() => {
    async function loadQuantitiesForDate() {
      if (!manualDate || menus.length === 0) {
        setQuantities({});
        return;
      }

      const { data: sales } = await supabase
        .from('daily_sales')
        .select('menu_id, quantity_sold')
        .eq('sales_date', manualDate)
        .in('menu_id', menus.map(m => m.id));

      if (sales && sales.length > 0) {
        const newQuantities: Record<string, string> = {};
        sales.forEach(s => {
          newQuantities[s.menu_id] = s.quantity_sold.toString();
        });
        setQuantities(newQuantities);
      } else {
        setQuantities({});
      }
    }
    loadQuantitiesForDate();
  }, [manualDate, menus, supabase]);

  const handleQuantityChange = (menuId: string, val: string) => {
    setQuantities(prev => ({ ...prev, [menuId]: val }));
  };

  const handleManualSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    if (!manualDate) {
      setError('Harap pilih tanggal terlebih dahulu.');
      setLoading(false);
      return;
    }

    const payload = menus
      .filter(m => quantities[m.id] && quantities[m.id].trim() !== '')
      .map(m => ({
        menu_id: m.id,
        sales_date: manualDate,
        quantity_sold: parseInt(quantities[m.id])
      }));

    if (payload.length === 0) {
      setError('Masukkan setidaknya 1 jumlah terjual untuk tanggal ini.');
      setLoading(false);
      return;
    }

    const { error: upsertError } = await supabase
      .from('daily_sales')
      .upsert(payload, { onConflict: 'menu_id, sales_date' });

    if (upsertError) {
      setError('Gagal menyimpan riwayat: ' + upsertError.message);
    } else {
      setHasData(true);
      if (!savedDates.includes(manualDate)) {
        const newDates = [...savedDates, manualDate].sort((a, b) => new Date(b).getTime() - new Date(a).getTime());
        setSavedDates(newDates);
      }
    }
    setLoading(false);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError('');
    setUnmatchedMenus([]);
    
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const lines = text.split('\n').map(line => line.trim()).filter(line => line !== '');
      
      const parsed: any[] = [];
      let formatError = false;

      lines.forEach((line, index) => {
        const cols = line.split(',').map(c => c.trim());
        
        if (index === 0 && isNaN(parseInt(cols[2]))) return;
        
        if (cols.length < 3 || !cols[0] || !cols[1] || !cols[2]) {
          formatError = true;
          return;
        }
        
        if (isNaN(Date.parse(cols[0]))) {
          formatError = true;
          return;
        }

        if (isNaN(parseInt(cols[2]))) {
          formatError = true;
          return;
        }

        parsed.push({ date: cols[0], menuName: cols[1], qty: cols[2] });
      });

      if (formatError || parsed.length === 0) {
        setError('Format data tidak sesuai, ada baris yang kosong/kurang, atau tanggal tidak valid. Pastikan file memiliki 3 kolom: Tanggal (YYYY-MM-DD), Nama Menu, dan Jumlah Terjual.');
        setCsvData([]);
        return;
      }

      const normalize = (str: string) => str.toLowerCase().replace(/[^a-z0-9]/g, '');
      const unmatched = new Set<string>();
      const mappedData: any[] = [];

      parsed.forEach(row => {
        const normCsv = normalize(row.menuName);
        
        let matchedMenu = menus.find(m => normalize(m.name) === normCsv);
        
        if (!matchedMenu) {
          matchedMenu = menus.find(m => {
            const normDb = normalize(m.name);
            if (normDb.length > 3 && normCsv.length > 3) {
               return normCsv.includes(normDb) || normDb.includes(normCsv);
            }
            return false;
          });
        }

        if (matchedMenu) {
          mappedData.push({ 
            ...row, 
            matchedMenuId: matchedMenu.id, 
            matchedMenuName: matchedMenu.name 
          });
        } else {
          unmatched.add(row.menuName);
        }
      });

      setCsvData(mappedData);
      setUnmatchedMenus(Array.from(unmatched));
    };
    reader.readAsText(file);
  };

  const saveCsvData = async () => {
    if (unmatchedMenus.length > 0) {
      setError('Terdapat menu yang tidak cocok. Harap perbaiki CSV Anda.');
      return;
    }

    setLoading(true);
    const payload = csvData.map(row => ({
      menu_id: row.matchedMenuId,
      sales_date: row.date,
      quantity_sold: parseInt(row.qty)
    }));

    const { error: upsertError } = await supabase
      .from('daily_sales')
      .upsert(payload, { onConflict: 'menu_id, sales_date' });

    if (upsertError) {
      setError('Gagal mengimpor CSV: ' + upsertError.message);
    } else {
      setCsvData([]);
      setHasData(true);

      const importedDates = Array.from(new Set(payload.map(p => p.sales_date)));
      const newDates = Array.from(new Set([...savedDates, ...importedDates])).sort((a, b) => new Date(b).getTime() - new Date(a).getTime());
      setSavedDates(newDates);
    }
    setLoading(false);
  };

  const finishOnboarding = () => {
    setSelesaiTerbuka(true);
  };

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-[1.6rem] font-bold leading-tight tracking-[-0.02em] text-ink sm:text-[2rem]">
          Riwayat penjualan
        </h1>
        <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted sm:text-base">
          Isi manual atau unggah CSV, disarankan minimal tujuh hari.
        </p>
      </div>

      {error && (
        <div className="mb-5 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <svg viewBox="0 0 24 24" fill="none" className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true">
            <path d="M12 8v5m0 3h.01M12 3l9 16H3l9-16z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          {error}
        </div>
      )}

      <div className="mb-6 inline-flex rounded-xl bg-gray-100 p-1">
        <button
          type="button"
          className={`rounded-lg px-4 py-2 text-sm font-semibold transition-all ${activeTab === 'manual' ? 'bg-white text-ink shadow-sm' : 'text-muted hover:text-ink'}`}
          onClick={() => setActiveTab('manual')}
        >
          Input manual
        </button>
        <button
          type="button"
          className={`rounded-lg px-4 py-2 text-sm font-semibold transition-all ${activeTab === 'upload' ? 'bg-white text-ink shadow-sm' : 'text-muted hover:text-ink'}`}
          onClick={() => setActiveTab('upload')}
        >
          Unggah CSV
        </button>
      </div>

      {activeTab === 'manual' && (
        <div className="space-y-5">
          <form onSubmit={handleManualSave}>
            <section className="rounded-2xl border border-hairline bg-white p-6 shadow-[0_1px_2px_rgba(11,16,32,0.03)] sm:p-8">
              <h2 className="text-base font-bold text-ink">Penjualan per tanggal</h2>
              <p className="mt-1 text-sm text-muted">Pilih tanggal, lalu isi jumlah terjual tiap menu.</p>

              <div className="mt-6 grid gap-6 md:grid-cols-[16rem_1fr] md:gap-7">
                <div>
                  <label htmlFor="manualDate" className="block text-sm font-semibold text-ink">
                    Tanggal penjualan
                  </label>
                  <input
                    id="manualDate"
                    type="date"
                    onClick={(e) => {
                      const el = e.currentTarget;
                      if (typeof el.showPicker === 'function') {
                        try { el.showPicker(); } catch {}
                      }
                    }}
                    value={manualDate}
                    onChange={e => setManualDate(e.target.value)}
                    required
                    className="mt-2 block h-11 w-full cursor-pointer rounded-xl border-0 bg-white px-3.5 text-sm text-ink ring-1 ring-inset ring-hairline focus:outline-none focus:ring-2 focus:ring-inset focus:ring-brand"
                  />
                </div>

                <div className="border-t border-hairline pt-6 md:border-l md:border-t-0 md:pl-7 md:pt-0">
                  <span className="block text-sm font-semibold text-ink">Jumlah terjual per menu</span>
                  <div className="mt-2 grid grid-cols-1 gap-3">
                    {menus.map(menu => (
                      <div key={menu.id} className="flex h-11 items-center justify-between gap-3 rounded-xl bg-gray-50 pl-4 pr-1.5">
                        <span className="min-w-0 truncate text-sm font-medium text-ink">
                          {menu.name} <span className="text-xs font-normal text-muted">({menu.unit || 'Porsi'})</span>
                        </span>
                        <div className="w-24 shrink-0">
                          <FormattedNumberInput
                            value={quantities[menu.id] || ''}
                            onChange={(val) => handleQuantityChange(menu.id, val)}
                            placeholder="0"
                            className="block h-8 w-full rounded-lg border-0 bg-white px-3 text-right text-sm text-ink ring-1 ring-inset ring-hairline placeholder:text-[#9aa5bd] focus:outline-none focus:ring-2 focus:ring-inset focus:ring-brand"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                  {menus.length === 0 && (
                    <p className="mt-2 text-sm text-muted">Belum ada menu yang didaftarkan.</p>
                  )}
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="mt-6 inline-flex h-11 items-center justify-center rounded-xl bg-brand px-6 text-sm font-bold text-white transition-colors hover:bg-[#1540e0] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink disabled:cursor-not-allowed disabled:bg-[#c3ccdf]"
              >
                {loading ? 'Menyimpan...' : 'Simpan tanggal ini'}
              </button>
            </section>
          </form>

          {savedDates.length > 0 && (
            <section className="rounded-2xl border border-hairline bg-white p-6 shadow-[0_1px_2px_rgba(11,16,32,0.03)] sm:p-8">
              <h2 className="text-base font-bold text-ink">Tanggal tersimpan</h2>
              <p className="mt-1 text-sm text-muted">
                {savedDates.length} hari terisi. Klik salah satu untuk mengubah datanya.
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                {savedDates.map(date => (
                  <button
                    key={date}
                    type="button"
                    onClick={() => {
                                        setError('');
                      setManualDate(date);
                    }}
                    className={`rounded-full px-3.5 py-1.5 text-xs font-semibold tabular-nums transition-all ${manualDate === date ? 'bg-brand text-white' : 'bg-gray-50 text-muted ring-1 ring-inset ring-hairline hover:text-ink hover:ring-[#c9d4f5]'}`}
                  >
                    {date}
                  </button>
                ))}
              </div>
            </section>
          )}
        </div>
      )}

      {activeTab === 'upload' && (
        <div className="space-y-5">
          <section className="rounded-2xl border border-hairline bg-white p-6 shadow-[0_1px_2px_rgba(11,16,32,0.03)] sm:p-8">
            <h2 className="text-base font-bold text-ink">Unggah berkas CSV</h2>
            <p className="mt-1 text-sm text-muted">Tiga kolom: tanggal, nama menu, jumlah terjual.</p>

            <div className="mt-5 rounded-xl border-2 border-dashed border-hairline p-6 text-center transition-colors hover:border-[#c9d4f5] hover:bg-gray-50">
              <input type="file" accept=".csv" onChange={handleFileUpload} className="block w-full cursor-pointer text-sm text-muted file:mr-4 file:cursor-pointer file:rounded-lg file:border-0 file:bg-wash file:px-4 file:py-2 file:text-sm file:font-semibold file:text-brand hover:file:bg-[#e6ecff]" />
            </div>
          </section>

          {csvData.length > 0 && (
            <section className="rounded-2xl border border-hairline bg-white p-6 shadow-[0_1px_2px_rgba(11,16,32,0.03)] sm:p-8">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-base font-bold text-ink">Pratinjau</h2>
                  <p className="mt-1 text-sm text-muted">{csvData.length} baris terbaca dari berkas.</p>
                </div>
                <button
                  type="button"
                  onClick={saveCsvData}
                  disabled={loading || unmatchedMenus.length > 0}
                  className="inline-flex h-11 shrink-0 items-center justify-center rounded-xl bg-brand px-6 text-sm font-bold text-white transition-colors hover:bg-[#1540e0] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink disabled:cursor-not-allowed disabled:bg-[#c3ccdf]"
                >
                  {loading ? 'Mengimpor...' : 'Impor data'}
                </button>
              </div>

              {unmatchedMenus.length > 0 && (
                <div className="mt-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                  <p className="font-bold">Menu berikut tidak dikenali</p>
                  <p className="mt-1">Nama ini tidak ada pada daftar menu Anda. Perbaiki berkasnya lalu unggah ulang.</p>
                  <ul className="ml-5 mt-2 list-disc font-semibold">
                    {unmatchedMenus.map(m => <li key={m}>{m}</li>)}
                  </ul>
                </div>
              )}
            </section>
          )}

          <section className="rounded-2xl border border-hairline bg-white p-6 shadow-[0_1px_2px_rgba(11,16,32,0.03)] sm:p-8">
            <h4 className="text-base font-bold text-ink mb-3">Contoh format yang benar</h4>
            <div className="overflow-x-auto">
              <table className="min-w-full text-xs text-left text-gray-600 bg-white">
                <thead className="bg-gray-100 text-gray-700 font-medium">
                  <tr>
                    <th className="px-3 py-2 border">Tanggal</th>
                    <th className="px-3 py-2 border">Nama Menu</th>
                    <th className="px-3 py-2 border">Jumlah Terjual</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="px-3 py-2 border">2023-10-01</td>
                    <td className="px-3 py-2 border">Ayam Goreng</td>
                    <td className="px-3 py-2 border">45</td>
                  </tr>
                  <tr>
                    <td className="px-3 py-2 border">2023-10-01</td>
                    <td className="px-3 py-2 border">Sop Buntut</td>
                    <td className="px-3 py-2 border">20</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p className="text-xs text-gray-500 mt-3 leading-relaxed">
              <span className="font-semibold text-ink">Satu hari butuh beberapa baris,</span> satu baris untuk
              tiap menu. Contoh di atas: dua baris, tetapi keduanya bertanggal sama, jadi terhitung satu hari.
              Kalau Anda punya {menus.length || 3} menu, tujuh hari berarti {(menus.length || 3) * 7} baris.
            </p>
            <p className="mt-3 text-xs leading-relaxed text-muted">
              <span className="font-semibold text-ink">Penting:</span> berkas wajib berisi tepat tiga kolom.
              Perbedaan spasi dan huruf besar-kecil pada nama menu disesuaikan otomatis, tetapi nama yang
              belum terdaftar pada langkah sebelumnya akan ditolak.
            </p>
          </section>
        </div>
      )}

      <div className="mt-5 flex flex-col gap-3 pt-1 sm:flex-row sm:items-center sm:justify-end sm:gap-4">
        {savedDates.length < 7 && (
          <span className="text-sm text-muted sm:mr-auto">
            Terisi {savedDates.length} dari 7 tanggal berbeda
          </span>
        )}
        <button
          type="button"
          onClick={() => router.push('/setup/menu')}
          className="inline-flex h-12 items-center justify-center rounded-xl bg-white px-6 text-sm font-bold text-ink ring-1 ring-inset ring-hairline transition-colors hover:ring-[#c9d4f5] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
        >
          Kembali
        </button>
        <button
          type="button"
          onClick={finishOnboarding}
          disabled={savedDates.length < 7}
          className="inline-flex h-12 items-center justify-center rounded-xl bg-brand px-8 text-sm font-bold text-white transition-colors hover:bg-[#1540e0] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink disabled:cursor-not-allowed disabled:bg-[#c3ccdf]"
        >
          Buka dashboard
        </button>
      </div>

      <SuccessDialog
        isOpen={selesaiTerbuka}
        title="Pengaturan selesai"
        message={`${menus.length} menu dan ${savedDates.length} hari riwayat tersimpan.`}
        actionText="Buka dashboard"
        onAction={() => router.push('/dashboard')}
      />
    </div>
  );
}
