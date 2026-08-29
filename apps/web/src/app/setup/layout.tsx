'use client';
import { usePathname } from 'next/navigation';

export default function SetupLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  const steps = [
    { name: '1. Profil', path: '/setup/profile' },
    { name: '2. Menu Awal', path: '/setup/menu' },
    { name: '3. Riwayat', path: '/setup/history' },
  ];

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-5xl mx-auto px-4 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="text-2xl font-bold text-blue-600">CaterWise</div>
          
          <nav aria-label="Progress">
            <ol className="flex items-center space-x-2 sm:space-x-4">
              {steps.map((step, index) => {
                const isActive = pathname === step.path;
                const isPast = steps.findIndex((s) => s.path === pathname) > index;
                
                return (
                  <li key={step.name} className="flex items-center">
                    <div className={`
                      flex items-center justify-center px-3 py-1.5 rounded-full text-xs sm:text-sm font-medium
                      ${isActive ? 'bg-blue-600 text-white' : 
                        isPast ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-400'}
                    `}>
                      {step.name}
                    </div>
                    {index < steps.length - 1 && (
                      <div className="ml-2 sm:ml-4 w-4 sm:w-8 h-px bg-gray-300"></div>
                    )}
                  </li>
                );
              })}
            </ol>
          </nav>
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center p-6">
        <div className="w-full max-w-4xl">
          {children}
        </div>
      </main>
    </div>
  );
}
