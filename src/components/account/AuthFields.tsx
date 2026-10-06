'use client';

import { useState } from 'react';
import { Eye, EyeOff, Lock, Mail } from 'lucide-react';
import { Input } from '../ui/StudioUI';

export function EmailField({ value, onChange, disabled = false }: {
  value: string; onChange: (value: string) => void; disabled?: boolean;
}) {
  return <div className="account-field">
    <label htmlFor="email">Email</label>
    <div className="account-input-wrap">
      <Mail className="account-input-icon" data-testid="email-icon" size={18} aria-hidden="true" />
      <Input id="email" name="email" type="email" value={value} onChange={event => onChange(event.target.value)} placeholder="Email" autoComplete="email" required disabled={disabled} />
    </div>
  </div>;
}

export function PasswordField({ value, onChange, id = 'password', label = 'Password', newPassword = false, disabled = false }: {
  value: string; onChange: (value: string) => void; id?: string; label?: string; newPassword?: boolean; disabled?: boolean;
}) {
  const [visible, setVisible] = useState(false);
  return <div className="account-field">
    <label htmlFor={id}>{label}</label>
    <div className="account-input-wrap account-input-wrap--password">
      <Lock className="account-input-icon" data-testid="password-icon" size={18} aria-hidden="true" />
      <Input id={id} name={id} type={visible ? 'text' : 'password'} value={value} onChange={event => onChange(event.target.value)} placeholder={label} autoComplete={newPassword ? 'new-password' : 'current-password'} required disabled={disabled} />
      <button className="account-password-toggle" type="button" aria-label={`${visible ? 'Hide' : 'Show'} ${label.toLowerCase()}`} aria-pressed={visible} onClick={() => setVisible(current => !current)}>
        {visible ? <EyeOff size={18} aria-hidden="true" /> : <Eye size={18} aria-hidden="true" />}
      </button>
    </div>
  </div>;
}
