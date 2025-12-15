'use client';

import Image from 'next/image';
import { useEffect, useState, useRef } from 'react';
import { Pencil } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { getUserId, getUserById, updateUser } from '../../lib/api';
import type { UserDto } from '../../types/user';

export default function UserInfo() {
  const { token } = useAuth();
  const [user, setUser] = useState<UserDto | null>(null);
  const [form, setForm] = useState<UserDto | null>(null);
  const [editing, setEditing] = useState<keyof UserDto | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [visible, setVisible] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => setVisible(true), []);

  useEffect(() => {
    async function load() {
      if (!token) return;
      try {
        const id = await getUserId();
        setUserId(id);
        const data = await getUserById(id);
        setUser(data);
        setForm(data);
      } catch (err) {
        console.error(err);
      }
    }
    load();
  }, [token]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setForm((prev) => (prev ? { ...prev, [name]: value } : prev));
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      setForm((prev) => (prev ? { ...prev, profileImageUrl: result } : prev));
      setEditing('profileImageUrl');
    };
    reader.readAsDataURL(file);
  };

  const handleSave = async () => {
    if (!token || !userId || !form) return;
    try {
      const updated = await updateUser(userId, form);
      setUser(updated);
      setForm(updated);
      setEditing(null);
      window.dispatchEvent(new Event('userUpdated'));
    } catch (err) {
      console.error(err);
    }
  };

  const fields: { key: keyof UserDto; label: string; helper?: string }[] = [
    { key: 'email', label: 'Email address', helper: 'Where we send receipts and important updates.' },
    { key: 'username', label: 'Display name', helper: 'Shown on shared creations and community feeds.' },
    { key: 'phoneNumber', label: 'Phone number', helper: 'Optional. Enables faster support follow-ups.' },
  ];

  return (
    <div className={`${visible ? 'opacity-100' : 'opacity-0'} space-y-10 transition-opacity duration-300`}>
      {user && (
        <section className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-white/10 via-white/5 to-white/0 p-6 shadow-[0_35px_80px_-50px_rgba(168,85,247,0.6)] backdrop-blur xl:p-8">
          <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-gradient-to-br from-fuchsia-500/20 via-purple-500/20 to-cyan-400/20 blur-3xl" aria-hidden />
          <div className="relative flex flex-col items-center gap-6 text-center sm:flex-row sm:items-start sm:text-left">
            <div className="relative">
              <div className="relative flex h-28 w-28 items-center justify-center rounded-full border border-white/20 bg-black/40 p-1 shadow-inner shadow-purple-500/30">
                {(form?.profileImageUrl || user.profileImageUrl) ? (
                  <Image
                    src={form?.profileImageUrl || user.profileImageUrl || ''}
                    alt="Profile avatar"
                    fill
                    sizes="112px"
                    className="rounded-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center rounded-full bg-gradient-to-br from-purple-500/40 to-fuchsia-500/40 text-2xl font-semibold text-white">
                    {(user.username ?? 'U').slice(0, 1).toUpperCase()}
                  </div>
                )}
              </div>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="absolute -bottom-2 right-2 inline-flex items-center gap-1 rounded-full border border-white/20 bg-black/70 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.25em] text-gray-200 transition hover:border-fuchsia-400/40 hover:text-white"
              >
                <Pencil className="h-3.5 w-3.5" /> Edit
              </button>
              <input
                type="file"
                accept="image/*"
                ref={fileInputRef}
                className="hidden"
                onChange={handleImageChange}
              />
            </div>
            <div className="space-y-3">
              <div>
                <h2 className="text-2xl font-semibold text-white">{user.username ?? 'imagino.AI creator'}</h2>
                <p className="text-sm text-gray-300">{user.email}</p>
              </div>
              <p className="max-w-xl text-sm leading-relaxed text-gray-300">
                Personalize your presence across the imagino.AI ecosystem. Your details sync across web, mobile, and future device experiences.
              </p>
            </div>
          </div>
        </section>
      )}

      {user && (
        <section className="grid gap-6 md:grid-cols-2">
          {fields.map(field => (
            <div key={field.key} className="group relative overflow-hidden rounded-2xl border border-white/10 bg-black/40 p-5 shadow-inner shadow-purple-500/10 transition hover:border-fuchsia-400/40">
              <div className="absolute -right-12 top-1/2 h-32 w-32 -translate-y-1/2 rounded-full bg-gradient-to-br from-fuchsia-500/10 via-purple-500/10 to-cyan-400/10 blur-3xl" aria-hidden />
              <div className="relative flex items-start justify-between gap-3">
                <div className="flex-1 space-y-3">
                  <label className="text-xs font-semibold uppercase tracking-[0.3em] text-gray-400" htmlFor={field.key}>
                    {field.label}
                  </label>
                  {editing === field.key ? (
                    <input
                      id={field.key}
                      name={field.key}
                      value={form?.[field.key] ?? ''}
                      onChange={handleChange}
                      className="w-full rounded-xl border border-white/20 bg-black/60 px-4 py-3 text-sm text-white shadow-sm focus:border-fuchsia-400 focus:outline-none focus:ring-2 focus:ring-fuchsia-500/30"
                    />
                  ) : (
                    <p className="text-sm text-white/90">{user[field.key] ?? '—'}</p>
                  )}
                  {field.helper && <p className="text-xs text-gray-400">{field.helper}</p>}
                </div>
                <button
                  type="button"
                  onClick={() => setEditing(editing === field.key ? null : field.key)}
                  className="relative inline-flex h-9 items-center justify-center rounded-full border border-white/15 bg-white/5 px-3 text-xs font-semibold uppercase tracking-[0.3em] text-gray-200 transition hover:border-fuchsia-400/40 hover:text-white"
                >
                  <Pencil className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ))}
        </section>
      )}

      {editing && (
        <div className="flex flex-col gap-3 pt-4 sm:flex-row sm:items-center sm:justify-end">
          <button
            type="button"
            onClick={() => {
              setForm(user);
              setEditing(null);
            }}
            className="inline-flex items-center justify-center rounded-full border border-white/15 bg-transparent px-5 py-2 text-sm font-semibold text-gray-300 transition hover:border-white/25 hover:text-white"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="inline-flex items-center justify-center rounded-full bg-gradient-to-r from-fuchsia-500 via-purple-500 to-cyan-400 px-6 py-2 text-sm font-semibold text-white shadow-lg shadow-purple-500/30 transition hover:shadow-purple-500/50"
          >
            Save changes
          </button>
        </div>
      )}
    </div>
  );
}
