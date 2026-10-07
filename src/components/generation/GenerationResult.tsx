"use client";

import Image from "next/image";
import { Download, Expand, ImagePlus, LoaderCircle, RotateCcw } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { GenerationJob } from "../../types/generation";
import { generationDownload } from "../../lib/generation-api";
import { generationError, terminalGeneration } from "../../lib/generation";
import { availableAssetActions } from "../../lib/generation-assets";
import {
  creditLabel,
  jobDate,
  jobImageSource,
  JobStatus,
} from "./GenerationPresentation";
import StudioDialog from "./StudioDialog";
import { ScrollRegion } from "../ui/ScrollRegion";

export interface GenerationResultProps {
  job: GenerationJob;
  onReuse: (job: GenerationJob) => void;
  onCancel?: (id: string) => Promise<void>;
  onReference?: (job: GenerationJob) => void;
  preview?: boolean;
  detail?: boolean;
  /** Only trusted, authenticated history supplies owned jobs to this component. */
  owned: boolean;
  canReference?: boolean;
}

export default function GenerationResult({
  job,
  onReuse,
  onCancel,
  onReference,
  preview = false,
  detail = false,
  owned,
  canReference = !!onReference,
}: GenerationResultProps) {
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [imageUnavailable, setImageUnavailable] = useState(false);
  const [videoLoading, setVideoLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [zoom, setZoom] = useState(false);
  const scope = useRef<AbortController | null>(null);
  const downloading = useRef(false);
  const src = imageUnavailable ? null : jobImageSource(job, preview);
  const actions = availableAssetActions(job, { owned, canReference: canReference && !!onReference });
  useEffect(() => {
    const controller = new AbortController();
    scope.current = controller;
    let url: string | null = null;
    setVideoUrl(null);
    setImageUnavailable(false);
    setError(null);
    setVideoLoading(false);
    if (!preview && owned && job.mediaType === "video" && job.status === "Completed") {
      setVideoLoading(true);
      generationDownload(job.id, controller.signal)
        .then((blob) => {
          if (controller.signal.aborted) return;
          url = URL.createObjectURL(blob);
          setVideoUrl(url);
        })
        .catch((e) => {
          if (!controller.signal.aborted) setError(generationError(e));
        })
        .finally(() => {
          if (!controller.signal.aborted) setVideoLoading(false);
        });
    }
    return () => {
      controller.abort();
      if (url) URL.revokeObjectURL(url);
    };
  }, [job.id, job.mediaType, job.status, job.outputUrl, preview, owned]);
  async function download() {
    if (preview || !owned || job.status !== "Completed" || downloading.current) return;
    const controller = scope.current;
    if (!controller || controller.signal.aborted) return;
    downloading.current = true;
    setBusy(true);
    setError(null);
    try {
      const blob = await generationDownload(job.id, controller.signal);
      if (controller.signal.aborted) return;
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `imagino-${job.id}.${blob.type === "video/mp4" ? "mp4" : blob.type === "image/jpeg" ? "jpg" : blob.type === "image/webp" ? "webp" : "png"}`;
      anchor.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (e) {
      if (!controller.signal.aborted) setError(generationError(e));
    } finally {
      downloading.current = false;
      if (!controller.signal.aborted) setBusy(false);
    }
  }
  async function cancel() {
    if (preview || !owned || job.status !== "Queued" || !onCancel || busy) return;
    const controller = scope.current;
    setBusy(true);
    try {
      await onCancel(job.id);
    } catch (e) {
      if (!controller?.signal.aborted) setError(generationError(e));
    } finally {
      if (!controller?.signal.aborted) setBusy(false);
    }
  }
  return (
    <article
      className={`studio-result${detail ? " studio-result-detail" : ""}`}
    >
      <div className="studio-result-toolbar">
        <div>
          <span className="eyebrow">
            {detail ? "Asset details" : "Selected asset"}
          </span>
          <h2>{job.displayName}</h2>
        </div>
        <JobStatus job={job} />
      </div>
      <div className="studio-result-canvas">
        {src ? (
          <>
            <Image
              src={src}
              alt={job.prompt}
              fill
              sizes="(max-width: 850px) 100vw, 70vw"
              unoptimized
              className="studio-result-image"
              onError={() => setImageUnavailable(true)}
            />
            <button
              type="button"
              className="studio-zoom"
              onClick={() => setZoom(true)}
              aria-label="View image full size"
            >
              <Expand size={18} />
              View full image
            </button>
          </>
        ) : null}
        {videoUrl ? (
          <video src={videoUrl} controls aria-label={job.prompt} />
        ) : null}
        {!src && !videoUrl ? (
          <ScrollRegion className="studio-result-state" label="Generation status">
            {videoLoading ? <LoaderCircle size={32} className="studio-spinner" aria-hidden="true" /> : <span className="studio-frame-mark" aria-hidden="true" />}
            <h3>
              {videoLoading
                ? "Loading your video."
                : !terminalGeneration(job.status)
                ? "Your idea is taking shape."
                : job.status === "Failed"
                  ? "This generation could not finish."
                  : job.status === "Cancelled"
                    ? "Generation cancelled."
                    : "The output is unavailable."}
            </h3>
            <p>
              {videoLoading
                ? "Preparing playback from your completed output."
                : !terminalGeneration(job.status)
                ? `${job.status}. You can leave and return while this job runs.`
                : "Your prompt and settings are available to reuse."}
            </p>
          </ScrollRegion>
        ) : null}
      </div>
      <ScrollRegion className="studio-result-footer" label="Selected asset actions and details">
        <p className="studio-job-meta">
          {creditLabel(job)}
          <span>·</span>
          <time dateTime={job.createdAt}>{jobDate(job.createdAt)}</time>
        </p>
        <div className="studio-result-actions">
          {actions.map((action) => {
            const Icon = action.id === "reference" ? ImagePlus : action.id === "reuse" ? RotateCcw : Download;
            return (
              <button key={action.id} type="button" className={`ui-button${action.primary ? "" : " secondary"}`} disabled={preview || (action.id === "download" && busy)} onClick={(event) => {
                event.currentTarget.focus({ preventScroll: true });
                if (preview || !owned) return;
                if (action.id === "reference") onReference?.(job);
                else if (action.id === "reuse") onReuse(job);
                else void download();
              }}>
                <Icon size={16} />
                {action.id === "download" && busy ? "Preparing…" : action.label}
              </button>
            );
          })}
          {owned && job.status === "Queued" && onCancel ? (
            <button
              type="button"
              className="ui-button ghost"
              disabled={busy || preview}
              onClick={cancel}
            >
              Cancel job
            </button>
          ) : null}
        </div>
        {job.errorCode ? (
          <p className="studio-notice error">
            {job.errorCode === "synthetic_provider_failure"
              ? "The demo simulated a provider failure."
              : "The server reported a generation error."}{" "}
            {job.creditState === "Refunded"
              ? "The server confirmed your credits were returned."
              : `Credit status: ${job.creditState}. A refund has not been confirmed.`}
          </p>
        ) : null}
        {error ? (
          <p role="alert" className="studio-notice error">
            {error}
          </p>
        ) : null}
        <details className="studio-metadata" open={detail || undefined}>
          <summary>Prompt & generation details</summary>
          <p>{job.prompt}</p>
          <dl>
            <div>
              <dt>Model</dt>
              <dd>{job.displayName}</dd>
            </div>
            {Object.entries(job.settings).map(([key, value]) => (
              <div key={key}>
                <dt>{key.replace(/([A-Z])/g, " $1")}</dt>
                <dd>{value}</dd>
              </div>
            ))}
            <div>
              <dt>Credit state</dt>
              <dd>{job.creditState}</dd>
            </div>
          </dl>
          <p className="studio-help">
            Reuse restores the prompt and supported settings. Original reference
            files are not stored in job history.
          </p>
        </details>
      </ScrollRegion>
      <StudioDialog
        open={zoom}
        onClose={() => setZoom(false)}
        title="Full image"
        wide
      >
        <div className="studio-zoom-image">
          {src ? (
            <Image
              src={src}
              alt={job.prompt}
              width={1600}
              height={1200}
              unoptimized
            />
          ) : null}
        </div>
      </StudioDialog>
    </article>
  );
}
