export default function Home() {
  return (
    <div className="grid grid-rows-[20px_1fr_20px] items-center justify-items-center min-h-screen p-8 pb-20 gap-16 sm:p-20 font-[family-name:var(--font-geist-sans)]">
      <main className="flex flex-col gap-8 row-start-2 items-center sm:items-start text-center sm:text-left">
        <h1 className="text-4xl font-bold tracking-tight">
          Selamat datang di <span className="text-blue-600">CaterWise</span>
        </h1>
        <p className="max-w-xl text-lg text-gray-600 dark:text-gray-300">
          Platform decision-support untuk membantu rumah makan prasmanan menentukan jumlah produksi makanan dengan pendekatan data-driven dan AI.
        </p>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full mt-4">
          <div className="p-6 border border-gray-200 dark:border-gray-800 rounded-xl">
            <h3 className="font-semibold text-lg mb-2">Supabase Ready 🚀</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Database schema and Row-Level Security configured. Ready to store daily sales, menus, and forecasts.
            </p>
          </div>
          <div className="p-6 border border-gray-200 dark:border-gray-800 rounded-xl">
            <h3 className="font-semibold text-lg mb-2">Monorepo Setup 📦</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Scalable structure with pnpm workspaces. Frontend and API routes orchestrated inside Next.js.
            </p>
          </div>
        </div>
      </main>
      
      <footer className="row-start-3 flex gap-6 flex-wrap items-center justify-center text-sm text-gray-500">
        <p>CaterWise &copy; 2026 - ANFORCOM 2026 DSDC</p>
      </footer>
    </div>
  );
}
