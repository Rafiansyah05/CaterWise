'use client';

import { createClient } from '@/utils/supabase/client';
import { useRouter } from 'next/navigation';

export default function DashboardPage() {
  const router = useRouter();
  const supabase = createClient();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login'); // Kembali ke halaman login (atau signup sesuai flow awal)
  };

  return (
    <div className="p-6 sm:p-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
      </div>
      
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8 text-center flex flex-col items-center justify-center min-h-[400px]">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-16 h-16 text-gray-300 mb-4">
          <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 6a7.5 7.5 0 1 0 7.5 7.5h-7.5V6Z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 10.5H21A7.5 7.5 0 0 0 13.5 3v7.5Z" />
        </svg>
        <h2 className="text-xl font-semibold text-gray-800 mb-2">Halaman Utama (Segera Hadir)</h2>
        <p className="text-gray-500 mb-8 max-w-md mx-auto">
          Selamat! Anda telah berhasil menyelesaikan tahapan Onboarding CaterWise. Konten untuk visualisasi *forecast* dan grafik penjualan akan dibuat pada tahap selanjutnya.
        </p>
        
        <button 
          onClick={handleLogout}
          className="bg-red-600 hover:bg-red-500 text-white font-semibold py-2.5 px-8 rounded-lg shadow-sm transition-all focus:ring-2 focus:ring-red-600 focus:outline-none"
        >
          Logout (Keluar)
        </button>
      </div>
    </div>
  );
}
