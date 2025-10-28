import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { listImageModels } from '../../lib/api';

export default async function ImagesIndexPage() {
  const cookieStore = cookies();
  const cookieHeader = cookieStore.size > 0 ? cookieStore.toString() : undefined;

  let models = [] as Awaited<ReturnType<typeof listImageModels>>;
  try {
    models = await listImageModels(
      cookieHeader
        ? { headers: { cookie: cookieHeader } }
        : undefined,
    );
  } catch (error) {
    console.error('Failed to load image models', error);
  }

  if (models.length === 0) {
    return (
      <div className="flex h-full min-h-[320px] items-center justify-center text-center text-sm text-gray-300">
        No image models available.
      </div>
    );
  }

  const preferredModel = process.env.NEXT_PUBLIC_DEFAULT_IMAGE_MODEL;
  const targetSlug = preferredModel && models.some(model => model.slug === preferredModel)
    ? preferredModel
    : models[0]?.slug;

  if (!targetSlug) {
    return (
      <div className="flex h-full min-h-[320px] items-center justify-center text-center text-sm text-gray-300">
        No image models available.
      </div>
    );
  }

  redirect(`/images/${targetSlug}`);
  return null;
}
