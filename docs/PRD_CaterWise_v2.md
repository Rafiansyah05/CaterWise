# CaterWise — Product Requirements Document (PRD)

**Competition:** ANFORCOM 2026 — DSDC  
**Theme:** Engineering the Circular City: Software Solutions for a Sustainable and Healthy Urban Future  
**Primary Subtheme:** Green Supply Chain & Sustainable Consumption Platforms  
**Study Case:** Surabaya, Indonesia  
**Primary Target:** Rumah makan prasmanan / buffet-style eateries  
**Version:** 2.0  
**Date:** 23 August 2026

---

## 1. Executive Summary

CaterWise adalah platform web-based decision-support untuk membantu rumah makan prasmanan menentukan jumlah produksi makanan berdasarkan pola permintaan historis.

Masalah utama yang ingin diselesaikan adalah **overproduction**: makanan diproduksi sebelum jumlah permintaan aktual diketahui. Ketika produksi terlalu tinggi dibanding permintaan, sebagian makanan dapat menjadi surplus dan berpotensi menjadi food waste.

CaterWise melakukan intervensi sebelum waste terjadi:

**Riwayat penjualan → Forecast demand → Rekomendasi produksi → Penjualan aktual → Pencatatan surplus → Evaluasi → Forecast berikutnya**

CaterWise tidak menggantikan keputusan pemilik rumah makan. Sistem menyediakan data, prediksi, simulasi, dan insight agar keputusan produksi menjadi lebih terukur.

Platform memiliki dua tingkat penggunaan:

- **Free:** forecasting berbasis Weighted Moving Average (WMA).
- **Pro:** forecasting adaptif dengan evaluasi WMA dan XGBoost, simulasi penjualan, analitik lanjutan, serta AI insight.

Gemini digunakan sebagai **conversational/explanation layer**, bukan sebagai mesin forecasting utama.

---

# 2. Problem Statement

## 2.1 Masalah Utama

Rumah makan prasmanan harus menentukan jumlah makanan yang diproduksi sebelum mengetahui permintaan aktual.

Dua risiko utama:

### Underproduction
Produksi terlalu sedikit sehingga:
- menu cepat habis,
- pelanggan tidak mendapatkan menu yang diinginkan,
- potensi penjualan hilang.

### Overproduction
Produksi terlalu banyak sehingga:
- makanan tersisa,
- biaya produksi tidak sepenuhnya kembali,
- surplus meningkat,
- makanan berpotensi menjadi food waste.

CaterWise berfokus pada pengurangan **avoidable surplus akibat keputusan produksi yang tidak sesuai dengan pola permintaan**.

## 2.2 Mengapa Prasmanan?

Target awal sengaja tidak mencakup seluruh jenis restoran.

Rumah makan prasmanan dipilih karena:
- makanan umumnya diproduksi dalam batch,
- menu disiapkan sebelum seluruh permintaan diketahui,
- jumlah produksi merupakan keputusan operasional penting,
- surplus dapat diamati pada akhir hari,
- histori penjualan per menu dapat digunakan untuk forecasting.

---

# 3. Product Vision

> **Membantu rumah makan menghasilkan makanan yang lebih dekat dengan kebutuhan pelanggan, sehingga produksi berlebih dan potensi food waste dapat dikurangi.**

---

# 4. Product Mission

CaterWise mengubah data penjualan sederhana menjadi keputusan operasional:

**Record → Analyze → Forecast → Decide → Learn**

Sistem belajar dari data historis melalui proses evaluasi dan retraining berkala, bukan melalui klaim bahwa AI belajar setiap transaksi secara real-time.

---

# 5. Product Goals

1. Membantu pemilik mengetahui estimasi permintaan per menu.
2. Memberikan rekomendasi jumlah produksi.
3. Mengurangi produksi berlebih.
4. Mencatat penjualan aktual dengan input seminimal mungkin.
5. Menghitung surplus secara otomatis.
6. Mengidentifikasi menu dengan risiko surplus tinggi.
7. Menyediakan simulasi keputusan produksi.
8. Menyediakan insight yang mudah dipahami.
9. Memfasilitasi proses redistribusi surplus.
10. Mengevaluasi performa forecasting secara terukur.

---

# 6. Non-Goals

MVP tidak bertujuan untuk:
- menjadi POS lengkap,
- mencatat setiap transaksi pelanggan,
- menggantikan sistem kasir,
- mengelola akuntansi penuh,
- mengelola procurement,
- menjamin zero food waste,
- menjamin persentase pengurangan waste tertentu,
- menjadikan Gemini sebagai forecasting engine,
- menganggap XGBoost selalu lebih baik dari WMA,
- otomatis membuat menu baru dari dokumen,
- otomatis mengirim makanan ke mitra tanpa konfirmasi,
- mengeksekusi distribusi surplus tanpa validasi pengguna/mitra.

---

# 7. Target Users

## Primary User

Pemilik atau pengelola rumah makan prasmanan.

Kebutuhan utama:
- mengetahui berapa banyak makanan yang sebaiknya diproduksi,
- memantau penjualan,
- mengetahui surplus,
- memahami performa menu,
- mengurangi kerugian.

## Secondary User

Staf yang bertanggung jawab atas pencatatan harian.

---

# 8. Application Information Architecture

```text
Dashboard
│
├── Distribusi Surplus
├── Riwayat Penjualan
├── Update Menu
├── Simulasi Penjualan
└── Profile
```

Onboarding:

```text
Sign Up
Sign In
OTP Verification
Forgot Password
Restaurant Setup
Menu Setup
Historical Sales Setup
```

---

# 9. Core Product Loop

```text
                 HISTORICAL SALES
                        │
                        ▼
                 FORECAST ENGINE
                        │
              ┌─────────┴─────────┐
              ▼                   ▼
             WMA               XGBoost
              │                   │
              └─────────┬─────────┘
                        ▼
                  MAE / MAPE
                        │
                        ▼
                  MODEL SELECTION
                        │
                        ▼
                DEMAND FORECAST
                        │
                        ▼
             PRODUCTION RECOMMENDATION
                        │
                        ▼
                    PRODUCTION
                        │
                        ▼
                     SALES
                        │
                        ▼
                 DAILY INPUT
                        │
                        ▼
                   SURPLUS
                        │
               ┌────────┴────────┐
               ▼                 ▼
          Analytics        Redistribution
               │
               ▼
          Next Forecast
```

---

# 10. Authentication & Onboarding

## 10.1 Sign Up
Fields:
- name,
- email,
- password.

## 10.2 Sign In
Fields:
- email,
- password.

## 10.3 OTP Verification
Digunakan untuk verifikasi account/email.

## 10.4 Forgot Password

**Email → Verification → New Password → Login**

Authentication dapat menggunakan Supabase Auth.

---

# 11. Restaurant Setup

User memasukkan:
- nama rumah makan,
- lokasi rumah makan,
- hari operasional.

Lokasi digunakan sebagai konteks weather dan analitik.

---

# 12. Menu Setup

User memasukkan seluruh menu yang dijual.

Setiap menu memiliki:
- nama menu,
- harga jual,
- HPP,
- status aktif/nonaktif.

Contoh:

| Menu | Harga Jual | HPP |
|---|---:|---:|
| Ayam Goreng | Rp15.000 | Rp9.000 |
| Ikan Goreng | Rp12.000 | Rp7.000 |
| Telur Balado | Rp8.000 | Rp4.000 |

HPP digunakan untuk simulasi keuntungan/kerugian dan estimasi nilai surplus.

---

# 13. Historical Sales Setup

CaterWise merekomendasikan sekitar **1 bulan histori penjualan** agar forecasting lebih bermakna. Pengguna yang memiliki lebih sedikit data tetap dapat menggunakan sistem dengan keterbatasan yang sesuai.

## Method A — Manual

User memasukkan:

| Tanggal | Menu | Terjual |
|---|---|---:|
| 01-08-2026 | Ayam Goreng | 45 |
| 01-08-2026 | Ikan Goreng | 30 |
| 01-08-2026 | Telur Balado | 35 |

## Method B — Document Upload

Format:
- XLSX,
- CSV,
- PDF,
- DOCX,

selama data dapat dibaca.

Flow:

**Upload → Extraction → Parsing → Menu Matching → Validation → Preview → Confirmation → Save**

---

# 14. Document Import Rules

Master menu adalah **source of truth**.

Jika menu terdaftar:

```text
Ayam Goreng
Ikan Goreng
Telur Balado
```

dan dokumen berisi:

```text
Ayam Goreng
Ikan Goreng
Ayam Crispy
```

sistem **tidak boleh otomatis membuat menu baru**.

Sistem menampilkan:

```text
Data Tidak Cocok

Ayam Crispy
Tidak ditemukan dalam daftar menu.

[Perbaiki]
[Mapping Manual]
[Abaikan]
```

Jika ditemukan kandidat yang mirip, sistem boleh memberi saran mapping, tetapi user harus mengonfirmasi.

---

# 15. DASHBOARD

Dashboard adalah pusat analitik CaterWise.

Prinsip:

> **Dashboard harus menjawab "Apa yang harus saya lakukan hari ini?" sebelum menampilkan analitik yang lebih dalam.**

## 15.1 Today's Recommendation

| Menu | Forecast | Recommended Production | Risk |
|---|---:|---:|---|
| Ayam Goreng | 52 | 54 | Low |
| Ikan Goreng | 28 | 29 | Low |
| Telur Balado | 35 | 36 | Medium |

## 15.2 Stock & Demand Monitor

Menampilkan:
- production/stock,
- forecast demand,
- estimated remaining,
- potential shortage,
- potential surplus.

Contoh:

```text
AYAM GORENG

Production       60
Forecast Demand  52
Estimated Surplus 8 porsi
```

Istilah stock pada dashboard berarti makanan yang tersedia dalam operasional hari tersebut, bukan inventory bahan baku.

## 15.3 Daily Performance

Menampilkan:
- total production,
- total sold,
- total surplus,
- sell-through rate.

Formula:

**Sell-through Rate = Total Sold / Total Produced × 100%**

## 15.4 Menu Performance

Menampilkan:
- best performing menu,
- highest surplus risk,
- demand trend.

## 15.5 AI Summary

Gemini merangkum data yang sudah dihitung backend.

Contoh:

> "Penjualan hari ini mencapai 84,7% dari total produksi. Risiko surplus terbesar berasal dari Telur Balado. Berdasarkan histori terbaru, jumlah produksi menu tersebut dapat dievaluasi kembali pada operasional berikutnya."

Gemini tidak boleh membuat angka sendiri.

## 15.6 Forecast Performance

Menampilkan:
- active model,
- MAE,
- MAPE,
- evaluation period.

---

# 16. DISTRIBUSI SURPLUS

Tujuan:

> Membantu pengguna mengelola surplus yang masih layak konsumsi dan memfasilitasi proses redistribusi kepada mitra food rescue.

## 16.1 Surplus Detection

Sistem membedakan:

- **Predicted Surplus**
- **Actual Surplus**

Contoh:

```text
POTENSI SURPLUS

Ayam Goreng     5 porsi
Telur Balado    8 porsi
```

## 16.2 Surplus Confirmation

User mengonfirmasi jumlah aktual:

```text
Telur Balado

Estimated: 8
Actual available: [8]

[Konfirmasi Surplus]
```

CaterWise tidak menyatakan makanan aman/layak konsumsi hanya berdasarkan algoritma. Operator dan/atau mitra mengikuti aturan kelayakan yang berlaku.

## 16.3 Food Rescue Integration

CaterWise dirancang **integration-ready** dengan ekosistem food rescue seperti Garda Pangan.

Jika belum tersedia kerja sama/API resmi, jangan mengklaim integrasi resmi.

MVP:

**Surplus Confirmation → Distribution Request → Partner Workflow → Partner Confirmation → Distribution Status**

## 16.4 Distribution Status

```text
Draft
↓
Ready to Distribute
↓
Submitted to Partner
↓
Accepted
↓
In Distribution
↓
Completed
```

---

# 17. RIWAYAT PENJUALAN

Halaman untuk memasukkan data penjualan terbaru yang menjadi input forecasting berikutnya.

## 17.1 Manual Daily Input

| Menu | Terjual |
|---|---:|
| Ayam Goreng | [52] |
| Ikan Goreng | [28] |
| Telur Balado | [35] |

## 17.2 Production & Surplus

Jika production quantity tersedia:

**Surplus = Production - Sold**

Jika `Sold > Production`, sistem menampilkan peringatan untuk memeriksa data atau mencatat adanya produksi tambahan.

## 17.3 Document-Based Daily Input

Flow:

**Upload → Extract → Match Menu → Validate → Preview → Confirm → Save**

Validasi mencakup:
- data berhasil dibaca,
- data tidak lengkap,
- menu tidak cocok,
- tanggal tidak ditemukan,
- nilai invalid.

---

# 18. UPDATE MENU

User dapat:
- add menu,
- edit menu,
- update selling price,
- update HPP,
- deactivate menu,
- reactivate menu.

Menu yang sudah memiliki histori sebaiknya tidak dihapus permanen. Gunakan **Deactivate** agar histori tetap konsisten.

---

# 19. SIMULASI PENJUALAN

Simulasi membantu user memahami konsekuensi keputusan produksi sebelum keputusan dilakukan.

## 19.1 Input

User memilih:
- tanggal,
- jumlah stock/production setiap menu.

Contoh:

```text
Tanggal
25 Agustus 2026

Ayam Goreng
Stock: 60

Ikan Goreng
Stock: 40

Telur Balado
Stock: 35
```

## 19.2 Simulation Engine

Menggunakan:
- historical demand,
- selected date,
- day of week,
- holiday context,
- weather context,
- selected forecasting model.

## 19.3 Simulation Visualization

Animasi memvisualisasikan perkembangan penjualan sepanjang hari.

Contoh:

```text
09:00
Ayam Goreng
██████░░░░ 18 sold

12:00
Ayam Goreng
██████████████░░ 42 sold

17:00
Ayam Goreng
██████████████████░ 54 sold
```

Animasi adalah visualisasi simulasi, bukan transaksi nyata.

## 19.4 Simulation Result

Output:
- estimated sell-through,
- estimated sold,
- estimated remaining,
- projected revenue,
- production cost,
- projected profit/loss.

## 19.5 Financial Calculation

**Revenue = Estimated Sold × Selling Price**

**Production Cost = Produced Quantity × HPP**

**Profit/Loss = Revenue - Production Cost**

HPP dihitung terhadap quantity yang diproduksi karena biaya produksi tetap terjadi meskipun sebagian makanan tidak terjual.

## 19.6 AI Simulation Summary

Gemini menjelaskan hasil simulasi menggunakan angka dari simulation engine.

---

# 20. PROFILE

Menampilkan:
- nama user,
- email,
- nama rumah makan,
- lokasi,
- subscription status,
- logout.

Tidak perlu menjadi halaman pengaturan kompleks pada MVP.

---

# 21. FORECASTING ENGINE

Dua kandidat:
1. Weighted Moving Average (WMA)
2. XGBoost

Keduanya dibandingkan menggunakan historical data.

---

# 22. WMA

WMA adalah baseline forecasting.

Data terbaru mendapat bobot lebih besar.

Kelebihan:
- sederhana,
- cepat,
- transparan,
- ringan,
- cocok ketika data masih terbatas.

Kekurangan:
- tidak secara native mempelajari hubungan kompleks antara demand dan cuaca, hari libur, atau feature lain.

**Catatan:** WMA tetap menggunakan data historis. Free plan bukan berarti tanpa data; Free hanya menggunakan metode forecasting yang lebih sederhana.

---

# 23. XGBoost

XGBoost merupakan machine-learning candidate.

Potential features:

### Historical
- lag_1,
- lag_2,
- lag_7,
- rolling_mean_7,
- rolling_mean_14,
- recent trend.

### Calendar
- day_of_week,
- weekend,
- holiday,
- month/seasonal context.

### Weather
- rainfall,
- temperature,
- weather category.

---

# 24. Model Evaluation

CaterWise tidak menganggap XGBoost otomatis lebih baik.

## MAE

Mean Absolute Error menunjukkan rata-rata selisih absolut prediksi.

## MAPE

Mean Absolute Percentage Error menunjukkan rata-rata error relatif.

MAPE harus menangani actual demand = 0 atau demand sangat kecil dengan metode yang aman dan terdokumentasi.

---

# 25. Time-Series Validation

Evaluasi menggunakan time-aware/walk-forward validation.

Random train/test split tidak digunakan untuk evaluasi utama.

Konsep:

```text
Past
 ↓
Train
 ↓
Predict Future
 ↓
Compare Actual
 ↓
Expand Training Window
 ↓
Predict Next Future
```

---

# 26. Model Selection

Contoh:

| Model | MAE | MAPE |
|---|---:|---:|
| WMA | 5.8 | 10.4% |
| XGBoost | 4.1 | 7.8% |

XGBoost dapat dipilih.

Jika WMA lebih baik, WMA tetap dipilih.

Prinsip:

> **Model dipilih berdasarkan performa data, bukan karena lebih kompleks.**

---

# 27. Cold Start

Jika histori belum cukup:

```text
New Restaurant
      ↓
Limited History
      ↓
WMA / Baseline
      ↓
Collect Data
      ↓
Sufficient History
      ↓
Evaluate XGBoost
      ↓
Select Best Model
```

XGBoost tidak dipaksakan pada dataset kecil.

---

# 28. Personalized Model Learning

Setiap rumah makan memiliki pola berbeda.

Konsep:

```text
Restaurant A → Historical Data A → Forecast A
Restaurant B → Historical Data B → Forecast B
```

Untuk MVP, model dapat dilatih menggunakan data masing-masing rumah makan apabila data mencukupi.

Retraining dilakukan berkala, bukan setiap transaksi.

---

# 29. Weekly Model Update

```text
Weekly Schedule
      ↓
Collect Latest Data
      ↓
Feature Preparation
      ↓
Train XGBoost
      ↓
Evaluate WMA vs XGBoost
      ↓
MAE/MAPE
      ↓
Select Model
      ↓
Update Active Forecast
```

Jika training gagal, model valid sebelumnya tetap digunakan.

---

# 30. Production Recommendation

Forecast demand tidak sama dengan production recommendation.

Forecast:

> "Kemungkinan terjual 52 porsi."

Recommendation:

> "Produksi 54 porsi."

Konsep:

**Recommended Production = Forecast + Operational Buffer**

Besarnya buffer harus ditentukan melalui eksperimen dan karakteristik operasional, bukan angka arbitrer.

---

# 31. Gemini API

Gemini adalah AI assistant/explanation layer.

## Use Cases
- daily summary,
- forecast explanation,
- simulation summary,
- surplus summary,
- user questions,
- natural-language insights,
- bantuan document parsing jika diperlukan.

## Tidak digunakan untuk
- menghitung official forecast,
- menggantikan WMA,
- menggantikan XGBoost,
- menghasilkan angka finansial tanpa sumber,
- membuat menu baru,
- mengambil keputusan distribusi otomatis.

Flow:

```text
Database
   ↓
Backend Calculation
   ↓
Forecast / Analytics
   ↓
Trusted Structured Result
   ↓
Gemini
   ↓
Natural Language Explanation
```

---

# 32. External APIs / Services

## Core

### Gemini API
AI explanation dan insight.

### Weather API
Weather features.

## Optional

### Resend
- email verification,
- password reset,
- notification.

### Holiday/Calendar Data
- national holidays,
- calendar context.

Holiday data juga dapat disimpan sebagai dataset internal sehingga external calendar API tidak wajib.

---

# 33. Technology Stack

## Frontend
- Next.js
- React
- TypeScript
- Tailwind CSS

## Backend
- Next.js API Routes / Route Handlers
- Node.js
- TypeScript

**Backend utama tetap Next.js.**

## Database
- Supabase PostgreSQL

## Authentication
- Supabase Auth

## Machine Learning
- XGBoost
- Python hanya sebagai ML service jika XGBoost digunakan.

Python bukan backend utama.

## AI
- Gemini API

## Email
- Resend jika diperlukan.

---

# 34. System Architecture

```text
                           USER
                             │
                             ▼
                    NEXT.JS FRONTEND
                             │
                             ▼
                 NEXT.JS API ROUTES
                             │
          ┌──────────────────┼──────────────────┐
          │                  │                  │
          ▼                  ▼                  ▼
      SUPABASE          FORECASTING        EXTERNAL APIs
      POSTGRES             ENGINE               │
          │            ┌─────┴─────┐       ┌────┴────┐
          │            ▼           ▼       ▼         ▼
          │           WMA       XGBoost  Gemini    Weather
          │                        │
          │                      Python
          │
          ▼
 Historical Data
```

---

# 35. Database — Conceptual Schema

## profiles
- id
- name
- email
- created_at

## restaurants
- id
- owner_id
- name
- location
- operating_days
- created_at

## menus
- id
- restaurant_id
- name
- selling_price
- hpp
- active
- created_at

## daily_production
- id
- restaurant_id
- menu_id
- date
- recommended_quantity
- actual_quantity

## daily_sales
- id
- restaurant_id
- menu_id
- date
- sold_quantity
- surplus_quantity

## forecasts
- id
- restaurant_id
- menu_id
- target_date
- model_name
- predicted_quantity
- recommended_quantity
- created_at

## model_evaluations
- id
- restaurant_id
- model_name
- validation_period
- mae
- mape
- created_at

## model_metadata
- id
- restaurant_id
- model_name
- version
- trained_at
- status

## weather_records
- id
- location/context reference
- date
- temperature
- rainfall
- weather_category

## surplus_distributions
- id
- restaurant_id
- date
- status
- total_quantity
- partner_reference
- created_at

---

# 36. Security

## Authentication
Protected operations require authentication.

## Authorization
Users can only access their own restaurant's data.

## RLS
Supabase Row-Level Security must enforce tenant isolation.

## Input Validation
Validate:
- quantities,
- dates,
- menu ownership,
- restaurant ownership,
- prices,
- HPP,
- uploaded data.

## API Keys
Gemini, Weather, Resend, and other secret credentials remain server-side.

## AI Data Minimization
Only required structured data should be sent to Gemini.

---

# 37. Upload Security

Uploaded documents are untrusted input.

System should:
- validate file type,
- enforce size limits,
- reject unsupported files,
- sanitize extracted content,
- never execute uploaded content,
- validate parsed values,
- require user confirmation before committing imports.

---

# 38. Performance & Reliability

## Daily Input
Manual input should be lightweight.

## Forecast Serving
Use stored/precomputed forecast results where possible.

## Training
XGBoost training must not happen synchronously during dashboard requests.

## External API Failure

If Weather API fails:
- use cached/latest valid data when available,
- daily sales input remains usable.

If Gemini fails:
- numerical dashboard remains available.

If XGBoost training fails:
- previous valid model or WMA fallback remains available.

---

# 39. UX Principles

1. Minimal daily input.
2. No requirement to record every customer transaction.
3. Existing menus are selectable.
4. Prefill recommendations where useful.
5. Numbers first, explanation second.
6. AI explanations are optional.
7. Avoid excessive charts.
8. Avoid unnecessary forms.
9. Clearly distinguish forecast vs actual.
10. Clearly distinguish predicted surplus vs actual surplus.

---

# 40. Subscription Model

CaterWise menggunakan freemium subscription.

## FREE — Rp0/month

Includes:
- basic Dashboard,
- menu management,
- manual sales input,
- sales history,
- WMA forecasting,
- basic analytics.

Limitations:
- no advanced simulation,
- no XGBoost,
- no model comparison,
- limited AI insights,
- limited advanced surplus analytics.

**Important:** WMA tetap menggunakan historical data. Free plan menggunakan metode historis yang lebih sederhana, bukan sistem yang tidak menggunakan data.

## PRO — Recommended Initial Price: Rp29.000/month

Includes:
- all Free features,
- XGBoost evaluation,
- WMA vs XGBoost comparison,
- model selection,
- adaptive forecasting,
- advanced MAE/MAPE analytics,
- simulation,
- advanced AI insights,
- historical document import,
- advanced surplus analytics,
- improved distribution workflow.

Rp29.000/month adalah hipotesis harga awal dan perlu divalidasi dengan target user sebelum dianggap sebagai harga final.

---

# 41. Subscription Comparison

| Feature | Free | Pro |
|---|---|---|
| Dashboard | ✓ | ✓ |
| Menu Management | ✓ | ✓ |
| Manual Sales Input | ✓ | ✓ |
| Sales History | ✓ | ✓ |
| WMA Forecast | ✓ | ✓ |
| XGBoost | — | ✓ |
| Model Comparison | — | ✓ |
| MAE/MAPE | Basic | Advanced |
| AI Summary | Limited | ✓ |
| Simulation | — | ✓ |
| Historical Document Import | Limited | ✓ |
| Advanced Surplus Analytics | — | ✓ |
| Distribution Workflow | Basic | Advanced |

---

# 42. Impact Measurement

Primary indicators:

## Surplus Rate

**Surplus Rate = Surplus / Production × 100%**

## Sell-through Rate

**Sell-through = Sold / Production × 100%**

## Forecast MAE

Average absolute forecasting error.

## Forecast MAPE

Average percentage forecasting error.

## Potential Avoided Surplus

Bandingkan baseline production strategy dengan CaterWise recommendation.

Impact harus disebut **potential** jika belum divalidasi melalui real-world deployment.

---

# 43. Impact Projection

Untuk proposal:

```text
Baseline
   ↓
Historical production/sales
   ↓
Calculate surplus
   ↓
CaterWise simulation
   ↓
Recommended production
   ↓
Estimate difference
```

Contoh ilustratif:

```text
Baseline surplus: 25 portions/day
Simulated surplus: 18 portions/day
Potential reduction: 7 portions/day
```

Contoh tersebut bukan hasil penelitian nyata dan tidak boleh diklaim sebagai measured impact.

---

# 44. Research & Validation

## Secondary Research

Gunakan:
- public food waste data,
- local Surabaya evidence,
- food-service evidence,
- scientific forecasting literature.

## Primary Research

Wawancara pemilik rumah makan berguna untuk validasi kebutuhan, tetapi tidak wajib dilakukan pada fase awal jika akses/waktu terbatas.

Tim tidak boleh mengklaim melakukan interview jika tidak dilakukan.

## Data Transparency

Proposal harus membedakan:
- public data,
- secondary research,
- observed data,
- synthetic data,
- actual restaurant data.

Synthetic data tidak boleh dipresentasikan sebagai transaksi restoran nyata.

---

# 45. Competition Demo Flow

```text
1. Login
      ↓
2. Dashboard
      ↓
3. Show forecast
      ↓
4. Show recommended production
      ↓
5. Input today's sales
      ↓
6. Show surplus
      ↓
7. Open Distribution
      ↓
8. Simulate another production scenario
      ↓
9. Show projected profit/loss
      ↓
10. Show WMA vs XGBoost evaluation
      ↓
11. Show AI explanation
```

Fokus demo adalah menunjukkan satu closed-loop story, bukan menunjukkan semua halaman secara cepat.

---

# 46. Feature Priority

## P0 — Must Have

- Authentication
- Restaurant setup
- Menu setup
- Manual historical sales input
- Daily sales input
- Dashboard
- WMA forecasting
- Forecast display
- Production recommendation
- Surplus calculation
- Basic analytics
- Supabase/RLS

## P1 — High Value

- XGBoost
- MAE/MAPE comparison
- Weather integration
- Historical document import
- Gemini summary
- Simulation
- Surplus distribution workflow

## P2 — Future

- Official Garda Pangan API integration if available
- automated email notifications
- POS integration
- supplier management
- multi-branch forecasting
- automated redistribution matching
- advanced optimization
- anomaly detection
- model monitoring

---

# 47. Risks & Mitigations

## Insufficient Historical Data
**Mitigation:** WMA baseline and cold-start mode.

## XGBoost Overfitting
**Mitigation:** time-series validation and controlled features.

## Bad Input Data
**Mitigation:** validation, import preview, menu matching, user confirmation.

## AI Hallucination
**Mitigation:** Gemini receives trusted structured results; backend remains numerical source of truth.

## External API Failure
**Mitigation:** caching and fallbacks.

## Training Failure
**Mitigation:** retain previous valid model.

## Food Safety
**Mitigation:** CaterWise does not certify food safety; operator/partner follows applicable rules.

## False Integration Claim
**Mitigation:** describe Garda Pangan as integration-ready until an official integration exists.

---

# 48. Roadmap

## Phase 1 — Competition MVP
- Dashboard
- Menu Management
- Sales Input
- WMA
- XGBoost prototype
- MAE/MAPE
- Simulation
- Gemini insight
- Surplus workflow

## Phase 2 — Pilot
- Real restaurant testing
- real sales data
- forecast validation
- usability validation
- pricing validation

## Phase 3 — Operational Product
- POS integration
- automated data ingestion
- real food rescue integration
- notifications
- multi-restaurant support
- model monitoring

---

# 49. Success Criteria

MVP berhasil jika:

1. User dapat membuat akun.
2. User dapat memasukkan data rumah makan.
3. User dapat mendaftarkan menu, harga jual, dan HPP.
4. User dapat memasukkan histori penjualan.
5. User dapat meng-upload dokumen histori.
6. Sistem memvalidasi nama menu terhadap master menu.
7. User dapat memasukkan penjualan harian dengan cepat.
8. Sistem menghitung surplus.
9. Dashboard menampilkan forecast dan recommendation.
10. WMA menghasilkan baseline forecast.
11. XGBoost dapat dievaluasi jika data mencukupi.
12. MAE/MAPE dihitung.
13. WMA dan XGBoost dibandingkan dengan time-aware validation.
14. Sistem memilih model berdasarkan performa.
15. User dapat menjalankan simulasi.
16. Simulasi menghasilkan estimasi penjualan, surplus, dan profit/loss.
17. Gemini dapat menjelaskan hasil sistem.
18. User dapat menjalankan workflow distribusi surplus.
19. Data restoran terisolasi melalui authentication/RLS.
20. Core application tetap berjalan ketika external API opsional gagal.

---

# 50. Product Principles

### 1. Data Before AI
Gunakan historical data sebagai dasar.

### 2. Simple Before Complex
WMA tetap valid.

### 3. Evaluate Before Selecting
XGBoost hanya dipilih jika data menunjukkan manfaat.

### 4. AI Explains, Models Calculate
Gemini bukan forecasting engine.

### 5. Human in the Loop
Produksi dan redistribusi tetap dikonfirmasi user.

### 6. Prevent Before Redistribute
Intervensi utama adalah mencegah produksi berlebih. Distribusi adalah lapisan kedua untuk surplus yang masih ada.

### 7. Transparent Impact
Jangan mengklaim impact yang belum diukur.

---

# 51. Final Product Definition

> **CaterWise adalah platform decision-support berbasis data untuk rumah makan prasmanan yang menganalisis histori penjualan, memprediksi permintaan per menu, merekomendasikan jumlah produksi, mensimulasikan skenario operasional, serta memfasilitasi proses redistribusi surplus makanan.**

Nilai utama CaterWise:

```text
UNDERSTAND
    ↓
PREDICT
    ↓
DECIDE
    ↓
MEASURE
    ↓
REDUCE SURPLUS
    ↓
REDISTRIBUTE REMAINING SURPLUS
```

Tujuan akhirnya bukan sekadar "memprediksi makanan", tetapi:

dan disini kami menggunakna konsep monorepo

> **membantu rumah makan membuat keputusan produksi yang lebih tepat sebelum makanan yang tidak diperlukan menjadi waste.**
