import { redirect } from 'next/navigation';
import { listImageModels } from '../../lib/api';

export default async function ImagesPage() {
  let models: Awaited<ReturnType<typeof listImageModels>>;
  try {
    models = await listImageModels();
  } catch (err) {
    const detail =
      typeof err === 'object' && err !== null && 'detail' in err
        ? (err as { detail?: unknown }).detail
        : null;
    const message = typeof detail === 'string' ? detail : null;
    return (
      <div className="flex min-h-[60vh] items-center justify-center text-center text-white">
        <div className="space-y-2">
          <h2 className="text-2xl font-semibold">Falha ao carregar modelos públicos</h2>
          <p className="text-sm text-gray-300">{message ?? 'Tente novamente mais tarde.'}</p>
        </div>
      </div>
    );
  }

  if (!models.length) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center text-center text-white">
        <div className="space-y-2">
          <h2 className="text-2xl font-semibold">Nenhum modelo público disponível</h2>
          <p className="text-sm text-gray-300">Tente novamente mais tarde.</p>
        </div>
      </div>
    );
  }

  const preferredSlug = process.env.NEXT_PUBLIC_DEFAULT_IMAGE_MODEL?.toLowerCase();
  const targetModel = preferredSlug
    ? models.find(model => model.slug.toLowerCase() === preferredSlug)
    : undefined;

  const slug = (targetModel ?? models[0]).slug.toLowerCase();

  redirect(`/images/${slug}`);
}
