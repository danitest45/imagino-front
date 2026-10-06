import Link from 'next/link';
import { AuthShell, UnavailableAccountAction } from '../../../components/account/AuthShell';
import { isAIStaging } from '../../../components/account/environment';

export default function CheckoutCancelPage() {
  if (isAIStaging) return <UnavailableAccountAction title="Purchases are unavailable here." description="This Preview does not offer a payment checkout." />;
  return <AuthShell title="Checkout was not completed." intro="You can return to costs or check your subscription in your account."><div className="account-actions"><Link href="/pricing" className="ui-button primary">Back to costs</Link><Link href="/profile" className="ui-button secondary">Open account</Link></div></AuthShell>;
}
