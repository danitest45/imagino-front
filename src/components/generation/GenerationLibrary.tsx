'use client';

import Link from 'next/link';
import { ArrowRight, Search, X } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../context/AuthContext';
import { cancelGeneration, generationHistory } from '../../lib/generation-api';
import { generationError } from '../../lib/generation';
import type { GenerationJob } from '../../types/generation';
import { AssetCard } from './GenerationPresentation';
import GenerationResult from './GenerationResult';
import StudioDialog from './StudioDialog';
import './studio.css';

/** Local review data only: supplying this fixture suppresses all API requests/actions. */
export interface LibraryPreview { jobs: GenerationJob[]; loading?: boolean; error?: string; authenticated?: boolean }

export default function GenerationLibrary({ preview }: { preview?: LibraryPreview }) {
  const { token, isAuthenticated } = useAuth();
  return <Library key={preview ? 'design-preview' : token ?? 'signed-out'} authenticated={preview?.authenticated ?? isAuthenticated} preview={preview} />;
}

function Library({ preview, authenticated }: { preview?: LibraryPreview; authenticated: boolean }) {
  const router = useRouter();
  const [jobs, setJobs] = useState<GenerationJob[]>(preview?.jobs.slice(0, 30) ?? []);
  const [loading, setLoading] = useState(preview?.loading ?? authenticated);
  const [error, setError] = useState<string | null>(preview?.error ?? null);
  const [revision, setRevision] = useState(0);
  const [query, setQuery] = useState('');
  const [model, setModel] = useState('all');
  const [status, setStatus] = useState('all');
  const [selected, setSelected] = useState<string | null>(null);
  const scope = useRef<AbortController | null>(null);
  useEffect(() => {
    if (preview || !authenticated) return;
    const controller = new AbortController();
    scope.current = controller;
    let timer: ReturnType<typeof setTimeout>;
    async function poll() {
      if (!document.hidden) {
        try {
          const result = await generationHistory(controller.signal);
          if (!controller.signal.aborted) { setJobs(result.slice(0, 30)); setError(null); }
        } catch (e) { if (!controller.signal.aborted) setError(generationError(e)); }
        finally { if (!controller.signal.aborted) setLoading(false); }
      }
      if (!controller.signal.aborted) timer = setTimeout(poll, 5000);
    }
    void poll();
    return () => { controller.abort(); clearTimeout(timer); };
  }, [preview, authenticated, revision]);
  const models = useMemo(() => Array.from(new Map(jobs.map(job => [job.modelId, job.displayName]))), [jobs]);
  const filtered = jobs.filter(job => (model === 'all' || job.modelId === model) && (status === 'all' || job.status === status) && `${job.prompt} ${job.displayName} ${job.status}`.toLocaleLowerCase('en-US').includes(query.trim().toLocaleLowerCase('en-US')));
  const selectedJob = jobs.find(job => job.id === selected);
  function continueWith(job: GenerationJob, action: 'reuse' | 'reference') {
    if (preview || !authenticated) return;
    // IDs convey intent; the destination reloads this job from owned history.
    router.push(`/create/${action === 'reference' ? 'image' : job.mediaType}?job=${encodeURIComponent(job.id)}&action=${action}`);
  }
  async function cancel(id: string) {
    if (preview || !authenticated) return;
    const controller = scope.current;
    if (!controller || controller.signal.aborted) return;
    await cancelGeneration(id, controller.signal);
    if (!controller.signal.aborted) { setRevision(value => value + 1); window.dispatchEvent(new Event('imagino-credits-changed')); }
  }
  function clearFilters() { setQuery(''); setModel('all'); setStatus('all'); }
  return <main className="studio-page library-page">
    <header className="studio-page-heading"><div><p className="eyebrow">Your work, ready to continue</p><h1>Library</h1><p className="muted">Choose a creation. Find its next direction.</p></div><Link href="/create/image" className="ui-button">Create an image<ArrowRight size={17} /></Link></header>
    {preview ? <p className="studio-preview-label">Design preview — sample data. Creation and download actions are disabled.</p> : null}
    {!authenticated ? <div className="library-empty"><span className="studio-frame-mark" aria-hidden="true" /><h2>Your work belongs here.</h2><p>Sign in to see your recent creations, review settings and prepare your next variation.</p><Link href="/login" className="ui-button">Sign in to view Library</Link></div> : <>
      <section className="library-filters" aria-label="Filter recent creations"><label className="library-search"><span className="sr-only">Search loaded creations</span><Search size={18} /><input type="search" className="ui-input" value={query} onChange={event => setQuery(event.target.value)} placeholder="Search prompts or models" /></label><label><span>Model</span><select className="ui-select" value={model} onChange={event => setModel(event.target.value)}><option value="all">All models</option>{models.map(([id, name]) => <option key={id} value={id}>{name}</option>)}</select></label><label><span>Status</span><select className="ui-select" value={status} onChange={event => setStatus(event.target.value)}><option value="all">All statuses</option>{['Queued', 'Starting', 'Processing', 'Completed', 'Failed', 'Cancelled'].map(value => <option key={value}>{value}</option>)}</select></label></section>
      <div className="library-scope"><p>Up to 30 recent jobs · search and filters apply to loaded results.</p><span role="status">{loading ? 'Loading…' : `${filtered.length} ${filtered.length === 1 ? 'creation' : 'creations'}`}</span></div>
      {error ? <div className="studio-notice error" role="alert"><strong>Your Library could not refresh.</strong><p>{error}</p>{jobs.length ? <p>Previously loaded results remain below.</p> : null}<button type="button" className="ui-button secondary" disabled={!!preview} onClick={() => { setLoading(true); setRevision(value => value + 1); }}>Try again</button></div> : null}
      {loading ? <div className="library-grid" aria-label="Loading Library">{Array.from({ length: 6 }, (_, index) => <div key={index} className="library-skeleton studio-skeleton" />)}</div> : jobs.length === 0 && !error ? <div className="library-empty"><span className="studio-frame-mark" aria-hidden="true" /><h2>A place for your possibilities.</h2><p>Your recent creations will appear here. Open the studio to begin with a prompt or a reference.</p><Link href="/create/image" className="ui-button">Explore the studio<ArrowRight size={16} /></Link></div> : jobs.length > 0 && !filtered.length ? <div className="library-empty"><Search size={32} /><h2>No creations match these filters.</h2><p>Try another word, model or status within your recent jobs.</p><button type="button" className="ui-button secondary" onClick={clearFilters}><X size={16} />Clear filters</button></div> : <div className="library-grid">{filtered.map(job => <AssetCard key={job.id} job={job} preview={!!preview} onOpen={() => setSelected(job.id)} />)}</div>}
    </>}
    <StudioDialog open={!!selectedJob} onClose={() => setSelected(null)} title="Your creation" wide>{selectedJob ? <GenerationResult key={selectedJob.id} job={selectedJob} onReuse={job => continueWith(job, 'reuse')} onReference={job => continueWith(job, 'reference')} onCancel={cancel} preview={!!preview} detail /> : null}</StudioDialog>
  </main>;
}
