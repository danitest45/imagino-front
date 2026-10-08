import type { GenerationJob, GenerationModel } from "../types/generation";

export type AssetMediaFilter = "all" | GenerationJob["mediaType"];
export interface AssetFilters {
  media?: AssetMediaFilter;
  query?: string;
  model?: string;
  status?: string;
}

/** Filters describe the loaded, owned history; they never imply a global asset index. */
export function assetMediaFilters(jobs: GenerationJob[]): AssetMediaFilter[] {
  return ["all", ...(["image", "video"] as const).filter((media) => jobs.some((job) => job.mediaType === media))];
}

export function filterAssets(jobs: GenerationJob[], filters: AssetFilters): GenerationJob[] {
  const query = filters.query?.trim().toLocaleLowerCase("en-US") ?? "";
  return jobs.filter((job) =>
    (!filters.media || filters.media === "all" || job.mediaType === filters.media) &&
    (!filters.model || job.modelId === filters.model) &&
    (!filters.status || (filters.status === "Refunded" ? job.creditState === "Refunded" : job.status === filters.status)) &&
    `${job.prompt} ${job.displayName} ${job.status} ${job.creditState}`.toLocaleLowerCase("en-US").includes(query),
  );
}

export function catalogSupportsReference(models: GenerationModel[]): boolean {
  // Preparing an input is supported even if spending is currently unavailable.
  // Generate remains gated by the destination model's live availability and quote.
  return models.some((model) => model.mediaType === "image" && model.inputs.some((input) => input.role === "reference" && input.maxCount > 0));
}

export function catalogSupportsAnimate(models: GenerationModel[]): boolean {
  // Preparing an owned first frame makes no provider call. Cost/availability
  // guards still block quoting and submission for a disabled destination.
  return models.some(model => model.mediaType === "video" && !["retired", "migration_required"].includes(model.availability) &&
    model.capabilities.includes("imageToVideo") && model.inputs.some(input => input.role === "firstFrame" && input.maxCount > 0 && input.ownedAssetOnly));
}

export type AssetActionId = "reference" | "animate" | "reuse" | "download";
export interface AssetAction {
  id: AssetActionId;
  label: string;
  primary?: boolean;
}
const assetActions: readonly AssetAction[] = [
  { id: "reference", label: "Use as reference", primary: true },
  { id: "animate", label: "Animate" },
  { id: "reuse", label: "Reuse prompt & settings" },
  { id: "download", label: "Download" },
];

/** UI policy only: the API still enforces ownership for each download/history request. */
export function availableAssetActions(job: GenerationJob, context: { owned: boolean; canReference: boolean; canAnimate?: boolean }): AssetAction[] {
  if (!context.owned) return [];
  return assetActions.filter((action) => {
    if (action.id === "reuse") return true; // Failed/cancelled jobs retain useful prompts.
    if (job.status !== "Completed") return false;
    if (action.id === "reference") return job.mediaType === "image" && context.canReference;
    if (action.id === "animate") return job.mediaType === "image" && !!context.canAnimate;
    return true;
  });
}
