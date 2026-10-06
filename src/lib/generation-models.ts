import type { GenerationInput, GenerationModel, GenerationModelIntent } from '../types/generation';

/** Presentation adapter for the existing V2 catalog. Exact native IDs only: unknown
 * providers stay unnamed until the catalog supplies presentation metadata. */
const NATIVE_MODELS: Record<string, { providerName: string; nativeDisplayName: string }> = {
  'flux-2-klein-4b': { providerName: 'Black Forest Labs', nativeDisplayName: 'FLUX.2 Klein' },
  'flux-2-pro': { providerName: 'Black Forest Labs', nativeDisplayName: 'FLUX.2 Pro' },
  'gemini-3.1-flash-image': { providerName: 'Google', nativeDisplayName: 'Gemini 3.1 Flash Image' },
  'veo-3.1-lite-generate-preview': { providerName: 'Google', nativeDisplayName: 'Veo 3.1 Lite' },
  'veo-3.1-generate-preview': { providerName: 'Google', nativeDisplayName: 'Veo 3.1' },
  // Verified against the homologated catalog snapshots in OpenAiHomologationPolicy.
  'gpt-image-2.5-flare-2026-09-08': { providerName: 'OpenAI', nativeDisplayName: 'GPT Image 2.5 Flare' },
  'gpt-image-2.5-sunburst-2026-09-08': { providerName: 'OpenAI', nativeDisplayName: 'GPT Image 2.5 Sunburst' },
};
const CATALOG_INTENTS: Record<string, GenerationModelIntent> = {
  Recommended: 'recommended', Explore: 'fast', Create: 'studio', Refine: 'reference', Motion: 'motion', Staging: 'testing',
};
export const MODEL_INTENTS: { id: GenerationModelIntent; label: string }[] = [
  { id: 'recommended', label: 'Recommended' }, { id: 'fast', label: 'Fast' },
  { id: 'studio', label: 'Studio' }, { id: 'reference', label: 'Edit / Reference' },
  { id: 'motion', label: 'Motion' }, { id: 'testing', label: 'Pipeline testing' },
];
const CAPABILITY_LABELS: Record<string, string> = {
  textToImage: 'Text to image', textToVideo: 'Text to video', imageEditing: 'Editing',
  referenceImages: 'References', imageToImage: 'References', imageToVideo: 'Image to video',
  firstFrame: 'Start frame', lastFrame: 'End frame', nativeAudio: 'Native audio',
};

export function isGenerationModelReady(model: GenerationModel) {
  return model.availability === 'ready' || model.availability === 'synthetic_demo';
}

export function generationModelPresentation(model: GenerationModel) {
  const metadata = model.presentation;
  const native = NATIVE_MODELS[model.providerModel];
  const intent = metadata?.intent && MODEL_INTENTS.some(group => group.id === metadata.intent)
    ? metadata.intent
    : CATALOG_INTENTS[model.category] ?? (model.mediaType === 'video' ? 'motion' : model.inputs.length ? 'reference' : 'studio');
  const descriptors = [...new Set([
    ...(metadata?.descriptors ?? []),
    ...model.capabilities.map(capability => CAPABILITY_LABELS[capability]).filter(Boolean),
    ...(model.inputs.some(input => input.role === 'reference' && input.maxCount > 0) ? ['References'] : []),
  ])];
  return {
    intent,
    providerName: metadata?.providerName ?? native?.providerName,
    nativeDisplayName: metadata?.nativeDisplayName ?? native?.nativeDisplayName ?? model.providerModel,
    description: metadata?.shortDescription ?? model.description,
    descriptors,
  };
}

/** Grouping/search are presentation only: never mutate the live catalog contract. */
export function groupGenerationModels(models: GenerationModel[], query = '', referenceOnly = false) {
  const search = query.trim().toLocaleLowerCase();
  const matching = models.filter(model => {
    if (referenceOnly && !model.inputs.some(input => input.role === 'reference' && input.maxCount > 0)) return false;
    const view = generationModelPresentation(model);
    return !search || [model.displayName, model.providerModel, view.providerName, view.nativeDisplayName,
      view.description, ...view.descriptors].filter(Boolean).join(' ').toLocaleLowerCase().includes(search);
  });
  return MODEL_INTENTS.map(group => ({ ...group, models: matching.filter(model => generationModelPresentation(model).intent === group.id) }))
    .filter(group => group.models.length);
}

/** Preserve exact references and compatible settings; callers must confirm the
 * reported removals/changes before applying this plan. No asset is fetched here. */
export function planGenerationModelChange(
  next: GenerationModel,
  settings: Record<string, string | number>,
  inputs: GenerationInput[],
) {
  const nextSettings: Record<string, string | number> = {};
  for (const field of next.fields) {
    const previous = settings[field.key];
    const value = previous !== undefined && field.options.includes(String(previous)) ? String(previous) : field.defaultValue;
    nextSettings[field.key] = field.type === 'integer' ? Number(value) : value;
  }
  // A setting can be valid in isolation but incompatible with another preserved
  // field. Resolve only using the target catalog's declared options and rules.
  for (const rule of next.rules) {
    if (String(nextSettings[rule.whenKey]) !== rule.whenValue || rule.allowedValues.includes(String(nextSettings[rule.requireKey]))) continue;
    const field = next.fields.find(item => item.key === rule.requireKey);
    if (!field) continue;
    const value = [field.defaultValue, ...field.options].find(option => rule.allowedValues.includes(option) && field.options.includes(option));
    if (value !== undefined) nextSettings[field.key] = field.type === 'integer' ? Number(value) : value;
  }
  const changedSettings = Object.keys(settings).filter(key => String(settings[key]) !== String(nextSettings[key]))
    .map(key => next.fields.find(field => field.key === key)?.label ?? key);
  const retained: GenerationInput[] = [];
  const removed: GenerationInput[] = [];
  for (const input of inputs) {
    const spec = next.inputs.find(item => item.role === input.role);
    if (spec && retained.filter(item => item.role === input.role).length < spec.maxCount) retained.push(input);
    else removed.push(input);
  }
  return { settings: nextSettings, inputs: retained, removedInputs: removed, changedSettings,
    requiresConfirmation: removed.length > 0 || changedSettings.length > 0 };
}
