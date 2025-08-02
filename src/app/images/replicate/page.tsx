'use client';

import ImageCard from '../../../components/ImageCard';
import ImageCardModal from '../../../components/ImageCardModal';
import { useState } from 'react';

interface Job {
  id: string;
  status: 'loading' | 'done';
  url: string | null;
  resolution?: { width: number; height: number };
  aspectRatio: string;

}

export default function ReplicatePage() {
  const [prompt, setPrompt] = useState('');
  const [selectedAspectRatio, setSelectedAspectRatio] = useState("1:1");
  const [submittedAspectRatio, setSubmittedAspectRatio] = useState("1:1");  const [images, setImages] = useState<Job[]>([]);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalPrompt, setModalPrompt] = useState('');
  const [modalImage, setModalImage] = useState('');
  const currentImage = images[0];
  const isLoading = currentImage?.status === 'loading';
  const src = currentImage?.status === 'done' && currentImage?.url ? currentImage.url : '';

  const handleGenerate = async () => {
    if (!prompt.trim()) return;
    
    setLoading(true);
    setSubmittedAspectRatio(selectedAspectRatio);

    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/replicate/jobs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt,   aspectRatio: selectedAspectRatio }),
    });

    const json = await res.json();
    const jobId = json?.content?.jobId;

    const newJob: Job = {
      id: jobId,
      status: 'loading',
      url: null,
      aspectRatio: selectedAspectRatio
    };

    setImages((prev) => [newJob, ...prev]);

    const poll = setInterval(async () => {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/jobs/${jobId}`);
      const json = await res.json();
      const content = json?.content;
      const status = content?.status?.toUpperCase();
      debugger

      if (status === 'COMPLETED' && content?.imageUrl) {
        clearInterval(poll);

        const imageUrl = `${process.env.NEXT_PUBLIC_API_URL}${content.imageUrl}`;

        setImages((prev) =>
          prev.map((img) =>
            img.id === jobId ? { ...img, status: 'done', url: imageUrl } : img
          )
        );
        setSelectedImage(imageUrl);
      }

      if (status === 'FAILED') {
        clearInterval(poll);
        setImages((prev) =>
          prev.map((img) => (img.id === jobId ? { ...img, status: 'done', url: null } : img))
        );
      }
    }, 2000);

    setLoading(false);
  };

  return (
    <main className="flex h-[calc(100vh-5rem)] bg-gray-950 text-white">
      {/* Lado esquerdo – Prompt */}
      <aside className="w-1/3 p-6 border-r border-gray-800 flex flex-col space-y-6">
        <div>
          <h2 className="text-lg font-semibold mb-2">Prompt</h2>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Descreva a imagem..."
            className="w-full h-28 p-3 rounded-md bg-gray-800 text-white resize-none"
          />
        </div>

        <div>
          <label className="block mb-1">Proporção</label>
            <div className="flex gap-2">
            <button
              onClick={() => setSelectedAspectRatio("1:1")}
              className={`px-4 py-2 rounded-md ${
                selectedAspectRatio === "1:1" ? 'bg-purple-600' : 'bg-gray-800'
              }`}
            >
              1:1
            </button>
            <button
              onClick={() => setSelectedAspectRatio("9:16")}
              className={`px-4 py-2 rounded-md ${
                selectedAspectRatio === "9:16" ? 'bg-purple-600' : 'bg-gray-800'
              }`}
            >
              9:16
            </button>
            <button
              onClick={() => setSelectedAspectRatio("16:9")}
              className={`px-4 py-2 rounded-md ${
                selectedAspectRatio === "16:9" ? 'bg-purple-600' : 'bg-gray-800'
              }`}
            >
              16:9
            </button>
          </div>
        </div>

        <button
          onClick={handleGenerate}
          className="bg-purple-600 hover:bg-purple-700 text-white py-2 rounded-lg"
        >
          {loading ? 'Gerando...' : 'Gerar Imagem'}
        </button>
      </aside>

      {/* Imagem ao centro */}
      <section className="flex-1 p-6 flex justify-center items-start">
        <div
          className={`
            relative 
            ${submittedAspectRatio === '1:1' ? 'w-[512px] h-[512px]' : ''}
            ${submittedAspectRatio === '9:16' ? 'w-[384px] h-[640px]' : ''}
            ${submittedAspectRatio === '16:9' ? 'w-[640px] h-[360px]' : ''}
          `}
        >
          <ImageCard
            src={src}
            loading={isLoading}
            onClick={() => {
              if (currentImage?.url) {
                setModalImage(currentImage.url);
                setModalPrompt(prompt);
                setModalOpen(true);
              }
            }}
          />
        </div>
      </section>



      {/* Histórico à direita */}
      <aside className="w-[180px] p-4 border-l border-gray-800 overflow-y-auto bg-gray-900">
        <h3 className="text-white text-lg font-medium mb-3">Histórico</h3>
        <div className="flex flex-col gap-3">
          {images
            .filter((img) => img.status === 'done' && img.url)
            .map((img, i) => (
              <img
                key={i}
                src={img.url!}
                alt={`Histórico ${i}`}
                onClick={() => setSelectedImage(img.url!)}
                className={`cursor-pointer rounded-md border-2 w-[80px] h-[80px] object-cover ${
                  selectedImage === img.url ? 'border-purple-500' : 'border-transparent'
                } hover:border-purple-400 transition`}
              />

            ))}
        </div>
      </aside>

      {/* Modal */}
      <ImageCardModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        src={modalImage}
        prompt={modalPrompt}
      />
    </main>
  );
}
