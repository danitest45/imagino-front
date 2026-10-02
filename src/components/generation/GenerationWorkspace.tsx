'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import type { GenerationInput, GenerationJob, GenerationModel, GenerationQuote, GenerationRequest } from '../../types/generation';
import { cancelGeneration, createGeneration, generationCatalog, generationHistory, quoteGeneration } from '../../lib/generation-api';
import { defaultGenerationSettings, generationConstraintError, generationError, prepareGenerationInput, terminalGeneration } from '../../lib/generation';
import GenerationResult from './GenerationResult';

export default function GenerationWorkspace({ kind }: { kind: 'image' | 'video' }) {
  const { isAuthenticated } = useAuth();
  const [models, setModels] = useState<GenerationModel[]>([]);
  const [selected, setSelected] = useState('');
  const [prompt, setPrompt] = useState('');
  const [settings, setSettings] = useState<Record<string, string | number>>({});
  const [inputs, setInputs] = useState<GenerationInput[]>([]);
  const [quoted, setQuoted] = useState<{ request: string; quote: GenerationQuote } | null>(null);
  const [jobs, setJobs] = useState<GenerationJob[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [preparing, setPreparing] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [quoteRevision, setQuoteRevision] = useState(0);
  const submission = useRef<{ request: string; key: string } | null>(null);
  const selectedRef = useRef('');
  const submitting = useRef(false);
  const model = models.find(m => m.id === selected);
  const request: GenerationRequest = { modelId: selected, prompt, settings, inputs };
  const requestJson = JSON.stringify(request);
  const constraintError = model ? generationConstraintError(model, request) : null;
  const quote = quoted?.request === requestJson ? quoted.quote : null;
  const ready = model?.availability === 'ready' || model?.availability === 'synthetic_demo';

  useEffect(() => {
    const controller = new AbortController();
    generationCatalog(controller.signal).then(all => {
      const applicable = all.filter(m => m.mediaType === kind);
      setModels(applicable);
      if (applicable[0]) {
        setSelected(applicable[0].id);
        selectedRef.current = applicable[0].id;
        setSettings(defaultGenerationSettings(applicable[0]));
      }
      setLoaded(true);
    }).catch(e => { if (!controller.signal.aborted) { setError(generationError(e)); setLoaded(true); } });
    return () => controller.abort();
  }, [kind]);

  const loadHistory = useCallback(async (signal?: AbortSignal) => {
    try {
      const history = await generationHistory(signal);
      if (!signal?.aborted) { setJobs(history.filter(j => j.mediaType === kind)); setHistoryError(null); }
    } catch (e) { if (!signal?.aborted) setHistoryError(generationError(e)); }
  }, [kind]);
  useEffect(() => {
    if (!isAuthenticated) { setJobs([]); return; }
    const controller = new AbortController();
    // A recursive timeout avoids overlapping fetches; pause while the tab is hidden.
    let timer: ReturnType<typeof setTimeout>;
    async function poll() {
      if (!document.hidden) await loadHistory(controller.signal);
      if (!controller.signal.aborted) timer = setTimeout(poll, 5000);
    }
    void poll();
    return () => { controller.abort(); clearTimeout(timer); };
  }, [isAuthenticated, loadHistory]);

  useEffect(() => {
    if (!isAuthenticated || !selected || model?.availability === 'deployment_pending' || !prompt.trim() || prompt.length > 2000 || constraintError || preparing) return;
    const controller = new AbortController();
    const timer = setTimeout(() => {
      quoteGeneration(JSON.parse(requestJson), controller.signal).then(value => {
        if (!controller.signal.aborted) setQuoted({ request: requestJson, quote: value });
      }).catch(e => { if (!controller.signal.aborted) setError(generationError(e)); });
    }, 450);
    return () => { controller.abort(); clearTimeout(timer); };
  }, [isAuthenticated, selected, model?.availability, prompt, requestJson, constraintError, preparing, quoteRevision]);
  useEffect(() => {
    if (!quoted) return;
    const timer = setTimeout(() => { setQuoted(null); setQuoteRevision(value => value + 1); }, Math.max(0, Date.parse(quoted.quote.expiresAt) - Date.now()));
    return () => clearTimeout(timer);
  }, [quoted]);

  function choose(next: GenerationModel) {
    selectedRef.current = next.id;
    setSelected(next.id);
    setSettings(defaultGenerationSettings(next));
    setInputs([]);
    setQuoted(null);
    setError(null);
  }
  async function upload(files: FileList | null, role: string, maxCount: number) {
    if (!files || !model) return;
    const selectedAtStart = model.id;
    setPreparing(true);
    setError(null);
    try {
      const remaining = maxCount - inputs.filter(i => i.role === role).length;
      if (files.length > remaining) throw new Error(`You can add ${remaining} more image(s) here.`);
      const prepared = await Promise.all(Array.from(files).map(file => prepareGenerationInput(file, role)));
      if (selectedRef.current === selectedAtStart) setInputs(previous => [...previous, ...prepared]);
    } catch (e) { setError(generationError(e)); }
    finally { setPreparing(false); }
  }
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!quote || !ready || !isAuthenticated || submitting.current) return;
    submitting.current = true;
    setBusy(true);
    setError(null);
    // Preserve the key after a network error: clicking again retrieves the same job.
    if (submission.current?.request !== requestJson) submission.current = { request: requestJson, key: crypto.randomUUID() };
    try {
      const job = await createGeneration({ ...request, quoteId: quote.quoteId }, submission.current.key);
      setJobs(previous => [job, ...previous.filter(j => j.id !== job.id)]);
      submission.current = null;
      window.dispatchEvent(new Event('imagino-credits-changed'));
    } catch (e) { setError(generationError(e)); }
    finally { setBusy(false); submitting.current = false; }
  }
  async function cancel(id: string) {
    const job = await cancelGeneration(id);
    setJobs(previous => previous.map(j => j.id === id ? job : j));
    window.dispatchEvent(new Event('imagino-credits-changed'));
  }
  function reuse(job: GenerationJob) {
    const original = models.find(m => m.id === job.modelId);
    if (original) {
      choose(original);
      setSettings(Object.fromEntries(original.fields.map(f => [f.key, f.type === 'integer' ? Number(job.settings[f.key] ?? f.defaultValue) : job.settings[f.key] ?? f.defaultValue])));
    }
    setPrompt(job.prompt);
    setInputs([]);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
  const previousStates = useRef<Record<string, string>>({});
  useEffect(() => {
    if (jobs.some(j => previousStates.current[j.id] && previousStates.current[j.id] !== j.status && terminalGeneration(j.status))) {
      window.dispatchEvent(new Event('imagino-credits-changed'));
    }
    previousStates.current = Object.fromEntries(jobs.map(j => [j.id, j.status]));
  }, [jobs]);

  return <main className="mx-auto max-w-7xl space-y-8 px-4 py-8 text-white md:px-8">
    <header className="flex flex-wrap items-center justify-between gap-4">
      <div><p className="text-sm text-purple-300">Imagino · Generation 2.0</p><h1 className="mt-1 text-3xl font-semibold">{kind === 'image' ? 'Image' : 'Video'} studio</h1><p className="mt-2 text-gray-400">Choose a creative tool, describe your idea, and review the credits before creating.</p></div>
      <nav aria-label="Creation type" className="flex gap-2"><Link className={`rounded-xl px-4 py-2 ${kind === 'image' ? 'bg-purple-500/30' : 'bg-white/5'}`} href="/create/image">Image</Link><Link className={`rounded-xl px-4 py-2 ${kind === 'video' ? 'bg-purple-500/30' : 'bg-white/5'}`} href="/create/video">Video</Link></nav>
    </header>
    <div className="grid items-start gap-6 lg:grid-cols-[340px_1fr]">
      <aside className="space-y-3" aria-label="Creative tools">
        {!loaded ? <p className="text-gray-400">Loading tools…</p> : null}
        {loaded && !models.length ? <p className="text-gray-400">The generation catalog is unavailable. Please try again later.</p> : null}
        {models.map(item => <button key={item.id} type="button" onClick={() => choose(item)} aria-pressed={selected === item.id}
          className={`w-full rounded-2xl border p-4 text-left transition ${selected === item.id ? 'border-purple-400 bg-purple-500/15' : 'border-white/10 bg-white/[0.03] hover:border-purple-400/50'}`}>
          <span className="flex justify-between gap-2"><strong>{item.displayName}</strong><span className="text-xs text-gray-400">from {item.startingCredits} cr</span></span>
          <span className="mt-2 block text-sm text-gray-400">{item.description}</span>
          <span className="mt-3 block text-xs text-purple-200">{item.availability === 'synthetic_demo' ? 'Synthetic staging demo' : item.availability === 'ready' ? 'Available' : item.availability === 'deployment_pending' ? 'Catalog preview · unavailable' : item.availability === 'disabled' ? 'Unavailable' : 'Awaiting activation'}</span>
        </button>)}
      </aside>
      <form onSubmit={submit} className="space-y-5 rounded-2xl border border-white/10 bg-white/[0.03] p-5 md:p-6">
        <label className="block text-sm font-medium" htmlFor="generation-prompt">{kind === 'image' ? 'Describe your image' : 'Describe your scene'}</label>
        <textarea id="generation-prompt" value={prompt} onChange={e => { setPrompt(e.target.value); setError(null); }} maxLength={2000} rows={5} required
          placeholder={kind === 'image' ? 'A ceramic coffee cup on a sunlit table, warm tones, soft window light…' : 'A slow camera move through a misty forest, morning light, birdsong…'}
          className="w-full resize-y rounded-xl border border-white/15 bg-gray-950/60 p-4 text-white outline-none focus:border-purple-400" />
        <p className="text-right text-xs text-gray-500">{prompt.length}/2000</p>
        {model ? <div className="grid gap-4 sm:grid-cols-3">{model.fields.map(field => <label key={field.key} className="space-y-2 text-sm">
          <span className="block text-gray-300">{field.label}</span>
          <select value={String(settings[field.key] ?? field.defaultValue)} onChange={e => { setSettings(previous => ({ ...previous, [field.key]: field.type === 'integer' ? Number(e.target.value) : e.target.value })); setError(null); }}
            className="w-full rounded-xl border border-white/15 bg-gray-950 p-3 outline-none focus:border-purple-400">
            {field.options.map(value => <option key={value} value={value}>{value}</option>)}
          </select>
        </label>)}</div> : null}
        {model?.capabilities.includes('nativeAudio') ? <p className="text-sm text-gray-400">Native audio is included. Describe dialogue, ambience or sound in your prompt.</p> : null}
        {model?.inputs.map(spec => <div key={spec.role} className="space-y-3 rounded-xl border border-dashed border-white/15 p-4">
          <label className="block space-y-2 text-sm"><span>{spec.label} <span className="text-gray-500">· optional, up to {spec.maxCount}</span></span>
            <input type="file" accept="image/png,image/jpeg,image/webp" multiple={spec.maxCount > 1} disabled={preparing}
              onChange={e => { upload(e.target.files, spec.role, spec.maxCount); e.target.value = ''; }} className="block w-full text-xs text-gray-300 file:mr-3 file:rounded-lg file:border-0 file:bg-purple-500/20 file:px-3 file:py-2 file:text-purple-100" /></label>
          <div className="flex flex-wrap gap-3">{inputs.map((input, index) => input.role === spec.role ? <div key={index} className="relative">
            <Image src={input.data} alt={`${spec.label} ${index + 1}`} width={80} height={80} unoptimized className="h-20 w-20 rounded-lg object-cover" />
            <button type="button" onClick={() => setInputs(previous => previous.filter((_, i) => i !== index))} aria-label={`Remove ${spec.label} ${index + 1}`} className="absolute right-0 top-0 rounded-full bg-black px-2 text-white">×</button>
          </div> : null)}</div>
          <p className="text-xs text-gray-500">Images are prepared at up to 1024 px. References can increase the credit cost.</p>
        </div>)}
        {constraintError ? <p role="alert" className="text-sm text-amber-200">{constraintError}</p> : null}
        {model?.availability === 'synthetic_demo' ? <p className="rounded-xl bg-amber-400/10 p-3 text-sm text-amber-100">This tool returns a fixed synthetic test image. It reserves 1 staging credit and returns it when you select the failure test.</p> : null}
        {model && !ready ? <p className="rounded-xl bg-purple-500/10 p-3 text-sm text-purple-100">{model.availability === 'deployment_pending' ? 'Generation is temporarily unavailable. You can explore this catalog preview and prepare your settings; no credits will be reserved.' : 'This model is configured for evaluation. Generations will be enabled after provider access and test spending are approved.'}</p> : null}
        {error ? <p role="alert" className="text-sm text-red-200">{error}</p> : null}
        <div className="flex flex-wrap items-center justify-between gap-4 border-t border-white/10 pt-5">
          <p aria-live="polite" className="text-sm text-gray-300">{preparing ? 'Preparing references…' : model?.availability === 'deployment_pending' ? 'Catalog preview · creation unavailable' : quote ? `${quote.credits} credits · reserved now, returned on failure` : isAuthenticated ? 'Enter a prompt to calculate credits' : 'Sign in to calculate credits and create'}</p>
          {isAuthenticated ? <button disabled={!quote || !ready || !!constraintError || busy || preparing} type="submit" className="rounded-xl bg-purple-500 px-6 py-3 font-semibold text-white hover:bg-purple-400 disabled:cursor-not-allowed disabled:opacity-40">{busy ? 'Submitting…' : 'Create'}</button> : <Link href="/login" className="rounded-xl bg-purple-500 px-6 py-3 font-semibold">Sign in</Link>}
        </div>
      </form>
    </div>
    <section className="space-y-4" aria-labelledby="generation-history-title"><h2 id="generation-history-title" className="text-xl font-semibold">Your recent creations</h2>
      {historyError ? <p role="alert" className="text-sm text-red-200">History could not refresh: {historyError}</p> : null}
      {!jobs.length ? <p className="text-sm text-gray-500">Your generations will appear here. You can leave and return while a job is processing.</p> : <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{jobs.map(job => <GenerationResult key={job.id} job={job} onReuse={reuse} onCancel={cancel} />)}</div>}
    </section>
  </main>;
}
