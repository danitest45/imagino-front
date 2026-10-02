import type { GenerationInput, GenerationModel, GenerationRequest } from '../types/generation';

export function defaultGenerationSettings(model: GenerationModel): Record<string, string | number> {
  return Object.fromEntries(model.fields.map(f => [f.key, f.type === 'integer' ? Number(f.defaultValue) : f.defaultValue]));
}
export function generationConstraintError(model: GenerationModel, request: GenerationRequest): string | null {
  for (const rule of model.rules) {
    if (String(request.settings[rule.whenKey]) === rule.whenValue && !rule.allowedValues.includes(String(request.settings[rule.requireKey]))) {
      return `${rule.whenKey} ${rule.whenValue} requires ${rule.requireKey}: ${rule.allowedValues.join(', ')}.`;
    }
  }
  if (request.inputs.some(i => i.role === 'lastFrame')) {
    if (!request.inputs.some(i => i.role === 'firstFrame')) return 'Add a first frame before a last frame.';
    if (String(request.settings.duration) !== '8') return 'First and last frames require an 8 second clip.';
  }
  return null;
}
export const terminalGeneration = (status: string) => ['Completed', 'Failed', 'Cancelled'].includes(status);
export function generationError(error: unknown): string {
  if (error && typeof error === 'object' && 'detail' in error && typeof error.detail === 'string') return error.detail;
  return error instanceof Error ? error.message : 'The request could not be completed. Please try again.';
}
export async function prepareGenerationInput(file: File, role: string): Promise<GenerationInput> {
  if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type) || file.size > 10 * 1024 * 1024) {
    throw new Error('Use a PNG, JPEG or WebP image up to 10 MB.');
  }
  const bitmap = await createImageBitmap(file);
  try {
    const scale = Math.min(1, 1024 / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Image preparation is unavailable in this browser.');
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const data = canvas.toDataURL('image/png');
    if (data.length > 2_796_225) throw new Error('This reference is too large after preparation. Try a smaller image.');
    return { role, data };
  } finally { bitmap.close(); }
}
