export interface PublicImageModelSummary {
  slug: string;
  displayName: string;
}

export interface ImageModelVersionSummary {
  id: string;
  tag: string;
  displayName?: string;
  status?: string;
}

export interface ImageModelDetails {
  slug: string;
  displayName: string;
  capabilities: string[];
  visibility?: string;
  status?: string;
  defaultVersionTag: string;
  versions: ImageModelVersionSummary[];
}

export interface JsonSchemaProperty {
  type?: string;
  title?: string;
  description?: string;
  enum?: unknown[];
  minimum?: number;
  maximum?: number;
  multipleOf?: number;
  format?: string;
  default?: unknown;
  contentMediaType?: string;
  minLength?: number;
  maxLength?: number;
}

export interface JsonSchema {
  type?: string;
  properties?: Record<string, JsonSchemaProperty>;
  required?: string[];
}

export interface ImageModelVersionDetails {
  id: string;
  tag: string;
  paramSchema?: JsonSchema | null;
  defaults?: Record<string, unknown> | null;
}
