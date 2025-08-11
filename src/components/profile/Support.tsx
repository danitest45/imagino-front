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
      } transition-opacity duration-300 space-y-4`}
    >
      <div>
        <label className="block text-sm mb-1" htmlFor="message">
          Mensagem
        </label>
        <textarea
          id="message"
          value={message}
          onChange={(e) => {
            setMessage(e.target.value);
            setSent(false);
          }}
          placeholder="Descreva seu problema ou feedback"
          className="w-full bg-gray-900/40 border border-gray-700 rounded px-3 py-2 h-32 resize-none focus:outline-none focus:ring-2 focus:ring-purple-500 transition"
        />
      </div>
      <button
        type="submit"
        className="bg-purple-600 hover:bg-purple-700 px-4 py-2 rounded-lg transition-colors"
      >
        Enviar
      </button>
      {sent && (
        <p className="text-green-400 text-sm">Mensagem enviada! Responderemos em breve.</p>
      )}
    </form>
  );
}

