'use client';

import { useEffect, useState } from 'react';

type ToastKind = 'info' | 'success' | 'error';

type ToastMessage = {
  id: number;
  message: string;
  kind: ToastKind;
};

type Listener = (toast: ToastMessage) => void;

const listeners = new Set<Listener>();
let counter = 0;

export function toast(message: string, kind: ToastKind = 'info') {
  if (typeof window === 'undefined') {
    console.log(message);
    return;
  }

  const toastMessage: ToastMessage = { id: ++counter, message, kind };
  listeners.forEach(listener => listener(toastMessage));
}

export function Toaster() {
  const [items, setItems] = useState<ToastMessage[]>([]);

  useEffect(() => {
    const handleToast: Listener = toastMessage => {
      setItems(current => [...current, toastMessage]);
      setTimeout(() => {
        setItems(current => current.filter(item => item.id !== toastMessage.id));
      }, 4200);
    };

    listeners.add(handleToast);
    return () => {
      listeners.delete(handleToast);
    };
  }, []);

  const tone = {
    info: 'from-slate-200 to-slate-100 text-slate-900',
    success: 'from-emerald-400 to-emerald-300 text-emerald-950',
    error: 'from-rose-400 to-rose-300 text-rose-950',
  } as const;

  const border = {
    info: 'border-slate-200/60',
    success: 'border-emerald-400/60',
    error: 'border-rose-400/60',
  } as const;

  return (
    <div className="pointer-events-none fixed inset-0 z-50 flex items-start justify-end p-4 sm:p-6">
      <div className="flex w-full max-w-sm flex-col gap-3 sm:max-w-md">
        {items.map(item => (
          <div
            key={item.id}
            role="status"
            className={`pointer-events-auto overflow-hidden rounded-2xl border bg-gradient-to-r px-4 py-3 shadow-xl shadow-black/25 ring-1 ring-black/5 ${tone[item.kind]} ${border[item.kind]}`}
          >
            <p className="text-sm font-semibold">{item.message}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
