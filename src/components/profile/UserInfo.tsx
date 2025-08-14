'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { getUserProfile, updateUser } from '../../lib/api';

export default function UserInfo() {
  const { token, setUsername } = useAuth();
  const [form, setForm] = useState({ username: '', phoneNumber: '' });
  const [initial, setInitial] = useState({ username: '', phoneNumber: '' });
  const [userId, setUserId] = useState('');
  const [saved, setSaved] = useState(false);
  const [visible, setVisible] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => setVisible(true), []);

  useEffect(() => {
    async function load() {
      if (!token) return;
      try {
        const profile = await getUserProfile(token);
        setForm({
          username: profile.username || '',
          phoneNumber: profile.phoneNumber || '',
        });
        setInitial({
          username: profile.username || '',
          phoneNumber: profile.phoneNumber || '',
        });
        setUserId(profile.id);
        if (profile.username) setUsername(profile.username);
      } catch {
        setError('Erro ao carregar usuário');
      }
    }
    load();
  }, [token, setUsername]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
    setSaved(false);
    setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !userId) return;
    if (!form.username.trim()) {
      setError('Username não pode ficar vazio');
      return;
    }
    const data: { username?: string; phoneNumber?: string | null } = {};
    if (form.username !== initial.username) data.username = form.username;
    if (form.phoneNumber !== initial.phoneNumber)
      data.phoneNumber = form.phoneNumber || null;
    if (Object.keys(data).length === 0) {
      setSaved(true);
      return;
    }
    try {
      const updated = await updateUser(userId, data, token);
      setForm({
        username: updated.username || '',
        phoneNumber: updated.phoneNumber || '',
      });
      setInitial({
        username: updated.username || '',
        phoneNumber: updated.phoneNumber || '',
      });
      setUsername(updated.username);
      setSaved(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erro ao salvar');
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className={`${
        visible ? 'opacity-100' : 'opacity-0'
      } transition-opacity duration-300 space-y-4`}
    >
      <div>
        <label className="block text-sm mb-1" htmlFor="username">
          Username
        </label>
        <input
          id="username"
          name="username"
          value={form.username}
          onChange={handleChange}
          placeholder="Seu username"
          className="w-full bg-gray-900/40 border border-gray-700 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500 transition"
        />
      </div>
      <div>
        <label className="block text-sm mb-1" htmlFor="phoneNumber">
          Telefone
        </label>
        <input
          id="phoneNumber"
          name="phoneNumber"
          value={form.phoneNumber}
          onChange={handleChange}
          placeholder="(99) 99999-9999"
          className="w-full bg-gray-900/40 border border-gray-700 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500 transition"
        />
      </div>
      <button
        type="submit"
        className="bg-purple-600 hover:bg-purple-700 px-4 py-2 rounded-lg transition-colors"
      >
        Salvar
      </button>
      {saved && (
        <p className="text-green-400 text-sm">Informações atualizadas!</p>
      )}
      {error && <p className="text-red-400 text-sm">{error}</p>}
    </form>
  );
}
