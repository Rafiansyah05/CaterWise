import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';

export default async function Home() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // Jika sudah login, langsung arahkan ke dashboard
  if (user) {
    redirect('/dashboard');
  }

  // Jika belum login, tampilkan landing page
  return (
    <div className="grid grid-rows-[20px_1fr_20px] items-center justify-items-center min-h-screen p-8 pb-20 gap-16 sm:p-20 font-[family-name:var(--font-geist-sans)]">
      <main className="flex flex-col gap-8 row-start-2 items-center sm:items-start text-center sm:text-left">
        <h1 className="text-4xl font-bold tracking-tight">
          Selamat datang di <span className="text-blue-600">CaterWise</span>
        </h1>
        <p className="max-w-xl text-lg text-gray-600 dark:text-gray-300">
          Platform decision-support untuk membantu rumah makan prasmanan menentukan jumlah produksi makanan dengan pendekatan data-driven dan AI.
        </p>

        <div className="flex flex-col gap-4 text-base font-medium sm:flex-row mt-6">
          <Link
            className="flex h-12 w-full items-center justify-center gap-2 rounded-full bg-blue-600 px-5 text-white transition-colors hover:bg-blue-500 md:w-[158px]"
            href="/signup"
          >
            Daftar
          </Link>
          <Link
            className="flex h-12 w-full items-center justify-center rounded-full border border-solid border-black/[.08] px-5 transition-colors hover:border-transparent hover:bg-black/[.04] dark:border-white/[.145] dark:hover:bg-[#1a1a1a] md:w-[158px]"
            href="/login"
          >
            Masuk
          </Link>
        </div>
      </main>

      <footer className="row-start-3 flex gap-6 flex-wrap items-center justify-center text-sm text-gray-500">
        <p>CaterWise &copy; 2026 - ANFORCOM 2026 DSDC</p>
      </footer>
    </div>
  );
}
