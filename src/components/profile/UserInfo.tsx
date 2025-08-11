'use client';

import { useState, useEffect } from 'react';

export default function UserInfo() {
  const [form, setForm] = useState({ name: '', email: '' });
  const [saved, setSaved] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => setVisible(true), []);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    setSaved(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSaved(true);
  };

  return (
    <form
      onSubmit={handleSubmit}
      className={`${
        visible ? 'opacity-100' : 'opacity-0'
      } transition-opacity duration-300 bg-gray-800 rounded-lg p-6 shadow-md space-y-4`}
    >
      <div>
        <label className="block text-sm mb-1" htmlFor="name">
          Nome
        </label>
        <input
          id="name"
          name="name"
          value={form.name}
          onChange={handleChange}
          placeholder="Seu nome"
          className="w-full bg-gray-700 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500 transition"
        />
      </div>
      <div>
        <label className="block text-sm mb-1" htmlFor="email">
          E-mail
        </label>
        <input
          id="email"
          type="email"
          name="email"
          value={form.email}
          onChange={handleChange}
          placeholder="voce@exemplo.com"
          className="w-full bg-gray-700 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500 transition"
        />
      </div>
      <button
        type="submit"
        className="bg-purple-600 hover:bg-purple-700 px-4 py-2 rounded transition-colors"
      >
        Salvar
      </button>
      {saved && (
        <p className="text-green-400 text-sm">Informações atualizadas!</p>
      )}
    </form>
  );
}

