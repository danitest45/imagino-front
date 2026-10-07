"use client";

import Link from "next/link";
import dynamic from "next/dynamic";
import { ArrowRight, Search, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../../context/AuthContext";
import { cancelGeneration, generationCatalog, generationHistory } from "../../lib/generation-api";
import { generationError, terminalGeneration } from "../../lib/generation";
import { catalogSupportsAnimate, catalogSupportsReference, filterAssets, type AssetMediaFilter as MediaFilter } from "../../lib/generation-assets";
import type { GenerationJob, GenerationModel } from "../../types/generation";
import { AssetCard, AssetMediaFilter } from "./GenerationPresentation";
import StudioDialog from "./StudioDialog";
import { Select } from "../ui/StudioUI";
import { ScrollRegion } from "../ui/ScrollRegion";
import "./studio.css";

const GenerationResult = dynamic(() => import("./GenerationResult"), {
  loading: () => <p role="status" className="studio-help">Loading asset details…</p>,
});

/** Local review data only: supplying this fixture suppresses all API requests/actions. */
export interface LibraryPreview {
  jobs: GenerationJob[];
  loading?: boolean;
  error?: string;
  authenticated?: boolean;
  models?: GenerationModel[];
  onCreate?: () => void;
}

export default function GenerationLibrary({
  preview,
}: {
  preview?: LibraryPreview;
}) {
  const { token, isAuthenticated } = useAuth();
  return (
    <Library
      key={preview ? "design-preview" : (token ?? "signed-out")}
      authenticated={preview?.authenticated ?? isAuthenticated}
      preview={preview}
    />
  );
}

function Library({
  preview,
  authenticated,
}: {
  preview?: LibraryPreview;
  authenticated: boolean;
}) {
  const router = useRouter();
  const [jobs, setJobs] = useState<GenerationJob[]>(
    preview?.jobs.slice(0, 30) ?? [],
  );
  const [loading, setLoading] = useState(
    preview ? !!preview.loading : authenticated,
  );
  const [error, setError] = useState<string | null>(preview?.error ?? null);
  const [revision, setRevision] = useState(0);
  const [query, setQuery] = useState("");
  const [model, setModel] = useState("");
  const [status, setStatus] = useState("");
  const [media, setMedia] = useState<MediaFilter>("all");
  const [canReference, setCanReference] = useState(() => catalogSupportsReference(preview?.models ?? []));
  const [canAnimate, setCanAnimate] = useState(() => catalogSupportsAnimate(preview?.models ?? []));
  const [selected, setSelected] = useState<string | null>(null);
  const scope = useRef<AbortController | null>(null);
  const previousStates = useRef<Record<string, string>>({});
  useEffect(() => {
    if (preview || !authenticated) return;
    const controller = new AbortController();
    generationCatalog(controller.signal).then((catalog) => {
      if (!controller.signal.aborted) {
        setCanReference(catalogSupportsReference(catalog));
        setCanAnimate(catalogSupportsAnimate(catalog));
      }
    }).catch(() => {
      // History and downloads remain useful when the catalog is unavailable.
      if (!controller.signal.aborted) { setCanReference(false); setCanAnimate(false); }
    });
    return () => controller.abort();
  }, [preview, authenticated]);
  useEffect(() => {
    if (preview || !authenticated) return;
    const controller = new AbortController();
    scope.current = controller;
    let timer: ReturnType<typeof setTimeout>;
    async function poll() {
      if (!document.hidden) {
        try {
          const result = await generationHistory(controller.signal);
          if (!controller.signal.aborted) {
            setJobs(result.slice(0, 30));
            setError(null);
          }
        } catch (e) {
          if (!controller.signal.aborted) setError(generationError(e));
        } finally {
          if (!controller.signal.aborted) setLoading(false);
        }
      }
      if (!controller.signal.aborted) timer = setTimeout(poll, 5000);
    }
    void poll();
    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [preview, authenticated, revision]);
  useEffect(() => {
    if (
      !preview &&
      jobs.some(
        (job) =>
          previousStates.current[job.id] &&
          previousStates.current[job.id] !==
            `${job.status}:${job.creditState}` &&
          terminalGeneration(job.status),
      )
    )
      window.dispatchEvent(new Event("imagino-credits-changed"));
    previousStates.current = Object.fromEntries(
      jobs.map((job) => [job.id, `${job.status}:${job.creditState}`]),
    );
  }, [jobs, preview]);
  const models = useMemo(
    () =>
      Array.from(new Map(jobs.map((job) => [job.modelId, job.displayName]))),
    [jobs],
  );
  const selectedMedia = media === "all" || jobs.some((job) => job.mediaType === media) ? media : "all";
  const filtered = filterAssets(jobs, { media: selectedMedia, model, status, query });
  const selectedJob = jobs.find((job) => job.id === selected);
  function continueWith(job: GenerationJob, action: "reuse" | "reference" | "animate") {
    if (preview || !authenticated) return;
    // IDs convey intent; the destination reloads this job from owned history.
    router.push(
      `/create/${action === "animate" ? "video" : action === "reference" ? "image" : job.mediaType}?job=${encodeURIComponent(job.id)}&action=${action}`,
    );
  }
  async function cancel(id: string) {
    if (preview || !authenticated) return;
    const controller = scope.current;
    if (!controller || controller.signal.aborted) return;
    await cancelGeneration(id, controller.signal);
    if (!controller.signal.aborted) {
      setRevision((value) => value + 1);
      window.dispatchEvent(new Event("imagino-credits-changed"));
    }
  }
  function clearFilters() {
    setQuery("");
    setModel("");
    setStatus("");
    setMedia("all");
  }
  return (
    <main className="studio-page library-page">
      <header className="studio-page-heading">
        <div>
          <p className="eyebrow">Your work, ready to continue</p>
          <h1>Assets</h1>
          <p className="muted">Recent generated assets. Choose a creation to continue.</p>
        </div>
        {preview ? <button type="button" className="ui-button" disabled={!preview.onCreate} onClick={preview.onCreate}>Create an image<ArrowRight size={17} /></button> : <Link href="/create/image" className="ui-button">
          Create an image
          <ArrowRight size={17} />
        </Link>}
      </header>
      {preview ? (
        <p className="studio-preview-label">
          Design preview — sample data. Creation and download actions are
          disabled.
        </p>
      ) : null}
      <ScrollRegion className="library-content-scroll" label="Recent generated assets">
      {!authenticated ? (
        <div className="library-empty">
          <span className="studio-frame-mark" aria-hidden="true" />
          <h2>Your work belongs here.</h2>
          <p>
            Sign in to see your recent creations, review settings and prepare
            your next creation.
          </p>
          {preview ? <button type="button" className="ui-button" disabled>Sign in to view Assets</button> : <Link href="/login" className="ui-button">
            Sign in to view Assets
          </Link>}
        </div>
      ) : (
        <>
          <AssetMediaFilter jobs={jobs} value={selectedMedia} onChange={setMedia} />
          <section
            className="library-filters"
            aria-label="Filter recent creations"
          >
            <label className="library-search">
              <span className="sr-only">Search loaded creations</span>
              <Search size={18} />
              <input
                type="search"
                className="ui-input"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search prompts or models"
              />
            </label>
            <label htmlFor="library-model-filter">
              <span id="library-model-label">Model</span>
              <Select
                id="library-model-filter"
                aria-labelledby="library-model-label"
                value={model}
                onValueChange={setModel}
                options={[{ value: "", label: "All models" }, ...models.map(([id, name]) => ({ value: id, label: name }))]}
              />
            </label>
            <label htmlFor="library-status-filter">
              <span id="library-status-label">Status</span>
              <Select
                id="library-status-filter"
                aria-labelledby="library-status-label"
                value={status}
                onValueChange={setStatus}
                options={[{ value: "", label: "All statuses" }, ...[
                  "Queued",
                  "Starting",
                  "Processing",
                  "Completed",
                  "Failed",
                  "Cancelled",
                  "Refunded",
                ].map((value) => ({ value, label: value }))]}
              />
            </label>
          </section>
          <div className="library-scope">
            <p>
              Up to 30 recent jobs · search and filters apply to loaded results.
            </p>
            <span role="status">
              {loading
                ? "Loading…"
                : `${filtered.length} ${filtered.length === 1 ? "creation" : "creations"}`}
            </span>
          </div>
          {error ? (
            <div className="studio-notice error" role="alert">
              <strong>Your assets could not refresh.</strong>
              <p>{error}</p>
              {jobs.length ? (
                <p>Previously loaded results remain below.</p>
              ) : null}
              <button
                type="button"
                className="ui-button secondary"
                disabled={!!preview}
                onClick={() => {
                  setLoading(true);
                  setRevision((value) => value + 1);
                }}
              >
                Try again
              </button>
            </div>
          ) : null}
          {loading ? (
            <div className="library-grid" aria-label="Loading Assets">
              {Array.from({ length: 6 }, (_, index) => (
                <div key={index} className="library-skeleton studio-skeleton" />
              ))}
            </div>
          ) : jobs.length === 0 && !error ? (
            <div className="library-empty">
              <span className="studio-frame-mark" aria-hidden="true" />
              <h2>A place for your possibilities.</h2>
              <p>
                Your recent creations will appear here. Open the studio to begin
                with a prompt or a reference.
              </p>
              {preview ? <button type="button" className="ui-button" disabled={!preview.onCreate} onClick={preview.onCreate}>Explore the studio<ArrowRight size={16} /></button> : <Link href="/create/image" className="ui-button">
                Explore the studio
                <ArrowRight size={16} />
              </Link>}
            </div>
          ) : jobs.length > 0 && !filtered.length ? (
            <div className="library-empty">
              <Search size={32} />
              <h2>No creations match these filters.</h2>
              <p>Try another word, model or status within your recent jobs.</p>
              <button
                type="button"
                className="ui-button secondary"
                onClick={clearFilters}
              >
                <X size={16} />
                Clear filters
              </button>
            </div>
          ) : (
            <div className="library-grid">
              {filtered.map((job) => (
                <AssetCard
                  key={job.id}
                  job={job}
                  preview={!!preview}
                  onOpen={() => setSelected(job.id)}
                />
              ))}
            </div>
          )}
        </>
      )}
      </ScrollRegion>
      <StudioDialog
        open={!!selectedJob}
        onClose={() => setSelected(null)}
        title="Your creation"
        wide
      >
        {selectedJob ? (
          <GenerationResult
            key={selectedJob.id}
            job={selectedJob}
            onReuse={(job) => continueWith(job, "reuse")}
            onReference={(job) => continueWith(job, "reference")}
            onAnimate={(job) => continueWith(job, "animate")}
            canAnimate={canAnimate}
            onCancel={cancel}
            preview={!!preview}
            canReference={canReference}
            owned={authenticated}
            detail
          />
        ) : null}
      </StudioDialog>
    </main>
  );
}
