import Link from 'next/link';
import { ArrowUpRight, Check, LockKeyhole, RotateCcw } from 'lucide-react';
import './account.css';

export function CostsContent({ preview = false }: { preview?: boolean }) {
  return <div className="costs-content">
    <header className="costs-heading">
      <p className="eyebrow">Costs / Clear before you create</p>
      <h1>Make room for the next idea.<br /><span>Know what it costs.</span></h1>
      <p>Choose your model and settings. Review the credit quote. Then decide whether to create.</p>
    </header>
    <section className="costs-quote" aria-labelledby="costs-quote-heading">
      <div><p className="eyebrow">01 / Before you create</p><h2 id="costs-quote-heading">Your configuration.<br />Your quote.</h2></div>
      <div className="costs-quote-copy"><p>Cost depends on the selected model and its settings. The studio requests a current quote for your image before submission.</p><p>Changing the prompt, references, model or settings requires a new quote. A starting cost in the model selector is not a final quote.</p><Link href="/create/image" className="ui-button primary">Explore the studio <ArrowUpRight size={17} aria-hidden="true" /></Link></div>
    </section>
    <section className="costs-lifecycle" aria-labelledby="costs-lifecycle-heading">
      <div className="costs-section-title"><p className="eyebrow">02 / Follow your credits</p><h2 id="costs-lifecycle-heading">A visible status at every step.</h2></div>
      <div className="costs-status-grid">
        <article><LockKeyhole size={21} aria-hidden="true" /><h3>Reserved</h3><p>Credits are set aside when a generation is accepted. Reserved does not mean the image is finished.</p></article>
        <article><Check size={21} aria-hidden="true" /><h3>Charged</h3><p>The server has confirmed the credit charge. The job detail shows the recorded amount and status.</p></article>
        <article><RotateCcw size={21} aria-hidden="true" /><h3>Refunded</h3><p>The server has confirmed credits were returned. A network error alone does not confirm a refund.</p></article>
      </div>
    </section>
    {preview && <aside className="costs-availability"><div><p className="eyebrow">Current Preview</p><h2>Explore now. Purchases are unavailable.</h2></div><p>This environment does not offer subscriptions or credit purchases. Paid generation remains disabled. No final commercial plans are being offered in this Preview.</p></aside>}
    <section className="costs-faq" aria-labelledby="costs-faq-heading">
      <h2 id="costs-faq-heading">A few useful details.</h2>
      <details><summary>Can I see the cost before creating?</summary><p>Yes. The studio shows a current quote from the API before an available generation can be submitted. If a quote expires or your configuration changes, request a new quote.</p></details>
      <details><summary>What happens if a generation fails?</summary><p>Check the job&apos;s generation and credit statuses. A failed generation and a confirmed refund are distinct states; the interface reports what the server confirms.</p></details>
      <details><summary>Does every model use the same number of credits?</summary><p>No. Model and configuration affect the quote. Compare the current quote for the settings you intend to use.</p></details>
    </section>
  </div>;
}
