'use client';

import { useEffect, useRef, useState } from 'react';
import { getCurrentUser, updateCurrentUserProfile, uploadCurrentUserAvatar } from '../../lib/api';
import type { UserDto } from '../../types/user';
import { Button, Input } from '../ui/StudioUI';
import { isAIStaging } from '../account/environment';
import { useAuth } from '../../context/AuthContext';

export default function UserInfo() {
  const { token } = useAuth();
  if (isAIStaging || !token) return null;
  return <UserInfoContent key={token} />;
}

function UserInfoContent() {
  const [user, setUser] = useState<UserDto | null>(null);
  const [form, setForm] = useState<UserDto | null>(null);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [retry, setRetry] = useState(0);
  const fileInput = useRef<HTMLInputElement | null>(null);
  const alive = useRef(true);

  useEffect(() => {
    alive.current = true;
    let canceled = false;
    setLoading(true);
    setError('');
    getCurrentUser().then(data => { if (!canceled) { setUser(data); setForm(data); } }).catch(() => { if (!canceled) setError('Your profile could not be loaded.'); }).finally(() => { if (!canceled) setLoading(false); });
    return () => { canceled = true; alive.current = false; };
  }, [retry]);

  async function handleSave(event: React.FormEvent) {
    event.preventDefault();
    if (isAIStaging || !form || saving || uploading) return;
    setSaving(true);
    setError('');
    setMessage('');
    try {
      const updated = await updateCurrentUserProfile({ username: form.username, phoneNumber: form.phoneNumber });
      if (alive.current) { setUser(updated); setForm(updated); setMessage('Profile updated.'); window.dispatchEvent(new Event('userUpdated')); }
    } catch { if (alive.current) setError('Your changes could not be saved. Please try again.'); }
    finally { if (alive.current) setSaving(false); }
  }

  async function handleImageChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (isAIStaging || !file || uploading || saving) return;
    setUploading(true);
    setError('');
    setMessage('');
    try {
      const imageUrl = await uploadCurrentUserAvatar(file);
      if (alive.current) {
        setUser(previous => previous ? { ...previous, profileImageUrl: imageUrl } : previous);
        setForm(previous => previous ? { ...previous, profileImageUrl: imageUrl } : previous);
        setMessage('Profile image updated.');
        window.dispatchEvent(new Event('userUpdated'));
      }
    } catch { if (alive.current) setError('Your profile image could not be updated.'); }
    finally { if (alive.current) setUploading(false); }
  }

  if (loading) return <p role="status">Loading your profile…</p>;
  if (!user || !form) return <div><p role="alert" className="account-error">{error || 'Profile unavailable.'}</p><Button variant="secondary" onClick={() => setRetry(value => value + 1)}>Retry profile</Button></div>;

  return <form className="account-profile-form" onSubmit={handleSave}>
    <div className="account-profile-avatar">
      {user.profileImageUrl && <img src={user.profileImageUrl} alt="Your profile image" width={72} height={72} />}
      <Button type="button" variant="secondary" disabled={uploading || saving} loading={uploading} onClick={() => fileInput.current?.click()}>Change profile image</Button>
      <input aria-label="Profile image" type="file" accept="image/*" ref={fileInput} hidden onChange={handleImageChange} />
    </div>
    <div className="account-field"><label htmlFor="profile-email">Email</label><Input id="profile-email" value={user.email || ''} readOnly /></div>
    <div className="account-field"><label htmlFor="profile-name">Display name</label><Input id="profile-name" value={form.username || ''} onChange={event => setForm({ ...form, username: event.target.value })} disabled={saving || uploading} /></div>
    <div className="account-field"><label htmlFor="profile-phone">Phone number</label><Input id="profile-phone" type="tel" value={form.phoneNumber || ''} onChange={event => setForm({ ...form, phoneNumber: event.target.value })} disabled={saving || uploading} /></div>
    {error && <p role="alert" className="account-error">{error}</p>}
    {message && <p role="status" className="account-success">{message}</p>}
    <div className="account-actions"><Button type="submit" loading={saving} disabled={saving || uploading}>Save changes</Button><Button type="button" variant="secondary" disabled={saving || uploading} onClick={() => setForm(user)}>Reset changes</Button></div>
  </form>;
}
