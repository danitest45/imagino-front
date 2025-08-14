'use client';

import { useEffect, useState } from 'react';
import { Pencil } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { getUserId, getUserById } from '../../lib/api';
import type { UserDto } from '../../types/user';

export default function UserInfo() {
  const { token } = useAuth();
  const [user, setUser] = useState<UserDto | null>(null);
  const [form, setForm] = useState<UserDto | null>(null);
  const [editing, setEditing] = useState<keyof UserDto | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => setVisible(true), []);

  useEffect(() => {
    async function load() {
      if (!token) return;
      try {
        const id = await getUserId(token);
        const data = await getUserById(id, token);
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

  const fields: { key: keyof UserDto; label: string }[] = [
    { key: 'email', label: 'E-mail' },
    { key: 'profileImageUrl', label: 'URL da imagem' },
    { key: 'username', label: 'Nome de usuário' },
    { key: 'phoneNumber', label: 'Telefone' },
  ];

  return (
    <div
      className={`${
        visible ? 'opacity-100' : 'opacity-0'
      } transition-opacity duration-300 space-y-4`}
    >
      {user &&
        fields.map((f) => (
          <div key={f.key} className="space-y-1">
            <label className="block text-sm" htmlFor={f.key}>
              {f.label}
            </label>
            <div className="flex items-center space-x-2">
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
                onClick={() =>
                  setEditing(editing === f.key ? null : f.key)
                }
                className="text-gray-400 hover:text-white"
              >
                <Pencil className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
    </div>
  );
}
