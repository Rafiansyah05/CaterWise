'use client';
import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense } from 'react';

function VerifyOTPForm() {
  const [otp, setOtp] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const email = searchParams.get('email') || '';

  useEffect(() => {
    if (!email) router.push('/signup');
  }, [email, router]);

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    const res = await fetch('/api/auth/verify-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, otp }),
    });

    if (!res.ok) {
      const data = await res.json();
      setError(data.error || 'OTP tidak valid');
      setLoading(false);
      return;
    }

    setSuccess('Verifikasi berhasil! Mengarahkan ke pengaturan profil...');
    setTimeout(() => {
      router.push('/setup/profile');
    }, 1500);
  };

  return (
    <>
      <div className="text-center">
        <h2 className="mt-2 text-3xl font-bold tracking-tight text-gray-900">
          Verifikasi OTP
        </h2>
        <p className="mt-2 text-sm text-gray-500">
          Masukkan 6 digit kode yang dikirim ke <br />
          <span className="font-semibold text-gray-700">{email}</span>
        </p>
      </div>

      <form className="mt-8 space-y-5" onSubmit={handleVerify}>
        {error && <div className="text-red-500 text-sm text-center bg-red-50 p-2 rounded-lg">{error}</div>}
        {success && <div className="text-green-600 text-sm text-center bg-green-50 p-2 rounded-lg">{success}</div>}
        
        <div className="relative mt-2">
          <input
            type="text"
            required
            maxLength={6}
            id="otp"
            className="block px-3 pb-2.5 pt-5 w-full text-center tracking-[0.5em] text-gray-900 bg-transparent rounded-lg border border-gray-300 appearance-none focus:outline-none focus:ring-0 focus:border-blue-600 peer text-2xl font-bold"
            placeholder=" "
            value={otp}
            onChange={(e) => setOtp(e.target.value.replace(/[^0-9]/g, ''))}
          />
          <label
            htmlFor="otp"
            className="absolute text-sm text-gray-500 duration-300 transform -translate-y-4 scale-75 top-4 z-10 origin-[0] left-3 bg-white px-1 peer-focus:text-blue-600 peer-placeholder-shown:scale-100 peer-placeholder-shown:-translate-y-1/2 peer-placeholder-shown:top-1/2 peer-focus:top-2 peer-focus:scale-75 peer-focus:-translate-y-4 cursor-text"
          >
            Kode OTP
          </label>
        </div>

        <div>
          <button
            type="submit"
            disabled={loading || success.length > 0}
            className="group relative flex w-full justify-center rounded-lg bg-blue-600 px-3 py-3 text-sm font-semibold text-white transition-all hover:bg-blue-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 disabled:opacity-50"
          >
            {loading ? 'Memverifikasi...' : 'Verifikasi Akun'}
          </button>
        </div>
      </form>
    </>
  );
}

export default function VerifyOTPPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <VerifyOTPForm />
    </Suspense>
  );
}
