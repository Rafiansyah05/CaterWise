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

### Sprint 5: Risk Simulation & Profitability Engine
**Fokus:** Uji skenario/rencana produksi harian untuk mengkalkulasi profitabilitas, potensi risiko, dan sisa makanan yang terbuang.
- ✅ **Skenario Input:** *Simulation input* tersedia. Pengguna dapat menentukan target tanggal simulasi serta jumlah rencana porsi yang akan dimasak (stok) untuk setiap menu aktif.
- ✅ **Simulation Engine (ML):** *Simulation engine* berjalan sukses di *backend*. Otomatis mengekstraksi *demand forecast* (mempertimbangkan cuaca & kalender) lalu menyandingkannya dengan rencana stok untuk mendapatkan prediksi jumlah terjual (*Simulated Sold*) dan jumlah sisa porsi (*Simulated Surplus*).
- ✅ **Financial Calculation:** *Revenue/cost/profit calculation* berjalan. Berdasarkan data HPP (Biaya Produksi) dan Harga Jual, sistem menampilkan angka Proyeksi Pendapatan, Biaya, dan Untung-Rugi secara *real-time*.
- ✅ **Generative AI Analysis:** Gemini dapat menjelaskan hasil simulasi. Terintegrasi dengan hitungan metrik finansial dan data cuaca, Gemini memberikan *Executive Summary* untuk menasihati pemilik restoran mengenai efisiensi rencana produksi tersebut (sudah optimal atau berisiko kerugian).

### Sprint 6: Containerization & Continuous Deployment
**Fokus:** Membawa aplikasi keluar dari lingkungan lokal menjadi layanan yang berjalan permanen dan dapat diperbarui secara berulang.
- ✅ **Containerization:** *Dockerfile* terpisah untuk aplikasi web (Next.js *standalone output*) dan *service* AI (Python), diorkestrasi melalui satu berkas `docker-compose.yml` sehingga kedua *service* dapat dijalankan bersamaan dengan satu perintah.
- ✅ **Build Pipeline (CI):** *GitHub Actions* dikonfigurasi untuk membangun kedua *image* secara otomatis setiap kali terjadi perubahan pada *branch* utama, lalu mendorong hasilnya ke Docker Hub sebagai *registry*.
- ✅ **Secret Management:** Kredensial sensitif dipisahkan menurut waktu pakainya. Variabel `NEXT_PUBLIC_*` disuntikkan sebagai *build args* dari *GitHub Secrets* saat kompilasi, sedangkan kunci rahasia sisi server dibaca dari berkas `.env` ketika *container* dijalankan.
- ✅ **Deployment Script:** Skrip `deploy.sh` menyatukan proses penarikan kode terbaru, pengambilan *image* dari *registry*, dan pemuatan ulang *container* menjadi satu langkah tunggal di server produksi.
- ✅ **Rendering Strategy:** Seluruh halaman yang bergantung pada sesi Supabase ditandai *dynamic rendering* untuk mencegah kegagalan *prerender* pada tahap *build*.

### Sprint 7: Automated Reminder & Interface Refinement
**Fokus:** Menjaga kedisiplinan pencatatan harian melalui pengingat otomatis, serta merapikan antarmuka agar layak ditampilkan kepada pengguna akhir.
- ✅ **WhatsApp Reminder Engine:** Pengingat otomatis pukul 21.00 dikirim melalui *gateway* Fonnte kepada pemilik yang belum merekap penjualan hari itu. Pesan memuat tautan langsung menuju halaman input penjualan, dan *endpoint* pengirimnya dikunci dengan *bearer token* agar tidak dapat dipicu pihak luar.
- ✅ **Timezone-aware Scheduling:** Zona waktu setiap pemilik direkam otomatis dari peramban saat pengaturan profil. *Scheduler* `pg_cron` berjalan setiap jam, lalu menyaring pengguna yang saat itu tepat berada di pukul 21.00 menurut zona waktunya masing-masing, sehingga satu jadwal melayani seluruh wilayah.
- ✅ **Delivery Guard:** Tabel `reminder_logs` memastikan setiap restoran hanya menerima satu pengingat per hari. Hari tutup restoran dilewati, dan catatan pengiriman dibatalkan kembali apabila pengiriman gagal agar pengingat tidak hilang diam-diam.
- ✅ **Landing Page:** Halaman depan dirancang ulang dengan *navbar* tetap, *hero* berisi grafik permintaan yang menggambar dirinya sendiri dari riwayat menuju prediksi, bagian fitur, FAQ, serta animasi masuk yang menghormati preferensi *reduced motion*.

## Cara Menjalankan Project

Aplikasi ini berjalan dengan dua *service* terpisah (Frontend Next.js dan Backend Python) serta menggunakan database lokal Supabase.

### 1. Prasyarat
- **Node.js** (v18 atau lebih baru)
- **pnpm** (v9 atau lebih baru)
- **Python** (v3.10 atau lebih baru)
- **Docker Desktop** (wajib berjalan jika menggunakan Supabase lokal)
- **Supabase CLI**

### 2. Konfigurasi Environment Variables (.env)
Karena arsitektur *monorepo*, file `.env` dipecah sesuai batasan sistem operasi kerjanya:
- **`apps/web/.env`**: Wajib ada karena aturan mutlak dari **Next.js**. Framework ini mengharuskan file env berada di root foldernya (`apps/web`) agar variabel `NEXT_PUBLIC_*` dapat disuntikkan saat *build/run* ke sisi *client-side*.
- **`/.env` (Root)**: Digunakan oleh **Backend Python**. Kami mengaturnya agar Python menarik data dari root monorepo.
*(Isi kedua file tersebut harus sama persis).*

**Contoh Format `.env`**:
```env
# Supabase Local Settings
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbG...
SUPABASE_SERVICE_ROLE_KEY=eyJhbG...

# Gemini API Key (Dari Google AI Studio)
GEMINI_API_KEY=AIzaSy...

# Pengiriman email OTP (Dari dashboard Resend)
RESEND_API_KEY=re_...

# Backend API URL (Ubah ke https://api.caterwise.web.id saat production)
# Wajib diawali http:// atau https://
NEXT_PUBLIC_API_URL=http://localhost:8000

# Alamat publik aplikasi web, dipakai sebagai tautan di dalam pesan pengingat
SITE_URL=https://caterwise.web.id

# WhatsApp gateway untuk pengingat harian (Dari dashboard Fonnte)
FONNTE_TOKEN=...

# Kunci rahasia bebas, harus sama dengan yang ditulis pada jadwal pg_cron
REMINDER_SECRET=...
```

### 3. Install Dependensi Node (Frontend)
Jalankan perintah ini di root *folder* proyek:
```bash
pnpm install
```

### 4. Install Dependensi Python (Backend)
Buka terminal baru, masuk ke folder `apps/api/` dan buat *virtual environment*:
```bash
cd apps/api
python -m venv .venv

# Aktivasi venv (Windows):
source .venv/Scripts/activate
# Aktivasi venv (Mac/Linux):
source .venv/bin/activate

# Install requirements
pip install -r requirements.txt
```

### 5. Menjalankan Database Lokal (Supabase)
Pastikan aplikasi Docker sudah berjalan, kemudian eksekusi di root proyek:
```bash
npx supabase start
```
*Perintah ini akan mendownload image Supabase, menjalankannya, dan secara otomatis mengeksekusi skema database.*
Setelah selesai, terminal akan menampilkan **API URL** dan **anon key** untuk disalin ke file `.env`.

### 6. Menjalankan Aplikasi Web & AI (2 Terminal)

Aplikasi membutuhkan dua terminal agar *frontend* dan *backend* saling berkomunikasi.

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
