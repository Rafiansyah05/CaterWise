'use client';
import { usePathname } from 'next/navigation';

const steps = [
  { name: 'Profil', path: '/setup/profile' },
  { name: 'Menu Awal', path: '/setup/menu' },
  { name: 'Riwayat', path: '/setup/history' },
];

export default function SetupLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const currentIndex = steps.findIndex((s) => s.path === pathname);

  return (
    <div className="flex min-h-screen flex-col bg-gray-50">
      <header className="sticky top-0 z-50 border-b border-hairline bg-white/85 backdrop-blur-md">
        <div className="mx-auto flex max-w-5xl flex-col gap-5 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:gap-8 sm:px-8">
          <img
            src="/logo/logo_panjang_hitam.png"
            alt="CaterWise"
            className="h-9 w-auto shrink-0 self-start object-contain sm:h-11 sm:self-auto"
          />

          <nav aria-label="Progres pengaturan">
            <ol className="flex items-center">
              {steps.map((step, index) => {
                const isActive = index === currentIndex;
                const isDone = currentIndex > index;

                return (
                  <li key={step.path} className="flex items-center">
                    <div className="flex items-center gap-2.5">
                      <span
                        className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold tabular-nums transition-colors ${
                          isDone
                            ? 'bg-brand text-white'
                            : isActive
                              ? 'bg-brand text-white ring-4 ring-wash'
                              : 'bg-white text-[#9aa5bd] ring-1 ring-hairline'
                        }`}
                        aria-current={isActive ? 'step' : undefined}
                      >
                        {isDone ? (
                          <svg viewBox="0 0 24 24" fill="none" className="h-3.5 w-3.5" aria-hidden="true">
                            <path d="m5 13 4 4L19 7" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        ) : (
                          index + 1
                        )}
                      </span>
                      <span
                        className={`hidden text-sm font-semibold transition-colors sm:block ${
                          isActive ? 'text-ink' : isDone ? 'text-muted' : 'text-[#9aa5bd]'
                        }`}
                      >
                        {step.name}
                      </span>
                    </div>

                    {index < steps.length - 1 && (
                      <span
                        className={`mx-3 h-px w-8 transition-colors sm:mx-4 sm:w-10 ${
                          isDone ? 'bg-brand' : 'bg-hairline'
                        }`}
                        aria-hidden="true"
                      />
                    )}
                  </li>
                );
              })}
            </ol>
          </nav>
        </div>
      </header>

      <main className="flex flex-1 flex-col items-center px-4 py-8 sm:px-6 sm:py-12">
        <div className="w-full max-w-3xl">{children}</div>
      </main>
    </div>
  );
}
