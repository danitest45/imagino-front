const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? '';

interface ImageModel {
  slug: string;
  displayName: string;
  status: string;
}

export default async function ModelsPage() {
  const res = await fetch(`${API_BASE}/api/image/models?visibility=public`, {
    cache: 'no-store',
  });

  if (!res.ok) {
    throw new Error('Failed to fetch image models');
  }

  const models: ImageModel[] = await res.json();

  return (
    <main className="p-6 text-white">
      <h1 className="text-xl font-semibold mb-4">Modelos disponíveis</h1>
      <ul className="space-y-2">
        {models.map((model) => {
          const statusLabel =
            model.status?.toLowerCase() === 'active' ? 'Active' : 'Inactive';

          return (
            <li key={model.slug}>
              <strong>{model.displayName}</strong> ({model.slug}) — {statusLabel}
            </li>
          );
        })}
      </ul>
    </main>
  );
}
