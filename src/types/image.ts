export interface PublicImageModelPresetSummary {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  thumbnail: string | null;
  ordering: number;
  visibility: 'Public' | 'Premium' | 'Internal';
}

export interface PublicImageModelVersionSummary {
  versionTag: string;
  status: 'Active' | 'Canary' | 'Deprecated';
}

export interface PublicImageModelSummary {
  slug: string;
  displayName: string;
  capabilities?: { image: boolean; inpaint: boolean; upscale: boolean };
  visibility: 'Public' | 'Premium' | 'Internal';
  status: 'Active' | 'Deprecated';
  defaultVersionTag?: string;
  presets?: PublicImageModelPresetSummary[];
}

export interface PublicImageModelDetails extends PublicImageModelSummary {
  versions?: PublicImageModelVersionSummary[];
}
