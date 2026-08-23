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

## Sprint 1 Achievements
✅ **Project dapat dijalankan**: Struktur Monorepo Next.js sudah siap.
✅ **Database tersedia**: Integrasi Supabase siap digunakan.
✅ **Schema utama dibuat**: Tersedia di `supabase/migrations/20260823000000_initial_schema.sql`.
✅ **RLS aktif**: Supabase Row-Level Security diaktifkan pada semua tabel.
✅ **Data antar restoran terisolasi**: Setiap query secara otomatis divalidasi dengan otentikasi user dan ID restoran.

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
