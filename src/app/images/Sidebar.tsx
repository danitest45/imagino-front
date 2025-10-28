import Link from 'next/link';
import { cookies } from 'next/headers';
import { listImageModels, type ImageModelSummary } from '../../lib/api';

function getBadgeLabel(model: ImageModelSummary): string {
  const visibility = model.visibility?.toLowerCase();
  if (visibility === 'public') return 'Public';
  if (visibility === 'premium') return 'Premium';
  return visibility ? visibility.charAt(0).toUpperCase() + visibility.slice(1) : 'Public';
}

export default async function Sidebar() {
  const cookieStore = cookies();
  const cookieHeader = cookieStore.size > 0 ? cookieStore.toString() : undefined;

  let models: ImageModelSummary[] = [];
  try {
    models = await listImageModels(
      cookieHeader
        ? { headers: { cookie: cookieHeader } }
        : undefined,
    );
  } catch (error) {
    console.error('Failed to load image models', error);
  }

  return (
    <aside className="w-full flex-shrink-0 rounded-3xl border border-white/5 bg-black/30 p-6 shadow-[0_25px_80px_-45px_rgba(168,85,247,0.55)] backdrop-blur-xl lg:w-72 lg:p-8">
      <div className="space-y-3">
        <span className="inline-flex items-center rounded-full border border-white/15 bg-white/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.3em] text-fuchsia-100">
          imagino.AI
        </span>
        <div>
          <h2 className="text-xl font-semibold text-white">Image models</h2>
          <p className="mt-2 text-sm text-gray-400">
            Choose the engine to generate your image.
          </p>
        </div>
      </div>

      <nav className="mt-8 space-y-2">
        {models.length === 0 ? (
          <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-5 text-sm text-gray-300">
            No models available.
          </div>
        ) : (
          models.map(model => (
            <Link
              key={model.slug}
              href={`/images/${model.slug}`}
              className="group flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-4 py-4 text-sm text-gray-200 transition hover:border-fuchsia-400/60 hover:bg-fuchsia-500/10 hover:text-white"
            >
              <span className="font-medium text-white">{model.name}</span>
              <span className="rounded-full border border-white/15 bg-black/40 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-fuchsia-100">
                {getBadgeLabel(model)}
              </span>
            </Link>
          ))
        )}
      </nav>
    </aside>
  );
}
