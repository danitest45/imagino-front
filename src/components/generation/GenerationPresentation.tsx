"use client";

import Image from "next/image";
import { ImageIcon, LoaderCircle, Video } from "lucide-react";
import type { GenerationJob, GenerationModel } from "../../types/generation";
import { terminalGeneration } from "../../lib/generation";
import { assetMediaFilters, type AssetMediaFilter as MediaFilter } from "../../lib/generation-assets";
import "./assets.css";

export function AssetMediaFilter({ jobs, value, onChange }: {
  jobs: GenerationJob[];
  value: MediaFilter;
  onChange: (value: MediaFilter) => void;
}) {
  const filters = assetMediaFilters(jobs);
  return (
    <div className="asset-media-filters" role="group" aria-label="Filter assets by media">
      {filters.map((filter) => (
        <button key={filter} type="button" className="asset-media-filter" aria-pressed={value === filter} onClick={() => onChange(filter)}>
          {filter === "all" ? "All" : filter === "image" ? "Images" : "Videos"}
        </button>
      ))}
    </div>
  );
}

export function modelAvailability(model: GenerationModel) {
  return (
    (
      {
        ready: "Available",
        synthetic_demo: "Synthetic staging demo",
        deployment_pending: "Generation unavailable",
        approval_required: "Approval required",
        migration_required: "Model update required",
        retired: "Retired",
        disabled: "Unavailable",
      } as Record<string, string>
    )[model.availability] ?? "Awaiting activation"
  );
}

export function creditLabel(job: GenerationJob) {
  return `${job.credits} credits · ${job.creditState}`;
}

export function jobDate(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(value));
}

/** Local assets are accepted exclusively by explicitly supplied design-review fixtures. */
export function jobImageSource(
  job: GenerationJob,
  preview = false,
  width = 1024,
) {
  if (job.status !== "Completed" || job.mediaType !== "image" || !job.outputUrl)
    return null;
  if (preview)
    return job.outputUrl.startsWith("/brand/") ? job.outputUrl : null;
  return `/api/images/optimize?url=${encodeURIComponent(job.outputUrl)}&width=${width}`;
}

export function JobStatus({ job }: { job: GenerationJob }) {
  return (
    <span className={`studio-status studio-status-${job.status.toLowerCase()}`}>
      {!terminalGeneration(job.status) ? (
        <LoaderCircle size={13} className="studio-spinner" />
      ) : null}
      {job.status}
    </span>
  );
}

export function AssetCard({
  job,
  onOpen,
  preview = false,
  selected = false,
  compact = false,
}: {
  job: GenerationJob;
  onOpen: () => void;
  preview?: boolean;
  selected?: boolean;
  compact?: boolean;
}) {
  const src = jobImageSource(job, preview, 512);
  return (
    <button
      type="button"
      onClick={onOpen}
      className={`studio-asset${compact ? " studio-asset-compact" : ""}${selected ? " is-selected" : ""}`}
      aria-label={`Open ${job.displayName}, ${job.status}, ${jobDate(job.createdAt)}`}
      aria-pressed={compact ? selected : undefined}
    >
      <span className="studio-asset-image">
        {src ? (
          <Image
            src={src}
            alt=""
            fill
            sizes={
              compact
                ? "112px"
                : "(max-width: 600px) 100vw, (max-width: 1100px) 50vw, 25vw"
            }
            unoptimized
          />
        ) : (
          <span className="studio-asset-placeholder">
            {!terminalGeneration(job.status) ? (
              <LoaderCircle className="studio-spinner" size={26} />
            ) : (
              job.mediaType === "video" ? <Video size={28} /> : <ImageIcon size={28} />
            )}
            <span>{job.status}</span>
          </span>
        )}
      </span>
      {!compact ? (
        <span className="studio-asset-caption">
          <span className="studio-asset-title">
            {job.displayName}
            <JobStatus job={job} />
          </span>
          <span className="studio-asset-meta">
            {creditLabel(job)}
            <time dateTime={job.createdAt}>{jobDate(job.createdAt)}</time>
          </span>
        </span>
      ) : (
        <span className="studio-recent-label">{job.displayName}</span>
      )}
    </button>
  );
}
