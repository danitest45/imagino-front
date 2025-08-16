'use client';

import { useState } from 'react';
import ImageCard from '../components/ImageCard';
import ImageCardModal from '../components/ImageCardModal';

const mockImages = [
  { id: 'mock1', url: 'https://picsum.photos/seed/imagino1/500/600' },
  { id: 'mock2', url: 'https://picsum.photos/seed/imagino2/600/500' },
  { id: 'mock3', url: 'https://picsum.photos/seed/imagino3/500/500' },
  { id: 'mock4', url: 'https://picsum.photos/seed/imagino4/400/600' },
  { id: 'mock5', url: 'https://picsum.photos/seed/imagino5/600/400' },
  { id: 'mock6', url: 'https://picsum.photos/seed/imagino6/500/650' },
  { id: 'mock7', url: 'https://picsum.photos/seed/imagino7/650/500' },
  { id: 'mock8', url: 'https://picsum.photos/seed/imagino8/550/550' },
  { id: 'mock9', url: 'https://picsum.photos/seed/imagino9/500/700' },
  { id: 'mock10', url: 'https://picsum.photos/seed/imagino10/700/500' },
  { id: 'mock11', url: 'https://picsum.photos/seed/imagino11/600/600' },
  { id: 'mock12', url: 'https://picsum.photos/seed/imagino12/450/600' },
];

export default function Home() {
  const [modalOpen, setModalOpen] = useState(false);
  const [selected, setSelected] = useState<{ id: string; url: string } | null>(null);

  return (
    <main className="max-w-7xl mx-auto px-4">
      <section className="text-center py-10">
        <h1 className="text-4xl font-bold animate-fade-in">Descubra criações incríveis</h1>
        <p className="mt-2 text-gray-400 animate-fade-in">
          Galeria de imagens geradas pela comunidade Imagino.AI
        </p>
      </section>

      <div className="columns-2 sm:columns-3 md:columns-4 gap-4">
        {mockImages.map((img) => (
          <div key={img.id} className="mb-4 break-inside-avoid">
            <ImageCard
              src={img.url}
              onClick={() => {
                setSelected(img);
                setModalOpen(true);
              }}
            />
          </div>
        ))}
      </div>

      <ImageCardModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        jobId={selected?.id ?? null}
        fallbackUrl={selected?.url}
      />
    </main>
  );
}
