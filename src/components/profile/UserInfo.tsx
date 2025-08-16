'use client';

import { useEffect, useState, useRef } from 'react';
import Image from 'next/image';
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

  const fields: { key: keyof UserDto; label: string }[] = [
    { key: 'email', label: 'E-mail' },
    { key: 'username', label: 'Nome de usuário' },
    { key: 'phoneNumber', label: 'Telefone' },
  ];

  return (
    <div
      className={`${visible ? 'opacity-100' : 'opacity-0'} transition-opacity duration-300 space-y-8`}
    >
      {user && (
        <div className="flex items-center gap-6">
          <div className="relative w-24 h-24">
            {(form?.profileImageUrl || user.profileImageUrl) ? (
              <Image
                src={form?.profileImageUrl || user.profileImageUrl || ''}
                alt="Foto de perfil"
                width={96}
                height={96}
                className="w-24 h-24 rounded-full object-cover"
              />
            ) : (
              <div className="w-24 h-24 rounded-full bg-gray-700" />
            )}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="absolute bottom-0 right-0 bg-gray-800 p-1 rounded-full text-gray-400 hover:text-white"
            >
              <Pencil className="w-4 h-4" />
            </button>
            <input
              type="file"
              accept="image/*"
              ref={fileInputRef}
              className="hidden"
              onChange={handleImageChange}
            />
          </div>
          <div className="space-y-1">
            <p className="text-lg font-medium">{user.username ?? 'Usuário'}</p>
            <p className="text-sm text-gray-400">{user.email}</p>
          </div>
        </div>
      )}

      {user && (
        <div className="grid gap-6 sm:grid-cols-2">
          {fields.map((f) => (
            <div key={f.key} className="space-y-1">
              <label className="block text-sm" htmlFor={f.key}>
                {f.label}
              </label>
              <div className="flex items-center gap-2">
                {editing === f.key ? (
                  <input
                    id={f.key}
                    name={f.key}
                    value={form?.[f.key] ?? ''}
                    onChange={handleChange}
                    className="w-full bg-gray-900/40 border border-gray-700 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                ) : (
                  <p className="flex-1 truncate">{user[f.key] ?? ''}</p>
                )}
                <button
                  type="button"
                  onClick={() => setEditing(editing === f.key ? null : f.key)}
                  className="text-gray-400 hover:text-white"
                >
                  <Pencil className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {editing && (
        <div className="pt-4 flex justify-end">
          <button
            type="button"
            onClick={handleSave}
            className="px-4 py-2 bg-purple-600 rounded hover:bg-purple-700"
          >
            Salvar
          </button>
        </div>
      )}
    </div>
  );
}
