'use client';
export const dynamic = 'force-dynamic';
import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import { useRouter } from 'next/navigation';
import { FormattedNumberInput } from '@/components/ui/FormattedNumberInput';

export default function HistorySetupPage() {
  const [activeTab, setActiveTab] = useState<'manual' | 'upload'>('manual');
  const [menus, setMenus] = useState<any[]>([]);
  const [restaurantId, setRestaurantId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [hasData, setHasData] = useState(false);
  const [savedDates, setSavedDates] = useState<string[]>([]);

  // Form Manual State
  const [manualDate, setManualDate] = useState('');
  const [quantities, setQuantities] = useState<Record<string, string>>({});

  // Upload State
  const [csvData, setCsvData] = useState<any[]>([]);
  const [unmatchedMenus, setUnmatchedMenus] = useState<string[]>([]);

  const router = useRouter();
  const supabase = createClient();

  // Load Initial Data
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

        // Check if they already have data and get distinct dates
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

  // Auto-load quantities when a date is selected
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

  // Handle Manual Save (Upsert)
  const handleManualSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

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
      setSuccess('Data riwayat untuk tanggal ' + manualDate + ' berhasil disimpan!');
      setHasData(true);
      if (!savedDates.includes(manualDate)) {
        const newDates = [...savedDates, manualDate].sort((a, b) => new Date(b).getTime() - new Date(a).getTime());
        setSavedDates(newDates);
      }
      // Kita biarkan form tidak dikosongkan agar pengguna tahu datanya tersimpan
    }
    setLoading(false);
  };

  // Handle CSV File Selection
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
        // Handle comma separation and ignore empty columns
        const cols = line.split(',').map(c => c.trim());
        
        // Skip header if first line has non-numeric qty
        if (index === 0 && isNaN(parseInt(cols[2]))) return;
        
        // Strict Validation: Must have exactly 3 columns and they cannot be empty
        if (cols.length < 3 || !cols[0] || !cols[1] || !cols[2]) {
          formatError = true;
          return;
        }
        
        // Validate Date (basic check if it looks like YYYY-MM-DD or valid date string)
        if (isNaN(Date.parse(cols[0]))) {
          formatError = true;
          return;
        }

        // Validate Quantity
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

      // Normalisasi dan Mapping Nama Menu (Fuzzy Match)
      const normalize = (str: string) => str.toLowerCase().replace(/[^a-z0-9]/g, '');
      const unmatched = new Set<string>();
      const mappedData: any[] = [];

      parsed.forEach(row => {
        const normCsv = normalize(row.menuName);
        
        // 1. Coba cari kecocokan persis (setelah dinormalisasi dari spasi/huruf besar)
        let matchedMenu = menus.find(m => normalize(m.name) === normCsv);
        
        // 2. Jika tidak ketemu, coba cari yang mirip (mengandung kata yang sama)
        if (!matchedMenu) {
          matchedMenu = menus.find(m => {
            const normDb = normalize(m.name);
            // Hindari pencocokan yang terlalu pendek (misal cuma 1 huruf yang sama)
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
      setSuccess('Berhasil mengimpor data riwayat dari dokumen!');
      setCsvData([]);
      setHasData(true);

      // Update saved dates list
      const importedDates = Array.from(new Set(payload.map(p => p.sales_date)));
      const newDates = Array.from(new Set([...savedDates, ...importedDates])).sort((a, b) => new Date(b).getTime() - new Date(a).getTime());
      setSavedDates(newDates);
    }
    setLoading(false);
  };

  const finishOnboarding = () => {
    router.push('/dashboard');
  };

  return (
    <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-100">
      <h2 className="text-2xl font-bold text-gray-900 mb-2">Riwayat Penjualan (Wajib)</h2>
      <p className="text-gray-500 mb-6">CaterWise membutuhkan histori penjualan Anda untuk dapat memberikan *forecast* dan rekomendasi produksi harian. Silakan masukkan data historis secara manual atau unggah file CSV (Minimal data untuk 7 hari).</p>

      {error && <div className="mb-4 text-red-500 text-sm bg-red-50 p-3 rounded-lg">{error}</div>}
      {success && <div className="mb-4 text-green-600 text-sm bg-green-50 p-3 rounded-lg">{success}</div>}

      <div className="flex border-b border-gray-200 mb-6">
        <button
          className={`py-2 px-4 border-b-2 font-medium text-sm ${activeTab === 'manual' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
          onClick={() => setActiveTab('manual')}
        >
          Input Manual
        </button>
        <button
          className={`py-2 px-4 border-b-2 font-medium text-sm ${activeTab === 'upload' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
          onClick={() => setActiveTab('upload')}
        >
          Upload Dokumen (CSV)
        </button>
      </div>

      {activeTab === 'manual' && (
        <div className="space-y-8">
          <form onSubmit={handleManualSave} className="space-y-6">
            <div className="bg-blue-50/50 p-4 rounded-lg border border-blue-100">
              <label className="block text-sm font-semibold text-blue-900 mb-2">Pilih Tanggal Penjualan</label>
              <input
                type="date"
                value={manualDate}
                onChange={e => setManualDate(e.target.value)}
                required
                className="w-full max-w-xs rounded-lg border-gray-300 ring-1 ring-inset ring-gray-300 py-2 px-3 text-gray-900 focus:ring-2 focus:ring-blue-600"
              />
            </div>

            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-gray-700 border-b pb-2">Detail Terjual Per Menu</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {menus.map(menu => (
                  <div key={menu.id} className="flex items-center justify-between p-3 border border-gray-100 rounded-lg hover:bg-gray-50">
                    <span className="text-sm font-medium text-gray-800">
                      {menu.name} <span className="text-gray-500 font-normal text-xs">({menu.unit || 'Porsi'})</span>
                    </span>
                    <div className="w-32">
                      <FormattedNumberInput 
                        value={quantities[menu.id] || ''} 
                        onChange={(val) => handleQuantityChange(menu.id, val)} 
                        placeholder="0"
                        className="w-full rounded-md border-gray-300 ring-1 ring-inset ring-gray-300 py-1.5 px-3 text-right text-gray-900 focus:ring-2 focus:ring-blue-600 text-sm" 
                      />
                    </div>
                  </div>
                ))}
              </div>
              {menus.length === 0 && (
                <p className="text-sm text-gray-500 italic">Belum ada menu yang didaftarkan.</p>
              )}
            </div>
            
            <button type="submit" disabled={loading} className="bg-gray-900 text-white px-6 py-2.5 rounded-lg font-medium hover:bg-gray-800 disabled:opacity-50 text-sm">
              Simpan Data Tanggal Ini
            </button>
          </form>

          {/* Daftar Tanggal Tersimpan */}
          {savedDates.length > 0 && (
            <div className="pt-6 border-t border-gray-100">
              <h3 className="text-sm font-semibold text-gray-700 mb-3">Data yang Sudah Tersimpan (Klik untuk Edit)</h3>
              <div className="flex flex-wrap gap-2">
                {savedDates.map(date => (
                  <button
                    key={date}
                    onClick={() => {
                      setSuccess('');
                      setError('');
                      setManualDate(date);
                    }}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${manualDate === date ? 'bg-blue-100 text-blue-700 border-blue-200' : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100'}`}
                  >
                    {date}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'upload' && (
        <div className="space-y-6">
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:bg-gray-50 transition-colors">
            <input type="file" accept=".csv" onChange={handleFileUpload} className="block w-full text-sm text-gray-900 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer" />
            <p className="mt-2 text-xs text-gray-500">Format CSV: Tanggal (YYYY-MM-DD), Nama Menu, Jumlah Terjual</p>
          </div>

          {/* Contoh Format CSV */}
          <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
            <h4 className="text-sm font-semibold text-gray-800 mb-2">Contoh Format CSV yang Benar:</h4>
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
              <span className="font-semibold text-red-500">* Penting:</span> Sistem mewajibkan persis 3 kolom (tidak boleh kurang). 
              Sistem juga secara otomatis menyesuaikan nama menu jika ada perbedaan spasi atau huruf besar/kecil (contoh: "ayam goreng" otomatis dikenali sebagai "Ayam Goreng"). 
              <br/>Jika ada nama menu yang sama sekali berbeda atau belum diinput di tahap sebelumnya, data akan ditolak dan Anda harus menginputnya kembali dengan benar.
            </p>
          </div>

          {csvData.length > 0 && (
            <div className="mt-4">
              <h4 className="font-medium text-gray-800 mb-2">Preview Data ({csvData.length} baris)</h4>
              
              {unmatchedMenus.length > 0 && (
                <div className="bg-red-50 text-red-700 p-4 rounded-lg mb-4 text-sm">
                  <p className="font-bold mb-1">Data Ditolak!</p>
                  <p>Menu berikut ada di file CSV Anda tetapi sama sekali tidak mirip dengan menu yang sudah Anda input di tahap sebelumnya. Harap perbaiki CSV Anda agar sesuai:</p>
                  <ul className="list-disc ml-5 mt-2 font-medium">
                    {unmatchedMenus.map(m => <li key={m}>{m}</li>)}
                  </ul>
                </div>
              )}

              <button 
                onClick={saveCsvData} 
                disabled={loading || unmatchedMenus.length > 0} 
                className="bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-500 disabled:opacity-50"
              >
                Impor Data Sekarang
              </button>
            </div>
          )}
        </div>
      )}

      <div className="flex gap-4 pt-8 mt-8 border-t border-gray-100">
        <button 
          type="button" 
          onClick={() => router.push('/setup/menu')} 
          className="px-6 py-3 rounded-lg border border-gray-300 text-gray-700 font-semibold hover:bg-gray-50 transition-all text-sm"
        >
          Kembali
        </button>
        <button 
          onClick={finishOnboarding} 
          disabled={savedDates.length < 7}
          title={savedDates.length < 7 ? `Baru tersimpan ${savedDates.length} hari. Minimal 7 hari data riwayat penjualan.` : ""}
          className="flex-1 rounded-lg bg-blue-600 px-4 py-3 text-sm font-bold text-white shadow-sm transition-all hover:bg-blue-500 disabled:opacity-50 disabled:bg-gray-400 disabled:cursor-not-allowed"
        >
          {savedDates.length < 7 ? `Menunggu Data Riwayat (${savedDates.length}/7 Hari)` : 'Selesai Onboarding & Buka Dashboard 🚀'}
        </button>
      </div>
    </div>
  );
}
