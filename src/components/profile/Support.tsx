'use client';

import { useEffect, useState } from 'react';

export default function Support() {
  const [message, setMessage] = useState('');
  const [sent, setSent] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => setVisible(true), []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSent(true);
    setMessage('');
  };

  return (
    <form
      onSubmit={handleSubmit}
      className={`${
        visible ? 'opacity-100' : 'opacity-0'
      } space-y-5 transition-opacity duration-300`}
    >
      <section className="relative overflow-hidden rounded-3xl border border-white/10 bg-black/35 p-6 shadow-inner shadow-purple-500/20">
        <div className="absolute -right-16 top-0 h-48 w-48 rounded-full bg-gradient-to-br from-fuchsia-500/15 via-purple-500/15 to-cyan-400/15 blur-3xl" aria-hidden />
        <div className="relative space-y-3">
          <p className="text-xs font-semibold uppercase tracking-[0.32em] text-fuchsia-100">imagino.AI Care</p>
          <h2 className="text-xl font-semibold text-white">Talk with our success engineers</h2>
          <p className="text-sm text-gray-300">
            Share feedback, request new capabilities, or flag an issue. We reply within 24 hours on business days.
          </p>
        </div>
      </section>

      <div className="space-y-3 rounded-3xl border border-white/10 bg-black/40 p-6 shadow-[0_30px_80px_-50px_rgba(168,85,247,0.45)]">
        <label className="text-xs font-semibold uppercase tracking-[0.3em] text-gray-400" htmlFor="message">
          Message
        </label>
        <textarea
          id="message"
          value={message}
          onChange={e => {
            setMessage(e.target.value);
            setSent(false);
          }}
          placeholder="Tell us how we can help and include any relevant links or job IDs."
          className="h-36 w-full resize-none rounded-2xl border border-white/15 bg-black/60 px-4 py-3 text-sm text-white shadow-inner shadow-purple-500/10 transition focus:border-fuchsia-400 focus:outline-none focus:ring-2 focus:ring-fuchsia-500/30"
        />
        <button
          type="submit"
          className="inline-flex items-center justify-center rounded-full bg-gradient-to-r from-fuchsia-500 via-purple-500 to-cyan-400 px-6 py-2 text-sm font-semibold text-white shadow-lg shadow-purple-500/30 transition hover:shadow-purple-500/50 disabled:opacity-60"
          disabled={!message.trim()}
        >
          Send message
        </button>
        {sent && (
          <p className="text-sm text-emerald-400">Thank you! Our team will reach out shortly.</p>
        )}
      </div>
    </form>
  );
}

