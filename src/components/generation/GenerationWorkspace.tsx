'use client';

import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight, Check, ChevronDown, ImagePlus, SlidersHorizontal, Type, Upload, X } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import type { GenerationInput, GenerationJob, GenerationModel, GenerationQuote, GenerationRequest } from '../../types/generation';
import { cancelGeneration, createGeneration, generationCatalog, generationDownload, generationHistory, quoteGeneration } from '../../lib/generation-api';
import { defaultGenerationSettings, generationConstraintError, generationError, prepareGenerationInput, terminalGeneration } from '../../lib/generation';
import GenerationResult from './GenerationResult';
import { AssetCard, modelAvailability } from './GenerationPresentation';
import StudioDialog from './StudioDialog';
import './studio.css';

/** Explicit presentation-only fixture. Supplying it suppresses ALL API requests,
 * downloads, submissions and cancellation. Inputs may use local /brand/ images.
 * Use a different React key to reset the fixture when switching review states. */
export interface StudioPreview {
  models: GenerationModel[];
  jobs?: GenerationJob[];
  modelId?: string;
  prompt?: string;
  settings?: Record<string, string | number>;
  inputs?: GenerationInput[];
  quote?: GenerationQuote;
  error?: string;
  historyError?: string;
  authenticated?: boolean;
  loading?: boolean;
  selectedJobId?: string;
}

export default function GenerationWorkspace({ kind, preview }: { kind: 'image' | 'video'; preview?: StudioPreview }) {
  const { token, isAuthenticated } = useAuth();
  // A different account gets a new private-state lifetime, including pending async work.
  return <Workspace key={preview ? 'design-preview' : `${kind}:${token ?? 'signed-out'}`} kind={kind} preview={preview} authenticated={preview?.authenticated ?? isAuthenticated} />;
}

function Workspace({ kind, preview, authenticated }: { kind: 'image' | 'video'; preview?: StudioPreview; authenticated: boolean }) {
  const initialModels = preview?.models.filter(m => m.mediaType === kind) ?? [];
  const initialModel = initialModels.find(m => m.id === preview?.modelId) ?? initialModels[0];
  const [models, setModels] = useState(initialModels);
  const [selected, setSelected] = useState(initialModel?.id ?? '');
  const [prompt, setPrompt] = useState(preview?.prompt ?? '');
  const [settings, setSettings] = useState<Record<string, string | number>>(preview?.settings ?? (initialModel ? defaultGenerationSettings(initialModel) : {}));
  const [inputs, setInputs] = useState<GenerationInput[]>(preview?.inputs ?? []);
  const [intent, setIntent] = useState<'prompt' | 'reference'>(preview?.inputs?.length ? 'reference' : 'prompt');
  const [jobs, setJobs] = useState<GenerationJob[]>(preview?.jobs ?? []);
  const [selectedJob, setSelectedJob] = useState(preview?.selectedJobId ?? preview?.jobs?.[0]?.id ?? '');
  const [error, setError] = useState<string | null>(preview?.error ?? null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [preparing, setPreparing] = useState(false);
  const [loaded, setLoaded] = useState(!!preview && !preview.loading);
  const [historyLoaded, setHistoryLoaded] = useState(!!preview);
  const [historyError, setHistoryError] = useState<string | null>(preview?.historyError ?? null);
  const [quoteLoading, setQuoteLoading] = useState(false);
  const [quoteRevision, setQuoteRevision] = useState(0);
  const [modelPicker, setModelPicker] = useState(false);
  const [pendingModel, setPendingModel] = useState<GenerationModel | null>(null);
  const [pendingReuse, setPendingReuse] = useState<GenerationJob | null>(null);
  const [clearReferences, setClearReferences] = useState(false);
  const [pendingReference, setPendingReference] = useState<GenerationJob | null>(null);
  const [ambiguousSubmit, setAmbiguousSubmit] = useState(false);
  const [referenceSource, setReferenceSource] = useState<string | null>(null);
  const scope = useRef<AbortController | null>(null);
  const selectedRef = useRef(selected);
  const preparingRef = useRef(false);
  const submitting = useRef(false);
  const routeActionHandled = useRef(false);
  const submission = useRef<{ request: string; key: string; payload: GenerationRequest } | null>(null);
  const previousStates = useRef<Record<string, string>>({});
  const model = models.find(m => m.id === selected);
  const request: GenerationRequest = { modelId: selected, prompt, settings, inputs };
  const requestJson = JSON.stringify(request);
  const [quoted, setQuoted] = useState<{ request: string; quote: GenerationQuote } | null>(preview?.quote ? { request: requestJson, quote: preview.quote } : null);
  const quote = quoted?.request === requestJson ? quoted.quote : null;
  const ready = model?.availability === 'ready' || model?.availability === 'synthetic_demo';
  const constraintError = model ? generationConstraintError(model, request) : null;
  const activeJob = jobs.find(job => job.id === selectedJob) ?? jobs[0];
  const canReplay = ambiguousSubmit && submission.current?.request === requestJson;

  useEffect(() => {
    const controller = new AbortController();
    scope.current = controller;
    if (!preview) {
      generationCatalog(controller.signal).then(all => {
        if (controller.signal.aborted) return;
        const applicable = all.filter(m => m.mediaType === kind);
        setModels(applicable);
        const first = applicable[0];
        if (first) { setSelected(first.id); selectedRef.current = first.id; setSettings(defaultGenerationSettings(first)); }
        setLoaded(true);
      }).catch(e => { if (!controller.signal.aborted) { setError(generationError(e)); setLoaded(true); } });
    }
    return () => controller.abort();
  }, [kind, preview]);

  const loadHistory = useCallback(async (signal: AbortSignal) => {
    try {
      const history = await generationHistory(signal);
      if (!signal.aborted) { setJobs(history.filter(j => j.mediaType === kind).slice(0, 30)); setHistoryError(null); setHistoryLoaded(true); }
    } catch (e) { if (!signal.aborted) { setHistoryError(generationError(e)); setHistoryLoaded(true); } }
  }, [kind]);
  useEffect(() => {
    if (preview || !authenticated) return;
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout>;
    async function poll() {
      if (!document.hidden) await loadHistory(controller.signal);
      if (!controller.signal.aborted) timer = setTimeout(poll, 5000);
    }
    void poll();
    return () => { controller.abort(); clearTimeout(timer); };
  }, [authenticated, loadHistory, preview]);

  useEffect(() => {
    if (preview || !authenticated || !ready || !prompt.trim() || prompt.length > 2000 || constraintError || preparing || canReplay) { setQuoteLoading(false); return; }
    const controller = new AbortController();
    setQuoteLoading(true);
    const timer = setTimeout(() => {
      quoteGeneration(JSON.parse(requestJson), controller.signal).then(value => {
        if (!controller.signal.aborted) { setQuoted({ request: requestJson, quote: value }); setError(null); }
      }).catch(e => { if (!controller.signal.aborted) { setQuoted(null); setError(generationError(e)); } })
        .finally(() => { if (!controller.signal.aborted) setQuoteLoading(false); });
    }, 450);
    return () => { controller.abort(); clearTimeout(timer); };
  }, [authenticated, ready, prompt, requestJson, constraintError, preparing, quoteRevision, preview, canReplay]);
  useEffect(() => {
    if (!quoted || preview) return;
    const timer = setTimeout(() => { setQuoted(null); setQuoteRevision(value => value + 1); setNotice('The previous quote expired. Calculating the current cost.'); }, Math.max(0, Date.parse(quoted.quote.expiresAt) - Date.now()));
    return () => clearTimeout(timer);
  }, [quoted, preview]);

  function changeModel(next: GenerationModel) {
    selectedRef.current = next.id;
    setSelected(next.id);
    setSettings(defaultGenerationSettings(next));
    setInputs([]);
    setReferenceSource(null);
    setIntent(next.inputs.length && pendingReference ? 'reference' : 'prompt');
    setQuoted(null);
    setError(null);
    setModelPicker(false);
    setPendingModel(null);
    setNotice('Model changed. Your prompt is kept; settings were reset for this model.');
    if (pendingReference) { const job = pendingReference; setPendingReference(null); void addReference(job, next, []); }
  }
  function choose(next: GenerationModel) {
    if (busy || preparing) return;
    if (next.id === selected) { setModelPicker(false); return; }
    if (inputs.length || (model && JSON.stringify(settings) !== JSON.stringify(defaultGenerationSettings(model)))) setPendingModel(next);
    else changeModel(next);
  }
  async function upload(files: FileList | null, role: string, maxCount: number) {
    if (!files || !model || preparingRef.current || busy || preview) return;
    const controller = scope.current;
    if (!controller || controller.signal.aborted) return;
    const selectedAtStart = model.id;
    preparingRef.current = true;
    setPreparing(true);
    setQuoted(null);
    setError(null);
    try {
      const remaining = maxCount - inputs.filter(i => i.role === role).length;
      if (files.length > remaining) throw new Error(`You can add ${remaining} more image(s) here.`);
      const prepared = await Promise.all(Array.from(files).map(file => prepareGenerationInput(file, role)));
      if (!controller.signal.aborted && selectedRef.current === selectedAtStart) setInputs(previous => [...previous, ...prepared]);
    } catch (e) { if (!controller.signal.aborted && selectedRef.current === selectedAtStart) setError(generationError(e)); }
    finally { preparingRef.current = false; if (!controller.signal.aborted) setPreparing(false); }
  }
  async function addReference(job: GenerationJob, target = model, currentInputs = inputs) {
    if (preview || !authenticated || preparingRef.current || busy) return;
    // Jobs come only from the authenticated history/result; no arbitrary URL is fetched.
    if (job.status !== 'Completed' || job.mediaType !== 'image' || !jobs.some(j => j.id === job.id)) return;
    const spec = target?.inputs.find(input => input.role === 'reference');
    if (!target || !spec) {
      setPendingReference(job);
      setNotice('Choose a model that accepts reference images to continue. Your current work is kept until you confirm a change.');
      setModelPicker(true);
      return;
    }
    if (currentInputs.filter(input => input.role === spec.role).length >= spec.maxCount) { setError('Remove a reference before adding another. Your existing inputs are unchanged.'); return; }
    const controller = scope.current;
    if (!controller || controller.signal.aborted) return;
    const selectedAtStart = target.id;
    preparingRef.current = true;
    setPreparing(true);
    setQuoted(null);
    setError(null);
    try {
      const blob = await generationDownload(job.id, controller.signal);
      if (controller.signal.aborted || selectedRef.current !== selectedAtStart) return;
      const prepared = await prepareGenerationInput(new File([blob], 'imagino-reference', { type: blob.type }), spec.role);
      if (controller.signal.aborted || selectedRef.current !== selectedAtStart) return;
      setInputs(previous => [...previous, prepared]);
      setIntent('reference');
      setReferenceSource(`${job.displayName} · selected creation`);
      setNotice('Reference prepared from your creation. Review your prompt and the new quote before creating.');
      document.getElementById('generation-prompt')?.focus();
    } catch (e) { if (!controller.signal.aborted && selectedRef.current === selectedAtStart) setError(`Reference could not be prepared. ${generationError(e)} Your form is unchanged.`); }
    finally { preparingRef.current = false; if (!controller.signal.aborted) setPreparing(false); }
  }
  function reuse(job: GenerationJob) {
    if (preview || busy || preparing) return;
    if (inputs.length || (model && JSON.stringify(settings) !== JSON.stringify(defaultGenerationSettings(model)))) {
      setPendingReuse(job);
      return;
    }
    restoreJob(job);
  }
  function restoreJob(job: GenerationJob) {
    if (preview || busy || preparing) return;
    const original = models.find(m => m.id === job.modelId);
    if (!original) { setError('The original model is not in the current catalog. Your form is unchanged.'); return; }
    selectedRef.current = original.id;
    setSelected(original.id);
    setSettings(Object.fromEntries(original.fields.map(field => {
      const previous = String(job.settings[field.key] ?? field.defaultValue);
      const supported = field.options.includes(previous) ? previous : field.defaultValue;
      return [field.key, field.type === 'integer' ? Number(supported) : supported];
    })));
    setPrompt(job.prompt);
    setInputs([]);
    setReferenceSource(null);
    setIntent('prompt');
    setQuoted(null);
    setError(null);
    setNotice('Prompt and supported settings restored. Original reference files are not included.');
    setPendingReuse(null);
    document.getElementById('generation-prompt')?.focus();
  }
  // Cross-route reuse carries only an opaque ID/action. Reload the owned job first.
  const routeHandlers = useRef({ reuse, addReference });
  routeHandlers.current = { reuse, addReference };
  useEffect(() => {
    if (preview || !authenticated || !loaded || !historyLoaded || historyError || routeActionHandled.current) return;
    const params = new URLSearchParams(window.location.search);
    const id = params.get('job');
    const action = params.get('action');
    if (!id || !['reuse', 'reference'].includes(action ?? '')) return;
    routeActionHandled.current = true;
    const job = jobs.find(value => value.id === id);
    if (!job) setError('This creation is not available in your 30 recent jobs. Open a creation from your Library.');
    else if (action === 'reuse') routeHandlers.current.reuse(job);
    else void routeHandlers.current.addReference(job);
    params.delete('job'); params.delete('action');
    window.history.replaceState(null, '', `${window.location.pathname}${params.size ? `?${params}` : ''}`);
    // This guarded effect waits until catalog and owned history are both available.
  }, [authenticated, loaded, historyLoaded, historyError, jobs, preview]);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (preview || (!quote && !canReplay) || !ready || !authenticated || submitting.current || preparing || constraintError) return;
    const controller = scope.current;
    if (!controller || controller.signal.aborted) return;
    submitting.current = true;
    setBusy(true);
    setError(null);
    // Ambiguous retries replay both the exact original payload and idempotency key.
    if (submission.current?.request !== requestJson) {
      if (!quote || Date.parse(quote.expiresAt) <= Date.now()) { submitting.current = false; setBusy(false); setQuoted(null); setQuoteRevision(v => v + 1); return; }
      submission.current = { request: requestJson, key: crypto.randomUUID(), payload: { ...request, quoteId: quote.quoteId } };
    }
    try {
      const pending = submission.current;
      const job = await createGeneration(pending.payload, pending.key, controller.signal);
      if (controller.signal.aborted) return;
      setJobs(previous => [job, ...previous.filter(j => j.id !== job.id)].slice(0, 30));
      setSelectedJob(job.id);
      submission.current = null;
      setAmbiguousSubmit(false);
      setNotice('Job submitted. Its status will update here.');
      window.dispatchEvent(new Event('imagino-credits-changed'));
    } catch (e) {
      if (!controller.signal.aborted) {
        const status = e && typeof e === 'object' && 'status' in e ? Number(e.status) : 0;
        const ambiguous = !status || status >= 500;
        setAmbiguousSubmit(ambiguous);
        if (!ambiguous) submission.current = null;
        setError(`${generationError(e)}${ambiguous ? ' The submission outcome is unknown. Check submission to recover the same job; this does not create another request.' : ''}`);
      }
    } finally { if (!controller.signal.aborted) { setBusy(false); submitting.current = false; } }
  }
  async function cancel(id: string) {
    if (preview || !authenticated) return;
    const controller = scope.current;
    if (!controller || controller.signal.aborted) return;
    const job = await cancelGeneration(id, controller.signal);
    if (!controller.signal.aborted) { setJobs(previous => previous.map(j => j.id === id ? job : j)); window.dispatchEvent(new Event('imagino-credits-changed')); }
  }
  useEffect(() => {
    if (!preview && jobs.some(j => previousStates.current[j.id] && previousStates.current[j.id] !== `${j.status}:${j.creditState}` && terminalGeneration(j.status))) window.dispatchEvent(new Event('imagino-credits-changed'));
    previousStates.current = Object.fromEntries(jobs.map(j => [j.id, `${j.status}:${j.creditState}`]));
  }, [jobs, preview]);

  return <main className="studio-page">
    <header className="studio-page-heading"><div><p className="eyebrow">Your creative workspace</p><h1>{kind === 'image' ? 'Make room for your next idea.' : 'Video studio'}</h1><p className="muted">{kind === 'image' ? 'Start with a thought. Or take a reference somewhere new.' : 'Video generation is not available in this preview.'}</p></div><Link href="/library" className="ui-button secondary">Open Library<ArrowRight size={16} /></Link></header>
    {preview ? <p className="studio-preview-label">Design preview — sample data. Creation and download actions are disabled.</p> : null}
    <div className="studio-layout">
      <form onSubmit={submit} className="studio-controls" aria-label="Create image controls">
        <fieldset disabled={busy || preparing} className="studio-control-fields">
          <div className="studio-section-heading"><h2>{kind === 'image' ? 'Create an image' : 'Explore video settings'}</h2><span className="studio-step">01 / INPUT</span></div>
          <div className="studio-intent" aria-label="Starting point"><button type="button" aria-pressed={intent === 'prompt'} onClick={() => { if (inputs.length) setClearReferences(true); else setIntent('prompt'); }}><Type size={16} />From a prompt</button><button type="button" aria-pressed={intent === 'reference'} disabled={!model?.inputs.length} onClick={() => setIntent('reference')}><ImagePlus size={16} />With a reference</button></div>
          {intent === 'reference' && model?.inputs.map(spec => <div key={spec.role} className="studio-reference-area">
            <div className="studio-field-label"><span>{spec.label}</span><span>{inputs.filter(i => i.role === spec.role).length}/{spec.maxCount}</span></div>
            {inputs.some(input => input.role === spec.role) ? <div className="studio-reference-grid">{inputs.map((input, index) => input.role === spec.role ? <div key={index} className="studio-reference-thumb"><Image src={input.data} alt={`${spec.label} ${index + 1}`} width={128} height={128} unoptimized /><button type="button" className="studio-remove-reference" aria-label={`Remove ${spec.label} ${index + 1}`} onClick={() => { setInputs(previous => previous.filter((_, i) => i !== index)); setQuoted(null); }}><X size={14} /></button></div> : null)}</div> : null}
            <label className="studio-upload"><Upload size={19} /><span>Add {inputs.length ? 'another image' : 'a reference image'}</span><input type="file" aria-label={`Upload ${spec.label}`} accept="image/png,image/jpeg,image/webp" multiple={spec.maxCount > 1} disabled={!!preview || preparing || inputs.filter(i => i.role === spec.role).length >= spec.maxCount} onChange={e => { void upload(e.target.files, spec.role, spec.maxCount); e.target.value = ''; }} /><small>PNG, JPEG or WebP · up to 10 MB</small></label>
            <p className="studio-help">Prepared at up to 1024 px. Reference inputs can change the cost.</p>
          </div>)}
          {referenceSource ? <p className="studio-reference-source">Source: {referenceSource}</p> : null}
          <label className="studio-field-label" htmlFor="generation-prompt">{intent === 'reference' ? 'Where do you want to take it?' : 'Describe your idea'}</label>
          <textarea className="ui-textarea studio-prompt" id="generation-prompt" value={prompt} onChange={e => { setPrompt(e.target.value); setError(null); }} maxLength={2000} rows={5} required placeholder="A product in warm afternoon light, soft shadows, a little room for imagination…" aria-describedby="prompt-help" />
          <div className="studio-prompt-help" id="prompt-help"><span>Describe the scene, light and mood.</span><span>{prompt.length}/2000</span></div>
          <div className="studio-control-divider" />
          <div className="studio-section-heading"><label className="studio-field-label" id="model-label">Model</label><span className="studio-step">02 / SETTINGS</span></div>
          <button className="studio-model-trigger" type="button" onClick={() => setModelPicker(true)} disabled={!loaded || !models.length} aria-labelledby="model-label current-model" aria-haspopup="dialog"><span><strong id="current-model">{model?.displayName ?? (loaded ? 'Catalog unavailable' : 'Loading models…')}</strong><small>{model ? modelAvailability(model) : 'Please wait'}</small></span><ChevronDown size={18} /></button>
          {model ? <div className="studio-settings">{model.fields.map(field => <label key={field.key}><span>{field.label}</span><select className="ui-select" value={String(settings[field.key] ?? field.defaultValue)} onChange={e => { setSettings(previous => ({ ...previous, [field.key]: field.type === 'integer' ? Number(e.target.value) : e.target.value })); setError(null); }}>{field.options.map(value => <option key={value} value={value}>{value}</option>)}</select></label>)}</div> : null}
          {model ? <details className="studio-model-details"><summary><SlidersHorizontal size={15} />Model & settings</summary><p>{model.description}</p><dl><div><dt>Underlying model</dt><dd>{model.providerModel}</dd></div><div><dt>Starting cost</dt><dd>From {model.startingCredits} credits</dd></div></dl><p className="studio-help">Starting cost is a catalog estimate. Only a current server quote can authorize creation.</p>{model.capabilities.includes('nativeAudio') ? <p>Native audio is included. Describe sounds in your prompt.</p> : null}</details> : null}
        </fieldset>
        {constraintError ? <p role="alert" className="studio-notice">{constraintError}</p> : null}
        {model && !ready ? <p className="studio-notice">{model.retirementAt ? 'This video model needs an update before generation can be enabled.' : 'Generation is unavailable for this model. You can prepare an idea and explore its controls.'} No credits will be reserved.</p> : null}
        {model?.availability === 'synthetic_demo' ? <p className="studio-notice">This staging tool returns a fixed synthetic image. It is a pipeline test, not an AI generation.</p> : null}
        {error ? <p role="alert" className="studio-notice error">{error}</p> : null}
        {notice ? <p role="status" className="studio-notice success">{notice}</p> : null}
        <div className="studio-create-action"><div className="studio-cost" aria-live="polite"><span>{preview ? 'Sample quote' : 'Current cost'}</span><strong>{preparing ? 'Preparing…' : quoteLoading ? 'Calculating…' : quote ? `${quote.credits} credits` : '—'}</strong></div><p className="studio-help">{!authenticated ? 'Sign in to calculate the cost and create.' : !ready ? 'Creation is currently unavailable.' : quote ? 'Credits are reserved when you submit.' : prompt.trim() ? 'A current quote is required before creating.' : 'Add a prompt to calculate your cost.'}</p>
          {authenticated ? <button disabled={!!preview || (!quote && !canReplay) || !ready || !!constraintError || busy || preparing} type="submit" className="ui-button studio-create-button">{busy ? 'Submitting…' : canReplay ? 'Check submission' : `Create ${kind}${quote ? ` · ${quote.credits} credits` : ''}`}<ArrowRight size={18} /></button> : <Link href="/login" className="ui-button studio-create-button">Sign in to create<ArrowRight size={18} /></Link>}
        </div>
      </form>
      <section className="studio-output" aria-label="Creation result">
        {activeJob ? <GenerationResult key={activeJob.id} job={activeJob} onReuse={reuse} onReference={job => void addReference(job)} onCancel={cancel} preview={!!preview} /> : <div className="studio-empty-canvas"><div className="studio-empty-top"><span className="eyebrow">Room to create</span><span className="studio-step">03 / RESULT</span></div><div className="studio-empty-content"><span className="studio-frame-mark" aria-hidden="true" /><h2>Your next idea starts here.</h2><p>Write a prompt or add a reference.<br />Your image will have this space to itself.</p><span className="studio-empty-caption">Reference → create → choose → continue</span></div><p className="studio-empty-bottom">One image. A new direction.</p></div>}
        <div className="studio-recents-heading"><h2>Recent creations</h2><Link href="/library">View Library<ArrowRight size={15} /></Link></div>
        {historyError ? <p role="alert" className="studio-notice error">History could not refresh: {historyError}</p> : !authenticated ? <p className="studio-help">Sign in to see your recent creations.</p> : !historyLoaded ? <div className="studio-skeleton" role="status">Loading recent creations…</div> : !jobs.length ? <p className="studio-help">Your recent jobs will appear here. Choose an image to prepare your next variation.</p> : <div className="studio-recents">{jobs.slice(0, 8).map(job => <AssetCard key={job.id} job={job} compact selected={activeJob?.id === job.id} onOpen={() => setSelectedJob(job.id)} preview={!!preview} />)}</div>}
      </section>
    </div>
    <StudioDialog open={modelPicker} onClose={() => { setModelPicker(false); setPendingReference(null); }} title={pendingReference ? 'Choose a reference-capable model' : 'Choose your model'}><p className="studio-help">One workspace, different ways to create. Availability and starting costs come from the catalog.</p><div className="studio-model-options">{models.filter(item => !pendingReference || item.inputs.some(input => input.role === 'reference')).map(item => <button type="button" key={item.id} className={`studio-model-option${selected === item.id ? ' is-selected' : ''}`} onClick={() => choose(item)}><span><strong>{item.displayName}</strong>{selected === item.id ? <Check size={18} /> : null}</span><p>{item.description}</p><span className="studio-model-option-meta">{modelAvailability(item)}<span>From {item.startingCredits} cr</span></span></button>)}</div>{pendingReference && !models.some(item => item.inputs.some(input => input.role === 'reference')) ? <p className="studio-notice">No reference-capable image model is in the current catalog.</p> : null}</StudioDialog>
    <StudioDialog open={!!pendingModel} onClose={() => setPendingModel(null)} title="Change model?"><p>Switching to {pendingModel?.displayName} will remove current references and reset model settings. Your prompt will stay.</p><div className="studio-dialog-actions"><button type="button" className="ui-button secondary" onClick={() => setPendingModel(null)}>Keep current model</button><button type="button" className="ui-button" onClick={() => { if (pendingModel) changeModel(pendingModel); }}>Change model</button></div></StudioDialog>
    <StudioDialog open={!!pendingReuse} onClose={() => setPendingReuse(null)} title="Replace your current setup?"><p>Reusing this creation replaces your prompt and settings and removes current reference inputs. Original reference files are not included in job history.</p><div className="studio-dialog-actions"><button type="button" className="ui-button secondary" onClick={() => setPendingReuse(null)}>Keep current setup</button><button type="button" className="ui-button" onClick={() => { if (pendingReuse) restoreJob(pendingReuse); }}>Reuse this setup</button></div></StudioDialog>
    <StudioDialog open={clearReferences} onClose={() => setClearReferences(false)} title="Start from a prompt?"><p>This removes the reference inputs from the current form. Your prompt and model settings will stay.</p><div className="studio-dialog-actions"><button type="button" className="ui-button secondary" onClick={() => setClearReferences(false)}>Keep references</button><button type="button" className="ui-button" onClick={() => { setInputs([]); setIntent('prompt'); setQuoted(null); setReferenceSource(null); setClearReferences(false); }}>Remove references</button></div></StudioDialog>
  </main>;
}
