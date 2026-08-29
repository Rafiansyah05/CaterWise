export const dynamic = 'force-dynamic';
import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { Reveal } from '@/components/ui/Reveal';

const faq = [
  {
    tanya: 'Butuh riwayat penjualan sebanyak apa untuk mulai?',
    jawab:
      'Sekitar satu bulan membuat hitungan lebih bermakna. Kurang dari itu tetap bisa dipakai, hanya hasilnya lebih kasar sampai datanya bertambah.',
  },
  {
    tanya: 'Apakah CaterWise mengambil alih keputusan produksi?',
    jawab:
      'Tidak. Sistem memberi angka beserta alasannya, keputusan berapa yang dimasak tetap di tanganmu.',
  },
  {
    tanya: 'Bagaimana kalau ada menu yang tidak dijual tiap hari?',
    jawab:
      'Menu bisa dinonaktifkan tanpa dihapus, jadi riwayat penjualannya tetap utuh dan bisa diaktifkan lagi kapan saja.',
  },
  {
    tanya: 'Apakah data warung saya bisa dilihat orang lain?',
    jawab:
      'Tidak. Tiap akun hanya bisa membuka data restorannya sendiri, dan pemisahan itu dijaga langsung di tingkat basis data.',
  },
];

const fitur = [
  {
    judul: 'Angka produksi per menu',
    teks: 'Rekomendasi porsi untuk besok, dihitung dari pola penjualan warungmu sendiri.',
    ikon: 'M4 6h16M4 12h10M4 18h7',
  },
  {
    judul: 'Sisa yang terhitung',
    teks: 'Selisih produksi dan penjualan tercatat otomatis, jadi kamu tahu menu mana yang paling sering berlebih.',
    ikon: 'M3 21h18M6 21V9m6 12V4m6 17v-8',
  },
  {
    judul: 'Simulasi sebelum masak',
    teks: 'Coba skenario jumlah masakan, lihat perkiraan untung ruginya sebelum belanja.',
    ikon: 'M5 4v6m0 4v6M12 4v10m0 4v2M19 4v3m0 4v9M2.5 12h5M9.5 16h5M16.5 9h5',
  },
  {
    judul: 'Penyaluran surplus',
    teks: 'Masakan berlebih yang masih layak bisa diteruskan ke mitra food rescue, dengan konfirmasimu.',
    ikon: 'M12 20.5s-7.5-4.6-7.5-9.7A4.3 4.3 0 0 1 12 8.4a4.3 4.3 0 0 1 7.5 2.4c0 5.1-7.5 9.7-7.5 9.7z',
  },
];

export default async function Home() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (user) {
    redirect('/dashboard');
  }

  return (
    <div className="min-h-screen bg-paper text-ink">
      <header className="sticky top-0 z-50 border-b border-hairline bg-white/85 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-6 px-5 py-3.5 sm:px-8">
          <Link
            href="/"
            className="shrink-0 rounded-md focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand"
          >
            <img src="/logo/logo_panjang_hitam.png" alt="CaterWise" className="h-7 object-contain sm:h-8" />
          </Link>

          <div className="flex shrink-0 items-center gap-1 sm:gap-3">
            <Link
              href="/login"
              className="rounded-lg px-3 py-2 text-sm font-semibold text-muted transition-colors hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
            >
              Masuk
            </Link>
            <Link
              href="/signup"
              className="inline-flex items-center justify-center rounded-xl bg-brand px-4 py-2.5 text-sm font-bold text-white transition-colors hover:bg-[#1540e0] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink sm:px-5"
            >
              Daftar sekarang
            </Link>
          </div>
        </div>
      </header>

      <main>
        <section className="mx-auto max-w-6xl px-5 pb-24 pt-16 sm:px-8 sm:pb-32 sm:pt-24">
          <div className="grid items-center gap-14 lg:grid-cols-[1.05fr_1fr] lg:gap-12">
            <div>
              <h1
                className="rise text-[2.6rem] font-extrabold leading-[1.06] tracking-[-0.03em] sm:text-[3.6rem] sm:leading-[1.03]"
                style={{ animationDelay: '60ms' }}
              >
                Berapa porsi
                <br />
                yang harus dimasak
                <br />
                <span className="text-brand">besok?</span>
              </h1>

              <p
                className="rise mt-7 max-w-lg text-base leading-relaxed text-muted sm:text-lg"
                style={{ animationDelay: '200ms' }}
              >
                Kamu memutuskan jumlah masakan sebelum tahu berapa yang laku. CaterWise membaca
                riwayat penjualan warungmu sendiri, lalu memberi angka produksi per menu. Keputusan
                pagi hari jadi punya dasar, bukan firasat.
              </p>

              <div
                className="rise mt-9 flex flex-col gap-3 sm:flex-row sm:items-center"
                style={{ animationDelay: '340ms' }}
              >
                <Link
                  href="/signup"
                  className="inline-flex h-12 min-w-[10.5rem] items-center justify-center rounded-xl bg-brand px-8 text-sm font-bold text-white transition-transform hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
                >
                  Mulai
                </Link>
                <Link
                  href="/login"
                  className="inline-flex h-12 items-center justify-center rounded-xl px-6 text-sm font-bold text-ink transition-colors hover:text-brand focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
                >
                  Sudah punya akun
                </Link>
              </div>
            </div>

            <div className="rise mx-auto w-full max-w-lg lg:max-w-none" style={{ animationDelay: '460ms' }}>
              <div className="rounded-2xl border border-hairline bg-white p-5 shadow-[0_2px_4px_rgba(11,16,32,0.03),0_18px_50px_-18px_rgba(11,16,32,0.16)] sm:p-7">
                <div className="flex items-baseline justify-between gap-3">
                  <span className="text-sm font-bold">Permintaan Ayam Goreng</span>
                  <span className="text-xs text-muted">Contoh</span>
                </div>

                <svg viewBox="0 0 400 232" className="mt-5 w-full" role="img" aria-label="Grafik penjualan tujuh hari terakhir yang berlanjut ke prediksi besok">
                  <defs>
                    <linearGradient id="isiArea" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#1b4dff" stopOpacity="0.16" />
                      <stop offset="100%" stopColor="#1b4dff" stopOpacity="0" />
                    </linearGradient>
                  </defs>

                  {[40, 80, 120, 160, 200].map((y) => (
                    <line key={y} x1="8" y1={y} x2="392" y2={y} stroke="#eef1f8" strokeWidth="1" />
                  ))}

                  <path
                    className="area-in"
                    d="M28 177 L86 154 L144 166 L202 126 L260 97 L318 63 L376 114 L376 200 L28 200 Z"
                    fill="url(#isiArea)"
                  />

                  <polyline
                    className="draw"
                    points="28,177 86,154 144,166 202,126 260,97 318,63 376,114"
                    fill="none"
                    stroke="#1b4dff"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />

                  <polyline
                    className="draw-late"
                    points="376,114 400,86"
                    fill="none"
                    stroke="#1b4dff"
                    strokeWidth="2.5"
                    strokeDasharray="5 5"
                    strokeLinecap="round"
                  />

                  <circle className="pulse" cx="376" cy="114" r="7" fill="#1b4dff" opacity="0.35" />
                  <circle className="pop" cx="376" cy="114" r="5" fill="#ffffff" stroke="#1b4dff" strokeWidth="3" />

                  {['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'].map((d, i) => (
                    <text
                      key={d}
                      x={28 + i * 58}
                      y="224"
                      textAnchor="middle"
                      fontSize="11"
                      fill="#5b6579"
                      fontWeight="500"
                    >
                      {d}
                    </text>
                  ))}
                </svg>

                <div className="mt-5 flex items-center justify-between gap-4 border-t border-hairline pt-4">
                  <span className="text-xs text-muted">Tujuh hari terakhir</span>
                  <span className="text-sm font-bold text-brand tabular-nums">
                    Besok 54 <span className="text-xs font-medium text-muted">porsi</span>
                  </span>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="fitur" className="mx-auto max-w-6xl scroll-mt-24 px-5 py-20 sm:px-8 sm:py-28">
          <Reveal>
            <div className="text-center">
              <h2 className="text-[1.7rem] font-bold leading-[1.15] tracking-[-0.02em] sm:text-[2.25rem]">
                Yang kamu lihat tiap pagi
              </h2>
              <p className="mx-auto mt-3 max-w-lg text-base leading-relaxed text-muted">
                Angka dihitung lebih dulu di belakang layar. AI hanya menjelaskan hasilnya dengan
                bahasa yang enak dibaca, bukan mengarang angkanya.
              </p>
            </div>
          </Reveal>

          <dl className="mt-12 grid gap-5 sm:grid-cols-2">
            {fitur.map((f, i) => (
              <Reveal key={f.judul} delay={i * 110}>
                <div className="flex h-full gap-5 rounded-2xl border border-hairline bg-white p-6 shadow-[0_1px_2px_rgba(11,16,32,0.03)] transition-shadow duration-300 hover:shadow-[0_2px_4px_rgba(11,16,32,0.04),0_14px_32px_-14px_rgba(11,16,32,0.16)] sm:p-7">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-wash">
                    <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5 text-brand" aria-hidden="true">
                      <path d={f.ikon} stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </span>
                  <div>
                    <dt className="text-base font-bold">{f.judul}</dt>
                    <dd className="mt-2 text-sm leading-relaxed text-muted">{f.teks}</dd>
                  </div>
                </div>
              </Reveal>
            ))}
          </dl>
        </section>

        <section id="faq" className="mx-auto max-w-6xl scroll-mt-24 px-5 pb-24 sm:px-8 sm:pb-36">
          <Reveal>
            <div className="text-center">
              <h2 className="text-[1.7rem] font-bold leading-[1.15] tracking-[-0.02em] sm:text-[2.25rem]">
                Pertanyaan yang sering muncul
              </h2>
              <p className="mx-auto mt-3 max-w-md text-base leading-relaxed text-muted">
                Hal-hal yang biasanya ditanyakan pemilik rumah makan sebelum mulai memakai CaterWise.
              </p>
            </div>
          </Reveal>

          <div className="mx-auto mt-12 max-w-3xl space-y-4">
            {faq.map((f, i) => (
              <Reveal key={f.tanya} delay={i * 85}>
                <details className="group rounded-2xl border border-hairline bg-white px-5 transition-colors open:border-[#c9d4f5] sm:px-6">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-5 py-5 text-left text-[0.95rem] font-semibold marker:hidden focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand sm:text-base">
                    {f.tanya}
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#f1f4fb] text-muted transition-all duration-300 group-open:rotate-180 group-open:bg-wash group-open:text-brand">
                      <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4" aria-hidden="true">
                        <path d="m6 9 6 6 6-6" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </span>
                  </summary>
                  <p className="pb-6 pr-10 text-sm leading-relaxed text-muted">{f.jawab}</p>
                </details>
              </Reveal>
            ))}
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-5 pb-24 sm:px-8 sm:pb-36">
          <Reveal>
            <div className="rounded-3xl bg-ink px-6 py-14 text-center sm:px-12 sm:py-20">
              <h2 className="mx-auto max-w-2xl text-[1.7rem] font-extrabold leading-[1.12] tracking-[-0.02em] text-white sm:text-[2.5rem]">
                Mulai dari catatan penjualan
                <br className="hidden sm:block" /> yang sudah kamu punya
              </h2>
              <p className="mx-auto mt-5 max-w-md text-base leading-relaxed text-[#9aa6c2]">
                Daftarkan menu, masukkan riwayat penjualan, lalu lihat angka produksi pertamamu.
              </p>
              <Link
                href="/signup"
                className="mt-9 inline-flex h-12 items-center justify-center rounded-xl bg-white px-8 text-sm font-bold text-ink transition-transform hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
              >
                Buat akun
              </Link>
            </div>
          </Reveal>
        </section>
      </main>

      <footer className="border-t border-hairline">
        <div className="mx-auto flex max-w-5xl flex-col gap-2 px-5 py-8 text-xs text-muted sm:flex-row sm:items-center sm:justify-between sm:px-8">
          <p>CaterWise &copy; 2026</p>
          <p>ANFORCOM 2026 Data Science &amp; Data Challenge</p>
        </div>
      </footer>
    </div>
  );
}
