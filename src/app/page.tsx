'use client';

import { useState } from 'react';
import ImageCard from '../components/ImageCard';

const categories = [
  'Trending',
  'AI',
  '3D',
  'Photography',
  'Art',
  'Anime',
  'Food',
  'Sci-Fi',
];

const mockImages: string[] = [
  'https://picsum.photos/seed/imagino1/500/600',
  'https://picsum.photos/seed/imagino2/600/500',
  'https://picsum.photos/seed/imagino3/500/500',
  'https://picsum.photos/seed/imagino4/400/600',
  'https://picsum.photos/seed/imagino5/600/400',
  'https://picsum.photos/seed/imagino6/500/650',
  'https://picsum.photos/seed/imagino7/650/500',
  'https://picsum.photos/seed/imagino8/550/550',
  'https://picsum.photos/seed/imagino9/500/700',
  'https://picsum.photos/seed/imagino10/700/500',
  'https://picsum.photos/seed/imagino11/600/600',
  'https://picsum.photos/seed/imagino12/450/600',
];

export default function Home() {
  const [selectedCategory, setSelectedCategory] = useState('Trending');
  const [preview, setPreview] = useState<string | null>(null);

  return (
    <main className="max-w-7xl mx-auto px-4">
      <section className="text-center py-10">
        <h1 className="text-4xl font-bold animate-fade-in">Descubra criações incríveis</h1>
        <p className="mt-2 text-gray-400 animate-fade-in">
          Galeria de imagens geradas pela comunidade Imagino.AI
        </p>
      </section>

      <div className="flex flex-wrap justify-center gap-3 mb-8">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={`px-4 py-1 rounded-full text-sm transition-colors duration-200 animate-fade-in ${
              selectedCategory === cat
                ? 'bg-purple-600 text-white'
                : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
        {mockImages.map((src, idx) => (
          <ImageCard key={idx} src={src} onClick={() => setPreview(src)} />
        ))}
      </div>

      {preview && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
          onClick={() => setPreview(null)}
        >
          <img
            src={preview}
            alt="Preview"
            className="max-h-[90vh] max-w-full object-contain animate-fade-in"
          />
        </div>
      )}
    </main>
  );
}
