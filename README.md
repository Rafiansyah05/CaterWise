# CaterWise

CaterWise adalah platform web-based decision-support untuk membantu rumah makan prasmanan menentukan jumlah produksi makanan berdasarkan pola permintaan historis.

## Arsitektur (Monorepo)

Project ini menggunakan arsitektur monorepo dengan **pnpm workspaces**:

- `apps/web`: Aplikasi utama frontend & backend (Next.js 15+, React 19, Tailwind CSS v4)
- `supabase`: Konfigurasi dan migrasi database Supabase.

## Tech Stack

**Web Application:**
- **Framework**: Next.js 15+ (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS v4

**AI & Forecasting Backend:**
- **Framework**: FastAPI
- **Language**: Python
- **Machine Learning**: XGBoost, scikit-learn, Pandas
- **Generative AI**: Google Gemini API (Flash Lite)

**Database & Infrastructure:**
- **Platform**: Supabase (PostgreSQL + Auth + RLS)

## Project Progress (Agile Sprints)

Proses pengembangan CaterWise dilakukan dengan metodologi Agile untuk memastikan setiap iterasi berfokus pada nilai guna aplikasi. Berikut adalah *milestones* dan status eksekusi dari masing-masing Sprint:

### Sprint 1: Foundation & Database Architecture
**Fokus:** Penyiapan infrastruktur dasar, konfigurasi basis data, dan keamanan akses (Multi-tenancy).
- ✅ **Project Setup:** Struktur Monorepo (Next.js frontend & Python FastAPI backend) berhasil dikonfigurasi dan dapat dijalankan.
- ✅ **Database & Schema:** Supabase PostgreSQL terintegrasi penuh. Skema utama untuk entitas restoran, menu, produksi, dan penjualan harian telah dibuat.
- ✅ **Keamanan Data (RLS):** *Row-Level Security* aktif pada seluruh tabel. Isolasi data antar restoran terjamin (setiap kueri otomatis tervalidasi secara aman berdasarkan ID otentikasi *owner*).

### Sprint 2: Authentication, Core UI, & Data Entry
**Fokus:** Pengalaman pengguna (UX), autentikasi aman, tata letak antarmuka, dan manajemen operasional dasar.
- ✅ **Autentikasi & Onboarding:** *Sign Up*, *Sign In*, dan verifikasi OTP (*One-Time Password*) menggunakan Supabase Auth berjalan mulus. Pengguna baru dapat melakukan *Restaurant setup* dan *Menu setup* dengan lancar.
- ✅ **UI/UX & Routing:** *Main layout*, *responsive layout*, dan *protected routes* selesai dibangun. Pengguna diarahkan secara aman sesuai status sesi login mereka.
- ✅ **Manajemen Operasional:** Pengguna dapat dengan mudah menambah, mengubah, dan menonaktifkan (*deactivate*) menu tanpa menghapus data historis.
- ✅ **Data Pencatatan (Recording):** Fitur pengisian rekap penjualan harian (*Daily Sales*) berjalan dan tervalidasi. Sistem mampu menghitung nilai surplus secara mandiri berdasarkan angka produksi dan penjualan.

### Sprint 3: Forecasting Engine & AI Insights
**Fokus:** Algoritma prediksi permintaan pasar (*demand forecasting*) dan kecerdasan buatan (*Generative AI*).
- ✅ **Dashboard Analytics:** Dasbor utama berhasil menampilkan *overview* data aktual dan *timeline* riwayat prediksi kecerdasan buatan.
- ✅ **Forecasting Terukur (ML):** Integrasi *backend* Python berhasil memproduksi model *Weighted Moving Average* (WMA) dan *XGBoost*. *XGBoost* secara dinamis dilatih untuk prediksi tingkat lanjut jika *historical data* mencukupi.
- ✅ **Walk-Forward Validation:** Evaluasi model dilakukan dengan *time-series walk-forward validation* 5 hari untuk menghasilkan akurasi yang representatif, bukan sekadar estimasi acak.
- ✅ **Model Selection & Rekomendasi:** Kesalahan metrik mutlak (*MAE* dan *MAPE*) dihitung per menu. Sistem otomatis memilih algoritma dengan galat terkecil untuk mencetak *Production Recommendation* esok hari.
- ✅ **Gemini AI Integration:** Google Gemini 2.0 Flash terintegrasi secara asinkron (*parallel processing*) untuk menerjemahkan data mentah (prediksi, histori cuaca Open-Meteo, & libur) menjadi *AI Insight* / alasan per menu yang mudah dipahami pemilik restoran.

### Sprint 4: Surplus Redistribution Workflow
**Fokus:** Penanganan *food waste* / surplus makanan dan integrasi penyaluran donasi.
- ✅ **Actual Surplus Detection:** Halaman "Distribusi Surplus" mampu membedakan antara *Estimated Surplus* (dari sistem) dengan *Actual Surplus* (dari kondisi fisik yang dihitung pegawai).
- ✅ **Validasi Kelayakan Konsumsi:** Alur kerja mengharuskan pengguna memvalidasi *disclaimer* kelayakan dan keamanan pangan mandiri sebelum bisa melakukan donasi.
- ✅ **Food Rescue Workflow:** Sistem distribusi (*redistribution workflow*) untuk sisa makanan beroperasi melalui pembuatan templat *pre-filled* WhatsApp langsung ke mitra (Garda Pangan). Hal ini menciptakan proses pengajuan jemput yang cepat tanpa *overhead* operasional di tahap MVP.

## Cara Menjalankan Project

Aplikasi ini berjalan dengan dua *service* terpisah (Frontend Next.js dan Backend Python) serta menggunakan database lokal Supabase.

### 1. Prasyarat
- **Node.js** (v18 atau lebih baru)
- **pnpm** (v9 atau lebih baru)
- **Python** (v3.10 atau lebih baru)
- **Docker Desktop** (wajib berjalan jika menggunakan Supabase lokal)
- **Supabase CLI**

### 2. Install Dependensi Node (Frontend)
Jalankan perintah ini di root *folder* proyek:
```bash
pnpm install
```

### 3. Install Dependensi Python (Backend)
Buka terminal baru, masuk ke folder `apps/api/` dan buat *virtual environment*:
```bash
cd apps/api
python -m venv .venv

# Aktivasi venv (Windows):
.venv\Scripts\activate
# Aktivasi venv (Mac/Linux):
source .venv/bin/activate

# Install requirements
pip install -r requirements.txt
```

### 4. Menjalankan Database Lokal (Supabase)
Pastikan aplikasi Docker sudah berjalan, kemudian eksekusi di root proyek:
```bash
npx supabase start
```
*Perintah ini akan mendownload *image* Supabase, menjalankannya, dan secara otomatis mengeksekusi skema database yang ada di `supabase/migrations/`.*
Setelah selesai, terminal akan menampilkan **API URL** dan **anon key**.

### 5. Konfigurasi Environment Variables
Buat sebuah file bernama `.env` di root proyek (atau di dalam `apps/web/.env.local`) yang berisi:
```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_api_url_disini
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key_disini
GEMINI_API_KEY=your_gemini_api_key_disini
```
*(Backend Python akan secara otomatis membaca variabel-variabel di atas).*

### 6. Menjalankan Aplikasi Web & AI (2 Terminal)

Untuk menjalankan CaterWise secara penuh, Anda membutuhkan 2 terminal yang berjalan bersamaan:

**Terminal 1 (Frontend Next.js):**
Pastikan berada di root direktori, lalu jalankan:
```bash
pnpm dev
```
*Frontend akan berjalan di [http://localhost:3000](http://localhost:3000)*.

**Terminal 2 (Backend Python FastAPI):**
Pastikan *virtual environment* masih aktif, masuk ke folder `apps/api/`, lalu jalankan:
```bash
cd apps/api
python main.py
```
*Backend AI akan berjalan di [http://localhost:8000](http://localhost:8000)*.

---
**Note:** Client Supabase SSR sudah terkonfigurasi di `apps/web/src/utils/supabase/` lengkap dengan fungsi *middleware* yang otomatis memperbarui sesi (*session refresh*) untuk Next.js.
