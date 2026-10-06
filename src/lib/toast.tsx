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

  return (
    <div className="toast-stack">
      <div>
        {items.map(item => (
          <div
            key={item.id}
            role="status"
            className={`toast ${item.kind}`}
          >
            <p className="text-sm font-semibold">{item.message}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
