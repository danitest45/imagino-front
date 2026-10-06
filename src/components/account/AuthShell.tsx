import type { ReactNode } from 'react';
import Link from 'next/link';
import { ArrowLeft, ArrowUpRight } from 'lucide-react';
import './account.css';

export function AuthShell({ title, intro, children, wide = false }: {
  title: string;
  intro?: ReactNode;
  children: ReactNode;
  wide?: boolean;
}) {
  return (
    <div className={`account-shell${wide ? ' account-shell--wide' : ''}`}>
      <div className="account-card">
        <header className="account-heading">
          <p className="eyebrow">Imagino / AI Creative Workspace</p>
          <h1>{title}</h1>
          {intro && <div className="account-intro">{intro}</div>}
        </header>
        {children}
      </div>
      <Link className="account-back" href="/"><ArrowLeft size={16} aria-hidden="true" /> Back to Imagino</Link>
    </div>
  );
}

export function UnavailableAccountAction({ title, description }: { title: string; description: string }) {
  return (
    <AuthShell title={title} intro={description}>
      <div className="account-notice">
        <strong>Preview availability</strong>
        <p>This environment supports sign in with an existing account. Account registration, recovery, profile editing and purchases are unavailable here.</p>
      </div>
      <div className="account-actions">
        <Link href="/login" className="ui-button primary">Sign in <ArrowUpRight size={16} aria-hidden="true" /></Link>
        <Link href="/create/image" className="ui-button secondary">Explore the studio</Link>
      </div>
    </AuthShell>
  );
}
