# Struktur Folder dan Arsitektur Proyek CaterWise

Dokumen ini menjelaskan struktur direktori (monorepo) dari proyek **CaterWise**, beserta panduan penempatan file, fitur, dan halaman. Tujuannya adalah untuk menjaga proyek tetap rapi, terstruktur, serta menghindari duplikasi kode atau penempatan logika yang salah.

Proyek ini menggunakan **pnpm workspaces** yang membagi aplikasi menjadi `apps/` dan konfigurasi database di `supabase/`.

---

## 1. Top-Level Directory (Monorepo Root)

```text
CaterWise/
│
├── apps/                 # Berisi aplikasi utama (Frontend, Backend, Service ML)
│   ├── web/              # Aplikasi utama Next.js (App Router, Tailwind v4, Supabase SSR)
│   └── ml-service/       # (Opsional/Mendatang) Service Python FastAPI/Flask untuk XGBoost
│
├── packages/             # (Opsional) Shared libraries jika di masa depan ada pemisahan UI/utils
│
├── supabase/             # Konfigurasi, schema SQL, dan migrasi untuk Supabase
│   └── migrations/       # File SQL schema (contoh: 20260823000000_initial_schema.sql)
│
├── docs/                 # (atau document_p/) Berisi dokumentasi PRD, Tech Stack, dan arsitektur
│
├── package.json          # Root package.json untuk pnpm workspace
├── pnpm-workspace.yaml   # Definisi workspace
└── README.md             # Dokumentasi utama cara menjalankan proyek
```

---

## 2. Struktur `apps/web/` (Next.js App Router)

Sebagai tulang punggung aplikasi (Frontend + API Routes), struktur folder di Next.js (`apps/web/src`) sangat penting agar fitur terisolasi dengan baik.

```text
apps/web/
├── public/                 # Aset statis seperti logo, favicon, gambar simulasi, dll.
└── src/
    ├── app/                # Next.js App Router (Routing Pages & API)
    ├── components/         # Reusable React components (UI elements)
    ├── lib/                # Shared utilities, helper functions, formatters
    ├── utils/              # Konfigurasi spesifik (misal: client Supabase SSR)
    ├── hooks/              # Custom React hooks
    ├── types/              # Deklarasi TypeScript interfaces & types
    └── middleware.ts       # Next.js middleware (Auth validation & session refresh)
```

### 2.1. Penempatan Halaman (Routing di `src/app/`)

CaterWise memiliki dua bagian utama: **Auth/Onboarding** dan **Dashboard (Core App)**. Kita menggunakan Route Groups `(folder_name)` agar URL tetap bersih namun struktur rapi.

```text
src/app/
│
├── (auth)/                 # Route Group untuk Autentikasi (tanpa layout dashboard)
│   ├── login/page.tsx      # Sign In
│   ├── signup/page.tsx     # Sign Up & OTP Verification
│   └── forgot-password/    # Forgot password flow
│
├── (dashboard)/            # Route Group untuk Core App (menggunakan layout sidebar/navbar)
│   ├── layout.tsx          # Dashboard shell (Sidebar navigasi, Header)
│   │
│   ├── page.tsx            # (/) Dashboard Utama (Today's Recommendation, Stock Monitor)
│   │
│   ├── surplus/            # Distribusi Surplus
│   │   └── page.tsx        # Deteksi potensi surplus, konfirmasi aktual, dan status distribusi
│   │
│   ├── history/            # Riwayat Penjualan (Input)
│   │   └── page.tsx        # Form manual daily input dan Document-based upload (XLSX/CSV)
│   │
│   ├── menu/               # Update Menu
│   │   └── page.tsx        # CRUD Menu (Tambah, Edit harga/HPP, Deactivate)
│   │
│   ├── simulation/         # Simulasi Penjualan
│   │   └── page.tsx        # UI Simulasi (Pemilihan stock, visualisasi animasi penjualan, kalkulasi)
│   │
│   ├── profile/            # Profile & Setup
│   │   ├── page.tsx        # Profil user, info langganan
│   │   └── setup/          # Restaurant Setup (Lokasi, Hari operasional)
│
├── api/                    # API Routes (Backend Next.js)
│   ├── forecast/route.ts   # Orkestrasi WMA / XGBoost (pemilihan model & evaluasi MAE/MAPE)
│   ├── extract/route.ts    # File parsing (Ekstraksi data penjualan dari dokumen unggahan)
│   └── ai/route.ts         # Integrasi API Gemini (AI Summary, penjelasan simulasi)
│
├── layout.tsx              # Root HTML Layout
└── page.tsx                # Landing Page (Welcome screen)
```

---

## 3. Panduan Penempatan Kode & Komponen

Untuk menghindari duplikasi dan membuat _codebase_ mudah di-_maintain_, patuhi aturan penempatan berikut:

### 🌟 Komponen UI (`src/components/`)
- **Penempatan:** Semua komponen yang digunakan berulang (seperti Button, Card, Modal, Input, Table, Sidebar).
- **Aturan:** Jangan memasukkan logika bisnis (fetching data / database calls) di dalam komponen UI generik. Komponen harus berupa _dumb components_ yang menerima _props_.
- **Folder Spesifik:** Buat sub-folder per fitur jika kompleks, misalnya `src/components/surplus/SurplusCard.tsx` atau `src/components/ui/Button.tsx`.

### 🌟 Logika Bisnis & Backend (`src/app/api/`)
- **Penempatan:** Algoritma kalkulasi (WMA), integrasi API eksternal (Gemini, cuaca), ekstraksi file (XLSX/CSV), dan proses ML.
- **Aturan:** Next.js Route Handlers (`route.ts`) bertanggung jawab atas _business logic_ berat.
- **Catatan:** Jangan panggil Supabase admin key atau API eksternal sensitif langsung dari Client Components. Lakukan di API routes atau Server Components.

### 🌟 Server vs Client Components (`src/app/`)
- **Server Components (Default):** Digunakan untuk `page.tsx` yang melakukan fetch data langsung dari Supabase. (Misalnya: Dashboard overview yang menarik data `daily_sales` dan `forecasts`).
- **Client Components (`"use client"`):** Hanya digunakan pada komponen interaktif seperti Chart simulasi penjualan, animasi progress bar, Form input yang menggunakan `useState`/`useEffect`.
- **Aturan:** Letakkan logika fetch Supabase sedekat mungkin dengan halaman di Server Component (tanpa API route internal) jika tidak memerlukan kalkulasi berat, untuk menghemat overhead _network_.

### 🌟 Utilitas & Supabase (`src/utils/` & `src/lib/`)
- `src/utils/supabase/server.ts` & `client.ts`: Hanya untuk inisialisasi instance klien Supabase.
- `src/lib/wma.ts`: Boleh diletakkan di sini jika fungsi _Weighted Moving Average_ digunakan berulang tanpa perlu menjadi API tersendiri.
- `src/lib/formatter.ts`: Fungsi format Rupiah (`Rp15.000`), format tanggal, dll.

---

## 4. Alur Integrasi XGBoost (ML Service)

Sesuai dengan **Tech Stack**, Python bukan backend utama aplikasi ini. Jika fitur Pro (_XGBoost_) diimplementasikan:

1. Buat folder baru `apps/ml-service/` (berisi FastAPI atau Flask app).
2. `ml-service` akan mengekspos endpoint (misal: `/predict` dan `/train`).
3. Next.js (`apps/web/src/app/api/forecast/route.ts`) akan membaca _historical data_ dari Supabase, mengirimkannya ke `ml-service`, lalu menerima hasilnya.
4. Next.js membandingkan MAE/MAPE antara XGBoost dan WMA, dan menyimpan (write) model pemenang ke tabel `forecasts` di Supabase.

Pendekatan ini menjamin Next.js tetap menjadi **Data Orchestrator** yang mengurus isolasi tenant, dan `ml-service` sepenuhnya _stateless_ (hanya menghitung angka/model).
