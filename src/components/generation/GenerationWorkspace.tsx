"use client";

import Image from "next/image";
import Link from "next/link";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  ChevronDown,
  ImagePlus,
  SlidersHorizontal,
  Upload,
  X,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import type {
  GenerationInput,
  GenerationJob,
  GenerationModel,
  GenerationQuote,
  GenerationRequest,
} from "../../types/generation";
import {
  cancelGeneration,
  createGeneration,
  generationCatalog,
  generationDownload,
  generationHistory,
  quoteGeneration,
} from "../../lib/generation-api";
import {
  defaultGenerationSettings,
  generationConstraintError,
  generationError,
  prepareGenerationInput,
  terminalGeneration,
} from "../../lib/generation";
import GenerationResult from "./GenerationResult";
import { AssetCard, AssetMediaFilter, modelAvailability } from "./GenerationPresentation";
import StudioDialog from "./StudioDialog";
import { Select } from "../ui/StudioUI";
import { ScrollRegion } from "../ui/ScrollRegion";
import { generationModelPresentation, isGenerationModelReady, planGenerationModelChange } from "../../lib/generation-models";
import { assetMediaFilters, catalogSupportsAnimate, catalogSupportsReference, filterAssets, type AssetMediaFilter as MediaFilter } from "../../lib/generation-assets";
import "./studio.css";
import "./creative-workspace.css";

// The full catalog browser is needed only after the user opens it.
const ModelPicker = dynamic(() => import("./ModelPicker"), { ssr: false });

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
  modelPickerOpen?: boolean;
  onKindChange?: (kind: "image" | "video") => void;
  onOpenAssets?: () => void;
}

export default function GenerationWorkspace({
  kind,
  preview,
}: {
  kind: "image" | "video";
  preview?: StudioPreview;
}) {
  const { token, isAuthenticated } = useAuth();
  // A different account gets a new private-state lifetime, including pending async work.
  return (
    <Workspace
      key={preview ? `design-preview:${kind}` : `${kind}:${token ?? "signed-out"}`}
      kind={kind}
      preview={preview}
      authenticated={preview?.authenticated ?? isAuthenticated}
    />
  );
}

function Workspace({
  kind,
  preview,
  authenticated,
}: {
  kind: "image" | "video";
  preview?: StudioPreview;
  authenticated: boolean;
}) {
  const router = useRouter();
  const initialModels =
    preview?.models.filter((m) => m.mediaType === kind) ?? [];
  const initialModel =
    initialModels.find((m) => m.id === preview?.modelId) ?? initialModels[0];
  const [models, setModels] = useState(initialModels);
  const [catalogModels, setCatalogModels] = useState(preview?.models ?? []);
  const [selected, setSelected] = useState(initialModel?.id ?? "");
  const [prompt, setPrompt] = useState(preview?.prompt ?? "");
  const [settings, setSettings] = useState<Record<string, string | number>>(
    preview?.settings ??
      (initialModel ? defaultGenerationSettings(initialModel) : {}),
  );
  const [inputs, setInputs] = useState<GenerationInput[]>(
    preview?.inputs ?? [],
  );
  const [jobs, setJobs] = useState<GenerationJob[]>(preview?.jobs ?? []);
  const [mediaFilter, setMediaFilter] = useState<MediaFilter>("all");
  const [selectedJob, setSelectedJob] = useState(
    preview?.selectedJobId ?? preview?.jobs?.[0]?.id ?? "",
  );
  const [error, setError] = useState<string | null>(preview?.error ?? null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [preparing, setPreparing] = useState(false);
  const [loaded, setLoaded] = useState(!!preview && !preview.loading);
  const [historyLoaded, setHistoryLoaded] = useState(!!preview);
  const [historyError, setHistoryError] = useState<string | null>(
    preview?.historyError ?? null,
  );
  const [quoteLoading, setQuoteLoading] = useState(false);
  const [quoteRevision, setQuoteRevision] = useState(0);
  const [modelPicker, setModelPicker] = useState(!!preview?.modelPickerOpen);
  const [referenceOnly, setReferenceOnly] = useState(false);
  const modelPickerTrigger = useRef<HTMLButtonElement>(null);
  const modelPickerOpener = useRef<HTMLElement | null>(null);
  const [pendingModel, setPendingModel] = useState<GenerationModel | null>(
    null,
  );
  const [pendingReuse, setPendingReuse] = useState<GenerationJob | null>(null);
  const [pendingNavigation, setPendingNavigation] = useState<{ job: GenerationJob; action: "reuse" | "reference" | "animate" } | null>(null);
  const [pendingReference, setPendingReference] =
    useState<GenerationJob | null>(null);
  const [ambiguousSubmit, setAmbiguousSubmit] = useState(false);
  const [referenceSource, setReferenceSource] = useState<string | null>(null);
  const scope = useRef<AbortController | null>(null);
  const selectedRef = useRef(selected);
  const preparingRef = useRef(false);
  const submitting = useRef(false);
  const routeActionHandled = useRef(false);
  const submission = useRef<{
    request: string;
    key: string;
    payload: GenerationRequest;
  } | null>(null);
  const previousStates = useRef<Record<string, string>>({});
  const model = models.find((m) => m.id === selected);
  const request: GenerationRequest = {
    modelId: selected,
    prompt,
    settings,
    inputs,
  };
  const requestJson = JSON.stringify(request);
  const [quoted, setQuoted] = useState<{
    request: string;
    quote: GenerationQuote;
  } | null>(
    preview?.quote ? { request: requestJson, quote: preview.quote } : null,
  );
  const quote = quoted?.request === requestJson ? quoted.quote : null;
  const ready = !!model && isGenerationModelReady(model);
  const constraintError = model
    ? generationConstraintError(model, request)
    : null;
  const currentMediaFilter = assetMediaFilters(jobs).includes(mediaFilter) ? mediaFilter : "all";
  const visibleJobs = filterAssets(jobs, { media: currentMediaFilter });
  const activeJob = visibleJobs.find((job) => job.id === selectedJob) ?? visibleJobs[0];
  const pendingPlan = pendingModel ? planGenerationModelChange(pendingModel, settings, inputs) : null;
  const canReplay =
    ambiguousSubmit && submission.current?.request === requestJson;

  useEffect(() => {
    const controller = new AbortController();
    scope.current = controller;
    if (!preview) {
      generationCatalog(controller.signal)
        .then((all) => {
          if (controller.signal.aborted) return;
          const applicable = all.filter((m) => m.mediaType === kind);
          setCatalogModels(all);
          setModels(applicable);
          const first = applicable.find(item => item.availability === "ready") ?? applicable[0];
          if (first) {
            setSelected(first.id);
            selectedRef.current = first.id;
            setSettings(defaultGenerationSettings(first));
          }
          setLoaded(true);
        })
        .catch((e) => {
          if (!controller.signal.aborted) {
            setError(generationError(e));
            setLoaded(true);
          }
        });
    }
    return () => controller.abort();
  }, [kind, preview]);

  const loadHistory = useCallback(
    async (signal: AbortSignal) => {
      try {
        const history = await generationHistory(signal);
        if (!signal.aborted) {
          setJobs(history.slice(0, 30));
          setHistoryError(null);
          setHistoryLoaded(true);
        }
      } catch (e) {
        if (!signal.aborted) {
          setHistoryError(generationError(e));
          setHistoryLoaded(true);
        }
      }
    },
    [],
  );
  useEffect(() => {
    if (preview || !authenticated) return;
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout>;
    async function poll() {
      if (!document.hidden) await loadHistory(controller.signal);
      if (!controller.signal.aborted) timer = setTimeout(poll, 5000);
    }
    void poll();
    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [authenticated, loadHistory, preview]);

  useEffect(() => {
    if (
      preview ||
      !authenticated ||
      !ready ||
      !prompt.trim() ||
      prompt.length > 2000 ||
      constraintError ||
      preparing ||
      canReplay
    ) {
      setQuoteLoading(false);
      return;
    }
    const controller = new AbortController();
    setQuoteLoading(true);
    const timer = setTimeout(() => {
      quoteGeneration(JSON.parse(requestJson), controller.signal)
        .then((value) => {
          if (!controller.signal.aborted) {
            setQuoted({ request: requestJson, quote: value });
            setError(null);
          }
        })
        .catch((e) => {
          if (!controller.signal.aborted) {
            setQuoted(null);
            setError(generationError(e));
          }
        })
        .finally(() => {
          if (!controller.signal.aborted) setQuoteLoading(false);
        });
    }, 450);
    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [
    authenticated,
    ready,
    prompt,
    requestJson,
    constraintError,
    preparing,
    quoteRevision,
    preview,
    canReplay,
  ]);
  useEffect(() => {
    if (!quoted || preview) return;
    const timer = setTimeout(
      () => {
        setQuoted(null);
        setQuoteRevision((value) => value + 1);
        setNotice("The previous quote expired. Calculating the current cost.");
      },
      Math.max(0, Date.parse(quoted.quote.expiresAt) - Date.now()),
    );
    return () => clearTimeout(timer);
  }, [quoted, preview]);

  function changeModel(next: GenerationModel) {
    const plan = planGenerationModelChange(next, settings, inputs);
    selectedRef.current = next.id;
    setSelected(next.id);
    setSettings(plan.settings);
    setInputs(plan.inputs);
    if (!plan.inputs.length) setReferenceSource(null);
    setQuoted(null);
    setError(null);
    setModelPicker(false);
    setPendingModel(null);
    setNotice(
      plan.requiresConfirmation
        ? "Model changed. Your prompt and compatible inputs and settings were kept. Review the updated controls and cost."
        : "Model changed. Your prompt, references and compatible settings were kept. The cost will be recalculated.",
    );
    if (pendingReference) {
      const job = pendingReference;
      setPendingReference(null);
      void addReference(job, next, plan.inputs);
    }
  }
  function choose(next: GenerationModel) {
    if (busy || preparing) return;
    if (next.id === selected) {
      setModelPicker(false);
      return;
    }
    if (planGenerationModelChange(next, settings, inputs).requiresConfirmation) {
      setModelPicker(false);
      setPendingModel(next);
    }
    else changeModel(next);
  }
  function cancelModelChange() {
    setPendingModel(null);
    setPendingReference(null);
  }
  function navigateFromAsset(job: GenerationJob, action: "reuse" | "reference" | "animate") {
    const dirty = inputs.length > 0 || !!prompt.trim() || (model && JSON.stringify(settings) !== JSON.stringify(defaultGenerationSettings(model)));
    if (dirty) setPendingNavigation({ job, action });
    else router.push(`/create/${action === "animate" ? "video" : action === "reference" ? "image" : job.mediaType}?job=${encodeURIComponent(job.id)}&action=${action}`);
  }
  async function upload(
    files: FileList | null,
    role: string,
    maxCount: number,
  ) {
    if (!files || !model || preparingRef.current || busy || preview) return;
    const controller = scope.current;
    if (!controller || controller.signal.aborted) return;
    const selectedAtStart = model.id;
    preparingRef.current = true;
    setPreparing(true);
    setQuoted(null);
    setError(null);
    try {
      const remaining = maxCount - inputs.filter((i) => i.role === role).length;
      if (files.length > remaining)
        throw new Error(`You can add ${remaining} more image(s) here.`);
      const prepared = await Promise.all(
        Array.from(files).map((file) => prepareGenerationInput(file, role)),
      );
      if (!controller.signal.aborted && selectedRef.current === selectedAtStart)
        setInputs((previous) => [...previous, ...prepared]);
    } catch (e) {
      if (!controller.signal.aborted && selectedRef.current === selectedAtStart)
        setError(generationError(e));
    } finally {
      preparingRef.current = false;
      if (!controller.signal.aborted) setPreparing(false);
    }
  }
  async function addReference(
    job: GenerationJob,
    target = model,
    currentInputs = inputs,
  ) {
    if (preview || !authenticated || preparingRef.current || busy) return;
    // Jobs come only from the authenticated history/result; no arbitrary URL is fetched.
    if (
      job.status !== "Completed" ||
      job.mediaType !== "image" ||
      !jobs.some((j) => j.id === job.id)
    )
      return;
    if (kind !== "image") {
      navigateFromAsset(job, "reference");
      return;
    }
    const spec = target?.inputs.find((input) => input.role === "reference");
    if (!target || !spec) {
      modelPickerOpener.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
      setPendingReference(job);
      setNotice(
        "Choose a model that accepts reference images to continue. Your current work is kept until you confirm a change.",
      );
      setModelPicker(true);
      return;
    }
    if (
      currentInputs.filter((input) => input.role === spec.role).length >=
      spec.maxCount
    ) {
      setError(
        "Remove a reference before adding another. Your existing inputs are unchanged.",
      );
      return;
    }
    const controller = scope.current;
    if (!controller || controller.signal.aborted) return;
    const selectedAtStart = target.id;
    preparingRef.current = true;
    setPreparing(true);
    setQuoted(null);
    setError(null);
    try {
      const blob = await generationDownload(job.id, controller.signal);
      if (controller.signal.aborted || selectedRef.current !== selectedAtStart)
        return;
      const prepared = await prepareGenerationInput(
        new File([blob], "imagino-reference", { type: blob.type }),
        spec.role,
      );
      if (controller.signal.aborted || selectedRef.current !== selectedAtStart)
        return;
      setInputs((previous) => [...previous, prepared]);
      setReferenceSource(`${job.displayName} · selected creation`);
      setNotice(
        "Reference prepared from your creation. Review your prompt and the new quote before creating.",
      );
      document.getElementById("generation-prompt")?.focus();
    } catch (e) {
      if (!controller.signal.aborted && selectedRef.current === selectedAtStart)
        setError(
          `Reference could not be prepared. ${generationError(e)} Your form is unchanged.`,
        );
    } finally {
      preparingRef.current = false;
      if (!controller.signal.aborted) setPreparing(false);
    }
  }
  async function animate(job: GenerationJob) {
    if (preview || !authenticated || busy || preparingRef.current || job.status !== "Completed" || job.mediaType !== "image" ||
        !jobs.some(value => value.id === job.id) || !catalogSupportsAnimate(catalogModels)) return;
    if (kind !== "video") { navigateFromAsset(job, "animate"); return; }
    const target = models.find(value => value.capabilities.includes("imageToVideo") && value.inputs.some(input => input.role === "firstFrame" && input.ownedAssetOnly));
    const controller = scope.current;
    if (!target || !controller || controller.signal.aborted) return;
    preparingRef.current = true;
    setPreparing(true);
    setQuoted(null);
    setError(null);
    try {
      const blob = await generationDownload(job.id, controller.signal);
      if (controller.signal.aborted) return;
      if (blob.type !== "image/png" || blob.size > 2 * 1024 * 1024) throw new Error("This first frame requires a PNG image up to 2 MB.");
      const reader = new FileReader();
      const data = await new Promise<string>((resolve, reject) => {
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = () => reject(new Error("First frame could not be prepared."));
        reader.readAsDataURL(blob);
      });
      if (controller.signal.aborted) return;
      selectedRef.current = target.id;
      setSelected(target.id);
      setSettings(defaultGenerationSettings(target));
      setInputs([{ role: "firstFrame", data, sourceAssetId: job.id }]);
      setSelectedJob(job.id);
      setReferenceSource(`${job.displayName} · selected creation`);
      setNotice("First frame prepared. Confirm your motion prompt, model, settings and quote, then click Generate.");
      document.getElementById("generation-prompt")?.focus();
    } catch (e) { if (!controller.signal.aborted) setError(generationError(e)); }
    finally { preparingRef.current = false; if (!controller.signal.aborted) setPreparing(false); }
  }
  function reuse(job: GenerationJob) {
    if (preview || busy || preparing) return;
    if (job.mediaType !== kind) {
      navigateFromAsset(job, "reuse");
      return;
    }
    if (
      inputs.length ||
      (prompt.trim() && prompt !== job.prompt) ||
      (model &&
        JSON.stringify(settings) !==
          JSON.stringify(defaultGenerationSettings(model)))
    ) {
      setPendingReuse(job);
      return;
    }
    restoreJob(job);
  }
  function restoreJob(job: GenerationJob) {
    if (preview || busy || preparing) return;
    const original = models.find((m) => m.id === job.modelId);
    if (!original) {
      setError(
        "The original model is not in the current catalog. Your form is unchanged.",
      );
      return;
    }
    selectedRef.current = original.id;
    setSelected(original.id);
    setSettings(
      Object.fromEntries(
        original.fields.map((field) => {
          const previous = String(
            job.settings[field.key] ?? field.defaultValue,
          );
          const supported = field.options.includes(previous)
            ? previous
            : field.defaultValue;
          return [
            field.key,
            field.type === "integer" ? Number(supported) : supported,
          ];
        }),
      ),
    );
    setPrompt(job.prompt);
    setInputs([]);
    setReferenceSource(null);
    setQuoted(null);
    setError(null);
    setNotice(
      "Prompt and supported settings restored. Original reference files are not included.",
    );
    setPendingReuse(null);
    document.getElementById("generation-prompt")?.focus();
  }
  // Cross-route reuse carries only an opaque ID/action. Reload the owned job first.
  const routeHandlers = useRef({ reuse, addReference, animate });
  routeHandlers.current = { reuse, addReference, animate };
  useEffect(() => {
    if (
      preview ||
      !authenticated ||
      !loaded ||
      !historyLoaded ||
      historyError ||
      routeActionHandled.current
    )
      return;
    const params = new URLSearchParams(window.location.search);
    const id = params.get("job");
    const action = params.get("action");
    if (!id || !["reuse", "reference", "animate"].includes(action ?? "")) return;
    routeActionHandled.current = true;
    const job = jobs.find((value) => value.id === id);
    if (!job)
      setError(
        "This creation is not available in your 30 recent jobs. Open a creation from Assets.",
      );
    else if (action === "reuse") routeHandlers.current.reuse(job);
    else if (action === "animate") void routeHandlers.current.animate(job);
    else void routeHandlers.current.addReference(job);
    params.delete("job");
    params.delete("action");
    window.history.replaceState(
      null,
      "",
      `${window.location.pathname}${params.size ? `?${params}` : ""}`,
    );
    // This guarded effect waits until catalog and owned history are both available.
  }, [authenticated, loaded, historyLoaded, historyError, jobs, preview]);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (
      preview ||
      (!quote && !canReplay) ||
      !ready ||
      !authenticated ||
      submitting.current ||
      preparing ||
      constraintError
    )
      return;
    const controller = scope.current;
    if (!controller || controller.signal.aborted) return;
    submitting.current = true;
    setBusy(true);
    setError(null);
    // Ambiguous retries replay both the exact original payload and idempotency key.
    if (submission.current?.request !== requestJson) {
      if (!quote || Date.parse(quote.expiresAt) <= Date.now()) {
        submitting.current = false;
        setBusy(false);
        setQuoted(null);
        setQuoteRevision((v) => v + 1);
        return;
      }
      submission.current = {
        request: requestJson,
        key: crypto.randomUUID(),
        payload: { ...request, quoteId: quote.quoteId },
      };
    }
    try {
      const pending = submission.current;
      const job = await createGeneration(
        pending.payload,
        pending.key,
        controller.signal,
      );
      if (controller.signal.aborted) return;
      setJobs((previous) =>
        [job, ...previous.filter((j) => j.id !== job.id)].slice(0, 30),
      );
      setSelectedJob(job.id);
      setMediaFilter("all");
      submission.current = null;
      setAmbiguousSubmit(false);
      setNotice("Job submitted. Its status will update here.");
      window.dispatchEvent(new Event("imagino-credits-changed"));
    } catch (e) {
      if (!controller.signal.aborted) {
        const status =
          e && typeof e === "object" && "status" in e ? Number(e.status) : 0;
        const ambiguous = !status || status >= 500;
        setAmbiguousSubmit(ambiguous);
        if (!ambiguous) submission.current = null;
        setError(
          `${generationError(e)}${ambiguous ? " The submission outcome is unknown. Check submission to recover the same job; this does not create another request." : ""}`,
        );
      }
    } finally {
      if (!controller.signal.aborted) {
        setBusy(false);
        submitting.current = false;
      }
    }
  }
  async function cancel(id: string) {
    if (preview || !authenticated) return;
    const controller = scope.current;
    if (!controller || controller.signal.aborted) return;
    const job = await cancelGeneration(id, controller.signal);
    if (!controller.signal.aborted) {
      setJobs((previous) => previous.map((j) => (j.id === id ? job : j)));
      window.dispatchEvent(new Event("imagino-credits-changed"));
    }
  }
  useEffect(() => {
    if (
      !preview &&
      jobs.some(
        (j) =>
          previousStates.current[j.id] &&
          previousStates.current[j.id] !== `${j.status}:${j.creditState}` &&
          terminalGeneration(j.status),
      )
    )
      window.dispatchEvent(new Event("imagino-credits-changed"));
    previousStates.current = Object.fromEntries(
      jobs.map((j) => [j.id, `${j.status}:${j.creditState}`]),
    );
  }, [jobs, preview]);

  return (
    <main className="studio-page creative-workspace">
      <header className="studio-page-heading">
        <div>
          <h1>{kind === "image" ? "Image studio" : "Video studio"}</h1>
          <p className="muted">
            {kind === "image"
              ? "Start with a thought. Or take a reference somewhere new."
              : models.some(isGenerationModelReady)
                ? "Bring a scene to life, one idea at a time."
                : "Prepare your next scene. Video generation is currently unavailable."}
          </p>
        </div>
      </header>
      {preview ? (
        <p className="studio-preview-label">
          Design preview — sample data. Creation and download actions are
          disabled.
        </p>
      ) : null}
      <div className="studio-layout">
        <form
          onSubmit={submit}
          className="studio-controls"
          aria-label={`Create ${kind} controls`}
        >
          <div className="studio-controls-header">
          <nav className="creative-kind-switch" aria-label="Creation tools">
            {(["image", "video"] as const).map(value => preview ? (
              <button key={value} type="button" aria-pressed={kind === value} onClick={() => preview.onKindChange?.(value)} disabled={!preview.onKindChange && kind !== value}>
                {value === "image" ? "Image" : "Video"}
              </button>
            ) : (
              <Link key={value} href={`/create/${value}`} aria-current={kind === value ? "page" : undefined}>
                {value === "image" ? "Image" : "Video"}
              </Link>
            ))}
          </nav>
          <div className="studio-section-heading"><h2>{kind === "image" ? "Create image" : "Create video"}</h2></div>
          </div>
          <ScrollRegion className="studio-control-scroll" label={`${kind === "image" ? "Image" : "Video"} inputs and settings`}>
          <fieldset
            disabled={busy || preparing}
            className="studio-control-fields"
          >
            <div className="creative-input-heading"><span className="studio-step">01 / {kind === "image" ? "REFERENCE" : "INPUT"}</span><span className="studio-help">{model?.inputs.some(input => input.required) ? "Required" : "Optional"}</span></div>
            {model?.inputs.length ? model.inputs.map((spec) => (
                <div key={spec.role} className="studio-reference-area">
                  <div className="studio-field-label">
                    <span>{spec.label}</span>
                    <span>
                      {inputs.filter((i) => i.role === spec.role).length}/
                      {spec.maxCount}
                    </span>
                  </div>
                  {inputs.some((input) => input.role === spec.role) ? (
                    <div className="studio-reference-grid">
                      {inputs.map((input, index) =>
                        input.role === spec.role ? (
                          <div key={index} className="studio-reference-thumb">
                            <Image
                              src={input.data}
                              alt={`${spec.label} ${index + 1}`}
                              width={128}
                              height={128}
                              unoptimized
                            />
                            <button
                              type="button"
                              className="studio-remove-reference"
                              aria-label={`Remove ${spec.label} ${index + 1}`}
                              onClick={() => {
                                setInputs((previous) =>
                                  previous.filter((_, i) => i !== index),
                                );
                                setQuoted(null);
                              }}
                            >
                              <X size={14} />
                            </button>
                          </div>
                        ) : null,
                      )}
                    </div>
                  ) : null}
                  {spec.ownedAssetOnly ? <Link href="/library" className="ui-button secondary">Choose an image from Assets</Link> : <label className="studio-upload">
                    <Upload size={19} />
                    <span>
                      Add{" "}
                      {inputs.length ? "another image" : "a reference image"}
                    </span>
                    <input
                      type="file"
                      aria-label={`Upload ${spec.label}`}
                      accept="image/png,image/jpeg,image/webp"
                      multiple={spec.maxCount > 1}
                      disabled={
                        !!preview ||
                        preparing ||
                        inputs.filter((i) => i.role === spec.role).length >=
                          spec.maxCount
                      }
                      onChange={(e) => {
                        void upload(e.target.files, spec.role, spec.maxCount);
                        e.target.value = "";
                      }}
                    />
                    <small>PNG, JPEG or WebP · up to 10 MB</small>
                  </label>}
                  <p className="studio-help">
                    {spec.ownedAssetOnly ? "Choose a completed image in Assets and click Animate to prepare this first frame." : "Prepared at up to 1024 px. Reference inputs can change the cost."}
                  </p>
                </div>
              )) : (
                <div className="creative-reference-empty">
                  <ImagePlus size={22} aria-hidden="true" />
                  <p>{loaded ? "This model starts with a prompt." : "Loading reference options…"}</p>
                  {models.some(item => item.inputs.some(input => input.role === "reference" && input.maxCount > 0)) ? <button type="button" onClick={event => { modelPickerOpener.current = event.currentTarget; setReferenceOnly(true); setModelPicker(true); }}>Choose a model for references</button> : null}
                </div>
              )}
            {referenceSource ? (
              <p className="studio-reference-source">
                Source: {referenceSource}
              </p>
            ) : null}
            <label className="studio-field-label" htmlFor="generation-prompt">
              <span>Prompt</span><span className="studio-step" aria-hidden="true">02 / PROMPT</span>
            </label>
            <textarea
              className="ui-textarea studio-prompt"
              id="generation-prompt"
              value={prompt}
              onChange={(e) => {
                setPrompt(e.target.value);
                setError(null);
              }}
              maxLength={2000}
              rows={5}
              required
              placeholder={kind === "image" ? "A product in warm afternoon light, soft shadows, a little room for imagination…" : "A slow camera move through warm afternoon light. Describe the scene and motion…"}
              aria-describedby="prompt-help"
            />
            <div className="studio-prompt-help" id="prompt-help">
              <span>Describe the scene, {kind === "image" ? "light" : "motion"} and mood.</span>
              <span>{prompt.length}/2000</span>
            </div>
            <div className="studio-control-divider" />
            <div className="studio-section-heading">
              <label className="studio-field-label" id="model-label">
                Model
              </label>
              <span className="studio-step">03 / SETTINGS</span>
            </div>
            <button
              className="studio-model-trigger"
              ref={modelPickerTrigger}
              type="button"
              onClick={event => { modelPickerOpener.current = event.currentTarget; setReferenceOnly(false); setModelPicker(true); }}
              disabled={!loaded || !models.length}
              aria-labelledby="model-label current-model"
              aria-haspopup="dialog"
              aria-expanded={modelPicker}
            >
              <span>
                <strong id="current-model">
                  {model?.displayName ??
                    (loaded ? "Catalog unavailable" : "Loading models…")}
                </strong>
                <small>
                  {model ? `${generationModelPresentation(model).nativeDisplayName} · ${modelAvailability(model)}` : "Please wait"}
                </small>
              </span>
              <ChevronDown size={18} />
            </button>
            {model ? (
              <div className="studio-settings">
                {model.fields.map((field) => (
                  <label key={field.key} htmlFor={`generation-setting-${field.key}`}>
                    <span id={`generation-setting-${field.key}-label`}>{field.label}</span>
                    <Select
                      id={`generation-setting-${field.key}`}
                      aria-labelledby={`generation-setting-${field.key}-label`}
                      value={String(settings[field.key] ?? field.defaultValue)}
                      disabled={busy || preparing}
                      onValueChange={(value) => {
                        setSettings((previous) => ({
                          ...previous,
                          [field.key]:
                            field.type === "integer"
                              ? Number(value)
                              : value,
                        }));
                        setError(null);
                      }}
                      options={field.options.map(value => ({ value, label: value }))}
                    />
                  </label>
                ))}
              </div>
            ) : null}
            {model ? (
              <details className="studio-model-details">
                <summary>
                  <SlidersHorizontal size={15} />
                  Model & settings
                </summary>
                <p>{model.description}</p>
                <dl>
                  {generationModelPresentation(model).providerName ? <div><dt>Provider</dt><dd>{generationModelPresentation(model).providerName}</dd></div> : null}
                  <div>
                    <dt>Underlying model</dt>
                    <dd>{model.providerModel}</dd>
                  </div>
                  <div>
                    <dt>Starting cost</dt>
                    <dd>From {model.startingCredits} credits</dd>
                  </div>
                </dl>
                <p className="studio-help">
                  Starting cost is a catalog estimate. Only a current server
                  quote can authorize creation.
                </p>
                {model.capabilities.includes("nativeAudio") ? (
                  <p>
                    Native audio is included. Describe sounds in your prompt.
                  </p>
                ) : null}
              </details>
            ) : null}
          </fieldset>
          {constraintError ? (
            <p role="alert" className="studio-notice">
              {constraintError}
            </p>
          ) : null}
          {model && !ready ? (
            <p className="studio-notice">
              {model.availability === "migration_required" || model.retirementAt
                ? "This model needs an update before generation can be enabled."
                : "Generation is unavailable for this model. You can prepare an idea and explore its controls."}{" "}
              No credits will be reserved.
            </p>
          ) : null}
          {model?.availability === "synthetic_demo" ? (
            <p className="studio-notice">
              This staging tool returns a fixed synthetic image. It is a
              pipeline test, not an AI generation.
            </p>
          ) : null}
          {error ? (
            <p role="alert" className="studio-notice error">
              {error}
            </p>
          ) : null}
          {notice ? (
            <p role="status" className="studio-notice success">
              {notice}
            </p>
          ) : null}
          </ScrollRegion>
          <div className="studio-create-action">
            <div className="studio-cost" aria-live="polite">
              <span>{preview ? "Sample quote" : "Current cost"}</span>
              <strong>
                {preparing
                  ? "Preparing…"
                  : quoteLoading
                    ? "Calculating…"
                    : quote
                      ? `${quote.credits} credits`
                      : "—"}
              </strong>
            </div>
            <p className="studio-help">
              {!authenticated
                ? "Sign in to calculate the cost and create."
                : !ready
                  ? "Creation is currently unavailable."
                  : quote
                    ? "Credits are reserved when you submit."
                    : prompt.trim()
                      ? "A current quote is required before creating."
                      : "Add a prompt to calculate your cost."}
            </p>
            {authenticated ? (
              <button
                disabled={
                  !!preview ||
                  (!quote && !canReplay) ||
                  !ready ||
                  !!constraintError ||
                  busy ||
                  preparing
                }
                type="submit"
                className="ui-button studio-create-button"
              >
                {busy
                  ? "Submitting…"
                  : canReplay
                    ? "Check submission"
                    : `Generate ${kind}${quote ? ` · ${quote.credits} credits` : ""}`}
                <ArrowRight size={18} />
              </button>
            ) : preview ? <button type="button" disabled className="ui-button studio-create-button">Sign in to create <ArrowRight size={18} /></button> : (
              <Link href="/login" className="ui-button studio-create-button">
                Sign in to create
                <ArrowRight size={18} />
              </Link>
            )}
          </div>
        </form>
        <section className="studio-output" aria-label="Creation result">
          <div className="creative-output-heading">
            <AssetMediaFilter jobs={jobs} value={currentMediaFilter} onChange={value => { setMediaFilter(value); setSelectedJob(""); }} />
            <span className="studio-help">{visibleJobs.length ? `${visibleJobs.length} recent assets` : "Your workspace"}</span>
          </div>
          {activeJob ? (
            <GenerationResult
              key={activeJob.id}
              job={activeJob}
              onReuse={reuse}
              onReference={(job) => void addReference(job)}
              onAnimate={(job) => void animate(job)}
              canAnimate={catalogSupportsAnimate(catalogModels)}
              onCancel={cancel}
              preview={!!preview}
              owned={authenticated}
              canReference={catalogSupportsReference(catalogModels)}
            />
          ) : (
            <ScrollRegion className="studio-empty-canvas" label="Empty result workspace">
              <div className="studio-empty-top">
                <span className="eyebrow">Room to create</span>
                <span className="studio-step">RESULT</span>
              </div>
              <div className="studio-empty-content">
                <span className="studio-frame-mark" aria-hidden="true" />
                <h2>Your next idea starts here.</h2>
                <p>
                  Write a prompt or add a reference.
                  <br />
                  Your {kind} will have this space to itself.
                </p>
                <span className="studio-empty-caption">
                  Reference → create → choose → continue
                </span>
              </div>
              <p className="studio-empty-bottom">One idea. A new direction.</p>
            </ScrollRegion>
          )}
          <div className="studio-recents-heading">
            <h2>Recent assets</h2>
            {preview ? <button type="button" onClick={preview.onOpenAssets} disabled={!preview.onOpenAssets}>View Assets <ArrowRight size={15} /></button> : <Link href="/library">
              View Assets
              <ArrowRight size={15} />
            </Link>}
          </div>
          {historyError ? (
            <ScrollRegion className="studio-history-status" label="Recent assets status">
            <p role="alert" className="studio-notice error">
              History could not refresh: {historyError}
            </p>
            </ScrollRegion>
          ) : !authenticated ? (
            <p className="studio-help">Sign in to see your recent creations.</p>
          ) : !historyLoaded ? (
            <ScrollRegion className="studio-history-status" label="Recent assets status">
            <div className="studio-skeleton" role="status">
              Loading recent creations…
            </div>
            </ScrollRegion>
          ) : !visibleJobs.length ? (
            <p className="studio-help">
              Your recent jobs will appear here. Select an asset to keep creating.
            </p>
          ) : (
            <ScrollRegion className="studio-recents" label="Recent assets">
              {visibleJobs.slice(0, 8).map((job) => (
                <AssetCard
                  key={job.id}
                  job={job}
                  compact
                  selected={activeJob?.id === job.id}
                  onOpen={() => setSelectedJob(job.id)}
                  preview={!!preview}
                />
              ))}
            </ScrollRegion>
          )}
        </section>
      </div>
      {modelPicker ? <ModelPicker
        models={models}
        selected={selected}
        onChoose={choose}
        onInspect={choose}
        onClose={() => { setModelPicker(false); setPendingReference(null); }}
        referenceOnly={referenceOnly || !!pendingReference}
        currentQuoteCredits={quote?.credits}
        returnFocusTo={modelPickerOpener.current ?? modelPickerTrigger.current}
      /> : null}
      <StudioDialog
        open={!!pendingModel}
        onClose={cancelModelChange}
        title="Change model?"
        returnFocusTo={modelPickerOpener.current ?? modelPickerTrigger.current}
      >
        <p>
          {pendingModel?.displayName} supports a different setup. Your prompt and compatible references and settings will stay.
        </p>
        {pendingPlan?.removedInputs.length ? <p className="studio-notice">{pendingPlan.removedInputs.length} reference input{pendingPlan.removedInputs.length === 1 ? " is" : "s are"} incompatible and will be removed only if you change model. {pendingPlan.inputs.length} will be kept.</p> : null}
        {pendingPlan?.changedSettings.length ? <p className="studio-help creative-transition-settings">Settings that will change: {pendingPlan.changedSettings.join(", ")}. A new quote is required.</p> : null}
        <div className="studio-dialog-actions">
          <button
            type="button"
            className="ui-button secondary"
            onClick={cancelModelChange}
          >
            Keep current model
          </button>
          <button
            type="button"
            className="ui-button"
            onClick={() => {
              if (pendingModel) changeModel(pendingModel);
            }}
          >
            Change model
          </button>
        </div>
      </StudioDialog>
      <StudioDialog open={!!pendingNavigation} onClose={() => setPendingNavigation(null)} title="Continue in another studio?">
        <p>Your current prompt, reference inputs and settings will be replaced when you continue with this asset in the {pendingNavigation?.action === "animate" ? "video" : pendingNavigation?.action === "reference" ? "image" : pendingNavigation?.job.mediaType} studio.</p>
        <div className="studio-dialog-actions">
          <button type="button" className="ui-button secondary" onClick={() => setPendingNavigation(null)}>Keep current setup</button>
          <button type="button" className="ui-button" onClick={() => {
            if (!pendingNavigation) return;
            const { job, action } = pendingNavigation;
            setPendingNavigation(null);
            router.push(`/create/${action === "animate" ? "video" : action === "reference" ? "image" : job.mediaType}?job=${encodeURIComponent(job.id)}&action=${action}`);
          }}>Continue with asset</button>
        </div>
      </StudioDialog>
      <StudioDialog
        open={!!pendingReuse}
        onClose={() => setPendingReuse(null)}
        title="Replace your current setup?"
      >
        <p>
          Reusing this creation replaces your prompt and settings and removes
          current reference inputs. Original reference files are not included in
          job history.
        </p>
        <div className="studio-dialog-actions">
          <button
            type="button"
            className="ui-button secondary"
            onClick={() => setPendingReuse(null)}
          >
            Keep current setup
          </button>
          <button
            type="button"
            className="ui-button"
            onClick={() => {
              if (pendingReuse) restoreJob(pendingReuse);
            }}
          >
            Reuse this setup
          </button>
        </div>
      </StudioDialog>
    </main>
  );
}
