export interface ImageModelPreset {
  id: string;
  name: string;
  description?: string | null;
  params?: Record<string, unknown> | null;
}

export interface PublicImageModelVersion {
  versionTag: string;
  status?: string | null;
}

export interface PublicImageModelSummary {
  slug: string;
  displayName: string;
  visibility: string;
  status: string;
  defaultVersionTag?: string | null;
  presets?: ImageModelPreset[];
}

export interface PublicImageModelDetails extends PublicImageModelSummary {
  versions?: PublicImageModelVersion[];
}
