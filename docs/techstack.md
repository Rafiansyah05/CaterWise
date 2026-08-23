# techstack.md

# CaterWise — Technology Stack

## 1. Product Architecture

CaterWise adalah **web-based decision-support platform** untuk membantu rumah makan prasmanan menentukan jumlah produksi berdasarkan pola permintaan historis.

Arsitektur teknologi CaterWise dirancang untuk mendukung siklus:

```text
Historical Sales
      ↓
Forecast Engine
      ↓
Demand Forecast
      ↓
Production Recommendation
      ↓
Production
      ↓
Actual Sales
      ↓
Surplus
      ↓
Analytics / Redistribution
      ↓
Next Forecast
```

CaterWise menggunakan pendekatan **Data Before AI**:

> Historical data menjadi sumber utama perhitungan. AI digunakan untuk membantu menjelaskan hasil, bukan menggantikan numerical calculation atau forecasting engine.

---

# 2. Frontend

### Next.js

Framework utama untuk membangun aplikasi web CaterWise.

Digunakan untuk:

- Application routing
- Server-side capabilities
- API integration
- Dashboard
- Authentication flow
- Menu management
- Sales input
- Forecast display
- Production recommendation
- Simulation
- Surplus workflow

### React

Digunakan untuk membangun komponen dan interactive user interface.

### TypeScript

Digunakan sebagai bahasa utama frontend dan backend application layer untuk:

- Type safety
- API contract
- Data validation
- Maintainability
- Safer refactoring

### Tailwind CSS

Digunakan untuk styling dan responsive interface.

---

# 3. Backend

## Next.js API Routes / Route Handlers

Backend utama CaterWise tetap menggunakan Next.js.

Digunakan untuk:

- Business logic
- Forecast orchestration
- Production recommendation
- Sales processing
- Surplus calculation
- Simulation calculation
- Analytics
- Communication dengan Supabase
- Communication dengan ML service
- Communication dengan external APIs
- Gemini integration

## Node.js

Runtime untuk menjalankan backend application layer berbasis Next.js.

> Python bukan backend utama CaterWise.

Python hanya digunakan jika diperlukan sebagai **machine-learning service untuk XGBoost**.

---

# 4. Database

## Supabase PostgreSQL

Supabase PostgreSQL digunakan sebagai database utama CaterWise.

Data yang disimpan antara lain:

- User profile
- Restaurant
- Menu
- Historical sales
- Daily sales
- Production
- Forecast
- Model evaluation
- Model metadata
- Weather records
- Surplus
- Surplus distribution

Conceptual entities:

```text
profiles
restaurants
menus
daily_production
daily_sales
forecasts
model_evaluations
model_metadata
weather_records
surplus_distributions
```

---

# 5. Authentication

## Supabase Auth

Digunakan untuk:

- Sign Up
- Sign In
- OTP verification
- Forgot password
- Session management

Authentication menjadi dasar authorization terhadap data restoran.

---

# 6. Authorization & Data Isolation

## Supabase Row-Level Security (RLS)

RLS digunakan untuk memastikan user hanya dapat mengakses data restoran yang berhak mereka akses.

Prinsip:

```text
User
  ↓
Authentication
  ↓
Authorization
  ↓
Restaurant Ownership
  ↓
RLS
  ↓
Restaurant Data
```

Tenant isolation merupakan bagian penting dari security architecture CaterWise.

---

# 7. Forecasting Engine

Forecasting CaterWise memiliki **dua kandidat model**:

```text
Historical Data
       │
       ▼
 Forecast Engine
       │
   ┌───┴────┐
   ▼        ▼
  WMA     XGBoost
   │        │
   └───┬────┘
       ▼
   MAE / MAPE
       ↓
 Model Selection
       ↓
 Active Forecast
```

Model tidak dipilih berdasarkan kompleksitas.

Prinsipnya:

> **Model dipilih berdasarkan performa pada data.**

---

# 8. Weighted Moving Average (WMA)

## Role

WMA digunakan sebagai:

- Forecasting method pada Free plan.
- Baseline forecasting model.
- Fallback ketika model machine learning tidak tersedia atau gagal.
- Pembanding terhadap XGBoost.

Data terbaru mendapatkan bobot lebih besar dibanding data yang lebih lama.

## Kelebihan

- Sederhana
- Cepat
- Transparan
- Ringan
- Cocok untuk data yang masih terbatas

## Keterbatasan

WMA tidak secara native mempelajari hubungan kompleks antara demand dengan:

- Cuaca
- Hari dalam minggu
- Hari libur
- Trend
- Lag features
- Feature historis lainnya

---

# 9. XGBoost

## Role

XGBoost merupakan **machine-learning candidate** untuk forecasting pada Pro plan.

XGBoost tidak dianggap otomatis lebih baik daripada WMA.

Model hanya dipilih jika hasil evaluasi menunjukkan performa yang lebih baik atau lebih sesuai berdasarkan metrik yang digunakan.

## Implementation

Jika XGBoost digunakan, model dijalankan menggunakan:

**Python**

Python berfungsi sebagai ML service, bukan backend utama aplikasi.

Arsitektur:

```text
Next.js Backend
      ↓
ML Service
      ↓
Python + XGBoost
      ↓
Forecast Result
      ↓
Next.js Backend
```

---

# 10. XGBoost Features

Potential features yang digunakan:

## Historical Features

```text
lag_1
lag_2
lag_7
rolling_mean_7
rolling_mean_14
recent_trend
```

## Calendar Features

```text
day_of_week
weekend
holiday
month
seasonal_context
```

## Weather Features

```text
rainfall
temperature
weather_category
```

Feature yang digunakan tetap harus dievaluasi berdasarkan ketersediaan data dan risiko overfitting.

---

# 11. Weather Data

Weather digunakan sebagai contextual feature untuk forecasting.

Potential data:

- Temperature
- Rainfall
- Weather category

Weather API dapat digunakan sebagai external service.

Jika API gagal:

```text
Weather API
     ↓
Failure
     ↓
Cached / Latest Valid Data
     ↓
Forecast tetap dapat berjalan
```

Weather API bersifat pendukung dan bukan dependency mutlak untuk seluruh aplikasi.

---

# 12. Holiday & Calendar Data

Calendar context digunakan sebagai forecasting feature, terutama untuk XGBoost.

Potential information:

- National holidays
- Weekend
- Day of week
- Month / seasonal context

Holiday data dapat berasal dari external service atau disimpan sebagai dataset internal.

External calendar API tidak wajib digunakan.

---

# 13. Model Evaluation

WMA dan XGBoost dibandingkan menggunakan:

## MAE

**Mean Absolute Error**

Mengukur rata-rata selisih absolut antara hasil forecast dan actual demand.

Semakin kecil MAE, semakin baik.

## MAPE

**Mean Absolute Percentage Error**

Mengukur rata-rata error relatif antara forecast dan actual demand.

MAPE harus menangani:

- Actual demand = 0
- Actual demand sangat kecil

dengan metode yang aman dan terdokumentasi.

---

# 14. Time-Series Validation

CaterWise tidak menggunakan random train/test split sebagai metode evaluasi utama.

Evaluasi menggunakan:

**Time-aware / Walk-forward Validation**

Konsep:

```text
Past
 ↓
Train
 ↓
Predict Future
 ↓
Compare With Actual
 ↓
Expand Training Window
 ↓
Predict Next Future
 ↓
Compare Again
```

Tujuannya adalah menjaga urutan waktu sehingga data masa depan tidak digunakan untuk memprediksi masa lalu.

---

# 15. Model Selection

Setelah WMA dan XGBoost dievaluasi:

```text
WMA
 ↓
MAE / MAPE
 ↓
Comparison
 ───────────────
XGBoost
 ↓
MAE / MAPE
 ↓
Comparison
       ↓
 Model Selection
       ↓
Active Model
```

Contoh:

| Model | MAE | MAPE |
|---|---:|---:|
| WMA | 5.8 | 10.4% |
| XGBoost | 4.1 | 7.8% |

Dalam contoh tersebut XGBoost dapat dipilih.

Namun apabila:

```text
WMA MAE < XGBoost MAE
```

atau performa WMA lebih baik berdasarkan evaluasi yang ditetapkan, maka **WMA tetap digunakan**.

Prinsip:

> **Simple Before Complex.**

> **Evaluate Before Selecting.**

---

# 16. Cold Start

CaterWise tidak memaksakan XGBoost ketika data belum mencukupi.

Flow:

```text
New Restaurant
      ↓
Limited Historical Data
      ↓
WMA / Baseline
      ↓
Collect More Data
      ↓
Sufficient History
      ↓
Evaluate XGBoost
      ↓
Select Best Model
```

WMA menjadi metode yang lebih sesuai pada kondisi cold start karena lebih sederhana dan membutuhkan lebih sedikit data.

---

# 17. Personalized Forecasting

Setiap restoran memiliki pola demand yang berbeda.

CaterWise dirancang agar forecasting dapat menggunakan data masing-masing restoran.

```text
Restaurant A
     ↓
Historical Data A
     ↓
Forecast A


Restaurant B
     ↓
Historical Data B
     ↓
Forecast B
```

Untuk MVP, model dapat dilatih menggunakan data masing-masing restoran apabila data mencukupi.

---

# 18. Model Retraining

XGBoost tidak dilatih ulang setiap transaksi.

Retraining dilakukan secara berkala.

Contoh:

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
Calculate MAE / MAPE
      ↓
Select Model
      ↓
Update Active Forecast
```

Jika training gagal:

```text
Training Failure
      ↓
Previous Valid Model
      ↓
Continue Forecasting
```

Jika model valid sebelumnya tidak tersedia, WMA dapat digunakan sebagai fallback.

---

# 19. Production Recommendation

Forecast demand berbeda dengan production recommendation.

Forecast:

> "Kemungkinan terjual 52 porsi."

Recommendation:

> "Produksi 54 porsi."

Konsep:

```text
Forecast Demand
      +
Operational Buffer
      ↓
Recommended Production
```

Formula konseptual:

```text
Recommended Production = Forecast + Operational Buffer
```

Besarnya operational buffer tidak boleh ditentukan secara arbitrer.

Nilainya harus ditentukan melalui:

- Eksperimen
- Karakteristik operasional
- Evaluasi historical data
- Risiko underproduction
- Risiko overproduction

---

# 20. Simulation Engine

Simulation menggunakan:

- Historical demand
- Selected date
- Day of week
- Holiday context
- Weather context
- Selected forecasting model
- Production quantity

Simulation menghasilkan estimasi:

```text
Estimated Sold
Estimated Remaining
Estimated Sell-through
Projected Revenue
Production Cost
Projected Profit/Loss
```

Financial calculation:

```text
Revenue
= Estimated Sold × Selling Price

Production Cost
= Produced Quantity × HPP

Profit/Loss
= Revenue - Production Cost
```

Simulation bukan transaksi nyata.

Animasi hanya digunakan sebagai visualisasi hasil simulasi.

---

# 21. Surplus Calculation

Jika production quantity tersedia:

```text
Surplus = Production - Sold
```

CaterWise membedakan:

### Predicted Surplus

Surplus yang diperkirakan berdasarkan forecast dan production quantity.

### Actual Surplus

Surplus yang dikonfirmasi pengguna berdasarkan kondisi aktual.

Jika:

```text
Sold > Production
```

sistem memberikan peringatan agar pengguna memeriksa data atau mencatat adanya produksi tambahan.

---

# 22. Analytics Engine

Backend menghitung numerical analytics sebelum hasil dikirim ke frontend atau Gemini.

Metrics utama:

```text
Surplus Rate
Sell-through Rate
MAE
MAPE
Forecast Demand
Recommended Production
Estimated Sold
Estimated Remaining
Revenue
Production Cost
Profit/Loss
```

Formula:

```text
Surplus Rate
= Surplus / Production × 100%

Sell-through Rate
= Sold / Production × 100%
```

Backend menjadi numerical source of truth.

---

# 23. Gemini API

Gemini digunakan sebagai:

**AI conversational / explanation layer**

Gemini bukan forecasting engine.

## Use Cases

- Daily summary
- Forecast explanation
- Simulation summary
- Surplus summary
- User questions
- Natural-language insights
- Document parsing assistance jika diperlukan

## Tidak digunakan untuk

- Menghitung official forecast
- Menggantikan WMA
- Menggantikan XGBoost
- Menghasilkan angka finansial tanpa sumber
- Membuat menu baru secara otomatis
- Mengambil keputusan distribusi otomatis

Architecture:

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

Gemini tidak boleh membuat angka sendiri.

---

# 24. Document Processing

CaterWise mendukung historical sales import dari:

```text
XLSX
CSV
PDF
DOCX
```

Flow:

```text
Upload
   ↓
Extraction
   ↓
Parsing
   ↓
Menu Matching
   ↓
Validation
   ↓
Preview
   ↓
User Confirmation
   ↓
Save
```

Master menu menjadi **source of truth**.

Sistem tidak boleh otomatis membuat menu baru berdasarkan isi dokumen.

---

# 25. Upload Security

Uploaded documents dianggap sebagai untrusted input.

Sistem harus:

- Validate file type
- Enforce file size limit
- Reject unsupported files
- Sanitize extracted content
- Never execute uploaded content
- Validate parsed values
- Require user confirmation sebelum commit

---

# 26. External Services

| Service | Technology | Purpose |
|---|---|---|
| Database | Supabase PostgreSQL | Data persistence |
| Authentication | Supabase Auth | Authentication |
| Forecasting | XGBoost | Machine-learning forecasting |
| Baseline | WMA | Baseline forecasting |
| ML Runtime | Python | XGBoost service |
| AI | Gemini API | Explanation & insights |
| Weather | Weather API | Weather features |
| Email | Resend | Verification / reset / notification |
| Calendar | Internal dataset / external API | Holiday context |

Resend bersifat opsional.

Holiday data juga dapat disimpan sebagai dataset internal.

---

# 27. Subscription Technology

CaterWise menggunakan dua level forecasting capability.

## FREE

```text
Historical Data
      ↓
WMA
      ↓
Forecast
      ↓
Production Recommendation
```

Includes:

- Basic Dashboard
- Menu Management
- Manual Sales Input
- Sales History
- WMA Forecasting
- Basic Analytics

Free tetap menggunakan historical data.

Perbedaannya adalah metode forecasting yang digunakan lebih sederhana.

## PRO

```text
Historical Data
      ↓
 ┌────┴────┐
 ▼         ▼
WMA      XGBoost
 │         │
 └────┬────┘
      ↓
 MAE / MAPE
      ↓
Model Selection
      ↓
Adaptive Forecast
```

Includes:

- XGBoost evaluation
- WMA vs XGBoost comparison
- Model selection
- Adaptive forecasting
- Advanced MAE/MAPE analytics
- Simulation
- Advanced AI insights
- Historical document import
- Advanced surplus analytics
- Improved distribution workflow

---

# 28. System Architecture

```text
                              USER
                                │
                                ▼
                       NEXT.JS FRONTEND
                                │
                                ▼
                    NEXT.JS API ROUTES
                         / NODE.JS
                                │
              ┌─────────────────┼──────────────────┐
              │                 │                  │
              ▼                 ▼                  ▼
          SUPABASE         FORECASTING        EXTERNAL APIs
          POSTGRES             ENGINE               │
              │           ┌─────┴─────┐       ┌────┼────┐
              │           ▼           ▼       ▼    ▼    ▼
              │          WMA       XGBoost  Gemini Weather
              │                       │
              │                    Python
              │
              ▼
       Historical Data
```

---

# 29. Forecasting Architecture

Forecasting secara lebih detail:

```text
                  HISTORICAL SALES
                         │
                         ▼
                 Feature Preparation
                         │
              ┌──────────┴──────────┐
              │                     │
              ▼                     ▼
             WMA                 XGBoost
          Baseline              ML Candidate
              │                     │
              └──────────┬──────────┘
                         ▼
                  Time-Aware Validation
                         │
                         ▼
                    MAE / MAPE
                         │
                         ▼
                   Model Selection
                         │
                         ▼
                  Active Forecast Model
                         │
                         ▼
                    Demand Forecast
                         │
                         ▼
              Production Recommendation
```

---

# 30. Reliability & Fallback

CaterWise dirancang agar kegagalan komponen eksternal tidak menyebabkan seluruh aplikasi berhenti.

## Weather API Failure

```text
Weather API Failure
        ↓
Cached / Latest Valid Data
        ↓
Continue Operation
```

## Gemini Failure

```text
Gemini Failure
        ↓
Numerical Dashboard
        ↓
Still Available
```

## XGBoost Training Failure

```text
XGBoost Training Failure
        ↓
Previous Valid Model
        ↓
Continue Forecasting
```

Jika previous valid model tidak tersedia:

```text
WMA
 ↓
Fallback Forecast
```

---

# 31. Performance Considerations

## Daily Input

Manual daily input harus ringan dan cepat karena digunakan secara rutin.

## Forecast Serving

Forecast yang sudah dihitung sebaiknya disimpan atau diprecompute sehingga dashboard tidak perlu menjalankan forecasting berat setiap request.

## XGBoost Training

Training tidak dilakukan secara synchronous ketika user membuka dashboard.

Training dijalankan sebagai proses terpisah/berkala.

```text
User Request
     ↓
Stored Forecast
     ↓
Fast Response
```

Sedangkan:

```text
Scheduled Training
     ↓
XGBoost Training
     ↓
Evaluation
     ↓
Model Selection
     ↓
Update Forecast
```

---

# 32. Security Stack

Security layer CaterWise meliputi:

```text
Supabase Auth
      ↓
Authentication
      ↓
Authorization
      ↓
RLS
      ↓
Tenant Isolation
```

Selain itu:

- Input validation
- Ownership validation
- Menu ownership validation
- Restaurant ownership validation
- Upload validation
- File size restriction
- Server-side API key storage
- AI data minimization

Secret credentials seperti:

```text
GEMINI_API_KEY
WEATHER_API_KEY
RESEND_API_KEY
```

tidak boleh diekspos ke client.

---

# 33. Core Technology Summary

| Layer | Technology |
|---|---|
| Frontend Framework | Next.js |
| UI Library | React |
| Frontend Language | TypeScript |
| Styling | Tailwind CSS |
| Backend | Next.js API Routes / Route Handlers |
| Backend Runtime | Node.js |
| Backend Language | TypeScript |
| Database | Supabase PostgreSQL |
| Authentication | Supabase Auth |
| Authorization | Supabase RLS |
| Forecasting Baseline | Weighted Moving Average (WMA) |
| Machine Learning | XGBoost |
| ML Runtime | Python |
| Model Evaluation | MAE / MAPE |
| Validation | Time-aware / Walk-forward Validation |
| AI Layer | Gemini API |
| Weather | Weather API |
| Email | Resend (optional) |
| Holiday Context | Internal Dataset / External Calendar API |
| Document Import | XLSX / CSV / PDF / DOCX |

---

# 34. Technology Principles

### 1. Data Before AI

Historical sales merupakan dasar forecasting dan analytics.

### 2. Simple Before Complex

WMA tetap digunakan karena model sederhana dapat menjadi pilihan terbaik ketika data terbatas atau performanya lebih baik.

### 3. Evaluate Before Selecting

XGBoost tidak otomatis dipilih hanya karena menggunakan machine learning.

### 4. AI Explains, Models Calculate

WMA dan XGBoost menghitung forecast.

Backend menghitung analytics dan financial metrics.

Gemini hanya menjelaskan hasil yang sudah dihitung.

### 5. Human in the Loop

Keputusan produksi dan redistribusi tetap dikonfirmasi pengguna.

### 6. Fallback by Design

Jika komponen tertentu gagal, CaterWise tetap menggunakan hasil valid sebelumnya atau metode baseline.

### 7. Personalized by Restaurant

Forecast menggunakan pola historis masing-masing rumah makan apabila data mencukupi.

### 8. Prevent Before Redistribute

Teknologi utama CaterWise digunakan untuk mencegah overproduction.

Redistribution merupakan lapisan kedua ketika surplus tetap terjadi.

---

# 35. Final Technology Definition

CaterWise menggunakan:

```text
Next.js
React
TypeScript
Tailwind CSS
       +
Node.js
       +
Supabase PostgreSQL
Supabase Auth
Supabase RLS
       +
WMA
       +
XGBoost
Python ML Service
       +
MAE / MAPE
Walk-forward Validation
       +
Gemini API
       +
Weather API
       +
Optional Resend
```

Arsitektur tersebut mendukung pendekatan:

```text
RECORD
   ↓
ANALYZE
   ↓
FORECAST
   ↓
EVALUATE
   ↓
SELECT MODEL
   ↓
DECIDE
   ↓
PRODUCE
   ↓
MEASURE
   ↓
REDUCE SURPLUS
   ↓
REDISTRIBUTE
   ↓
LEARN
```

**CaterWise bukan sekadar aplikasi forecasting.**

Forecasting merupakan salah satu komponen dalam decision-support system yang menghubungkan **historical sales → demand prediction → production decision → actual outcome → evaluation → next forecast**.