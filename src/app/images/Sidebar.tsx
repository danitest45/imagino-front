import Link from 'next/link';
import { listImageModels } from '@/lib/api';

export default async function Sidebar() {
  const models = await listImageModels();

  return (
    <nav className="p-4">
      <h2 className="text-sm uppercase tracking-widest text-white/60 mb-3">
        Modelos
      </h2>

      <ul className="space-y-1">
        {models.map((m) => (
          <li key={m.slug}>
            <Link
              href={`/images/${m.slug}`}
              className="flex items-center justify-between rounded px-2 py-2 hover:bg-white/5 transition"
            >
              <span className="text-sm">{m.displayName || m.slug}</span>
              <span
                className={`text-[10px] px-2 py-0.5 rounded-full ${
                  m.visibility === 'Premium'
                    ? 'bg-fuchsia-600/20 text-fuchsia-300'
                    : 'bg-emerald-600/20 text-emerald-300'
                }`}
              >
                {m.visibility === 'Premium' ? 'Premium' : 'Public'}
              </span>
            </Link>
          </li>
        ))}
      </ul>

      {models.length === 0 && (
        <p className="text-xs text-white/50 mt-2">Nenhum modelo disponível.</p>
      )}
    </nav>
  );
}
