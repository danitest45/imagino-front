export interface GenerationField {
  key: string;
  label: string;
  type: 'enum' | 'integer';
  defaultValue: string;
  options: string[];
}
export type GenerationModelIntent = 'recommended' | 'fast' | 'studio' | 'reference' | 'motion' | 'testing';
/** Optional catalog presentation data. It never controls billing or capabilities. */
export interface GenerationModelPresentation {
  intent?: GenerationModelIntent;
  providerName?: string;
  nativeDisplayName?: string;
  shortDescription?: string;
  descriptors?: string[];
}
export interface GenerationModel {
  id: string;
  version: string;
  displayName: string;
  category: string;
  description: string;
  mediaType: 'image' | 'video';
  providerModel: string;
  capabilities: string[];
  fields: GenerationField[];
  inputs: { role: string; label: string; maxCount: number }[];
  rules: { whenKey: string; whenValue: string; requireKey: string; allowedValues: string[] }[];
  availability: string;
  retirementAt?: string | null;
  startingCredits: number;
  presentation?: GenerationModelPresentation;
}
export interface GenerationInput { role: string; data: string }
export interface GenerationRequest {
  modelId: string;
  prompt: string;
  settings: Record<string, string | number>;
  inputs: GenerationInput[];
  quoteId?: string;
}
export interface GenerationQuote {
  quoteId: string;
  credits: number;
  providerCostEstimateUsd: number;
  expiresAt: string;
}
export interface GenerationJob {
  id: string;
  modelId: string;
  displayName: string;
  mediaType: 'image' | 'video';
  status: 'Queued' | 'Starting' | 'Processing' | 'Completed' | 'Failed' | 'Cancelled';
  creditState: 'Reserved' | 'Charged' | 'Refunded';
  credits: number;
  prompt: string;
  settings: Record<string, string>;
  outputUrl: string | null;
  errorCode: string | null;
  createdAt: string;
}
