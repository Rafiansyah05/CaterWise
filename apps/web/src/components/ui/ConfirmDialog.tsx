'use client';
import { useEffect } from 'react';

interface ConfirmDialogProps {
  isInfo?: boolean;
  isOpen: boolean;
  title: string;
  message: string | React.ReactNode;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel: () => void;
  isDanger?: boolean;
}

export function ConfirmDialog({
  isOpen,
  isInfo = false,
  title,
  message,
  confirmText = 'Konfirmasi',
  cancelText = 'Batal',
  onConfirm,
  onCancel,
  isDanger = false,
}: ConfirmDialogProps) {
  useEffect(() => {
    if (!isOpen) return;
    const sebelumnya = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel();
    };
    document.addEventListener('keydown', onKey);

    return () => {
      document.body.style.overflow = sebelumnya;
      document.removeEventListener('keydown', onKey);
    };
  }, [isOpen, onCancel]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" role="dialog" aria-modal="true">
      <div className="backdrop-in fixed inset-0 bg-[#0b1020]/40 backdrop-blur-sm" onClick={onCancel} />

      <div className="dialog-in relative w-full max-w-sm rounded-2xl bg-white p-8 text-center shadow-[0_8px_16px_-8px_rgba(11,16,32,0.2),0_24px_60px_-20px_rgba(11,16,32,0.35)]">
        <span
          className={`check-in mx-auto flex h-16 w-16 items-center justify-center rounded-full ${
            isDanger ? 'bg-red-600' : 'bg-blue-600'
          }`}
        >
          {isDanger ? (
            <svg viewBox="0 0 24 24" fill="none" className="h-9 w-9 text-white" aria-hidden="true">
              <path d="M12 5.5v9" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" />
              <path d="M12 19h.01" stroke="currentColor" strokeWidth="3.6" strokeLinecap="round" />
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" fill="none" className="h-9 w-9 text-white" aria-hidden="true">
              <path d="M12 18.5v-9" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" />
              <path d="M12 5h.01" stroke="currentColor" strokeWidth="3.6" strokeLinecap="round" />
            </svg>
          )}
        </span>

        <h2 className="mt-6 text-lg font-bold text-gray-900">{title}</h2>
        <div className="mt-2 text-sm leading-relaxed text-gray-500">{message}</div>

        <button
          type="button"
          autoFocus
          onClick={onConfirm}
          className={`mt-7 inline-flex h-12 w-full items-center justify-center rounded-xl text-sm font-bold text-white transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-900 ${
            isDanger && !isInfo ? 'bg-red-600 hover:bg-red-700' : 'bg-blue-600 hover:bg-blue-700'
          }`}
        >
          {isInfo ? 'Tutup' : confirmText}
        </button>

        {!isInfo && (
          <button
            type="button"
            onClick={onCancel}
            className="mt-2 inline-flex h-12 w-full items-center justify-center rounded-xl text-sm font-bold text-gray-500 transition-colors hover:bg-gray-50 hover:text-gray-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
          >
            {cancelText}
          </button>
        )}
      </div>
    </div>
  );
}
