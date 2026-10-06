import Link from 'next/link';
import { ArrowUpRight, CircleUserRound } from 'lucide-react';
import './account.css';

export function AccountSummary({ credits, loading = false, error, sample = false }: {
  credits: number | null;
  loading?: boolean;
  error?: string;
  sample?: boolean;
}) {
  return <section className="account-summary" aria-label="Account summary">
    <div className="account-identity">
      <span className="account-avatar"><CircleUserRound size={24} aria-hidden="true" /></span>
      <div><h2>{sample ? 'Sample account' : 'Signed in'}</h2><p>{sample ? 'Design preview — sample data' : 'Your Imagino workspace'}</p></div>
    </div>
    <div className="account-balance" aria-live="polite">
      <p className="eyebrow">Available credits</p>
      {error ? <p className="account-error" role="alert">{error}</p> : <p className="account-balance-value">{loading ? 'Loading…' : credits === null ? 'Unavailable' : credits.toLocaleString('en-US')}</p>}
      <p>{sample ? 'Demonstrative balance. No purchase or generation.' : 'Generation cost is shown in the studio before you create.'}</p>
      <Link href="/pricing" className="account-inline-link">How credits work <ArrowUpRight size={15} aria-hidden="true" /></Link>
    </div>
  </section>;
}
