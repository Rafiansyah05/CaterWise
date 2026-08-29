'use client';
import { useEffect } from 'react';

export function SuccessDialog({
  isOpen,
  title,
  message,
  actionText = 'Lanjutkan',
  onAction,
}: {
  isOpen: boolean;
  title: string;
  message: string;
  actionText?: string;
  onAction: () => void;
}) {
  useEffect(() => {
    if (!isOpen) return;
    const sebelumnya = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = sebelumnya;
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" role="dialog" aria-modal="true">
      <div className="backdrop-in fixed inset-0 bg-[#0b1020]/40 backdrop-blur-sm" />

      <div className="dialog-in relative w-full max-w-sm rounded-2xl bg-white p-8 text-center shadow-[0_8px_16px_-8px_rgba(11,16,32,0.2),0_24px_60px_-20px_rgba(11,16,32,0.35)]">
        <span className="check-in mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-brand">
          <svg viewBox="0 0 24 24" fill="none" className="h-8 w-8 text-white" aria-hidden="true">
            <path d="m5 13 4 4L19 7" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>

        <h2 className="mt-6 text-lg font-bold text-ink">{title}</h2>
        <p className="mt-2 text-sm leading-relaxed text-muted">{message}</p>

        <button
          type="button"
          autoFocus
          onClick={onAction}
          className="mt-7 inline-flex h-12 w-full items-center justify-center rounded-xl bg-brand text-sm font-bold text-white transition-colors hover:bg-[#1540e0] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
        >
          {actionText}
        </button>
      </div>
    </div>
  );
}
