# CaterWise

CaterWise adalah platform web-based decision-support untuk membantu rumah makan prasmanan menentukan jumlah produksi makanan berdasarkan pola permintaan historis.

## Arsitektur (Monorepo)

Project ini menggunakan arsitektur monorepo dengan **pnpm workspaces**:

- `apps/web`: Aplikasi utama frontend & backend (Next.js 15+, React 19, Tailwind CSS v4)
- `supabase`: Konfigurasi dan migrasi database Supabase.

## Tech Stack
- **Framework**: Next.js (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Database & Auth**: Supabase (PostgreSQL)

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

### 1. Prasyarat
- Node.js (v18 atau lebih baru)
- pnpm (v9 atau lebih baru)
- Docker Desktop (jika ingin menjalankan Supabase secara lokal)
- Supabase CLI

### 2. Install Dependensi
```bash
pnpm install
```

### 3. Menjalankan Database Lokal (Supabase)
Pastikan Docker sudah berjalan, kemudian eksekusi:
```bash
npx supabase start
```
Perintah ini akan menjalankan container Supabase dan secara otomatis menjalankan migrasi yang ada di `supabase/migrations/`.

Setelah berhasil, Anda akan mendapatkan `API URL` dan `anon key`.

### 4. Setup Environment Variables
Buat file `.env.local` di dalam folder `apps/web/`:
```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_api_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 5. Menjalankan Aplikasi Web
```bash
pnpm dev
```
Buka [http://localhost:3000](http://localhost:3000) di browser Anda.

---
**Note:** Client Supabase SSR sudah terkonfigurasi di `apps/web/src/utils/supabase/` dan terdapat middleware yang akan otomatis melakukan session refresh pada Next.js app.
