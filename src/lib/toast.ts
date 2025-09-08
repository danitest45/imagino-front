'use client';
export function toast(message: string) {
  if (typeof window !== 'undefined') {
    window.alert(message);
  } else {
    console.log(message);
  }
}

export function Toaster() {
  return null;
}
