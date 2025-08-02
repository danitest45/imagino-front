'use client';

import ImageCard from '../../../components/ImageCard';
import { useState } from 'react';
import ImageCardModal from '../../../components/ImageCardModal';



interface JobCreationResponse {
  success: boolean;
    errors: { message: string }[];  
    content: {
    jobId: string;
  };
}
export default function Home() {
    type GeneratedImage = {
      id: string;
      status: 'loading' | 'done';
      url: string | null;
      resolution: { width: number; height: number };
    };

    const [images, setImages] = useState<GeneratedImage[]>([]);

    const [modalOpen, setModalOpen] = useState(false);
    const [modalImage, setModalImage] = useState('');
    const [modalPrompt, setModalPrompt] = useState('');
    const [prompt, setPrompt] = useState('');
    const [jobId, setJobId] = useState('');
    const [loading, setLoading] = useState(false);
    const [resolution, setResolution] = useState({ width: 1024, height: 1024 });

    

const handleSubmit = async () => {
  if (!prompt.trim()) return;

  setLoading(true);
  setModalImage('');
  setModalPrompt('');

  // Gera 1 job no endpoint XL (que cria 4 imagens)
const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/comfy`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    prompt,
    negativePrompt: 'low quality, blurry',
    width: resolution.width,
    height: resolution.height,
    numInferenceSteps: 30,
    refinerInferenceSteps: 50,
    guidanceScale: 7.5,
    scheduler: 'K_EULER'
  }),
});

const data: JobCreationResponse = await response.json();
const jobId = data.content.jobId;

  // Inicializa os placeholders
  const newJobs = Array.from({ length: 4 }).map((_, index) => ({
    id: `${jobId}-img${index + 1}`,
    status: 'loading' as const,
    url: null,
    resolution,
  }));


  setImages((prev) => [...newJobs, ...prev]);

  // Faz o polling de cada imagem
  newJobs.forEach((job, index) => {
    const poll = setInterval(async () => {
  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/jobs/${jobId}`);
    if (!res.ok) return;

    const json = await res.json();
    const content = json.content;

    if (!content || !content.status) return;

    const status = content.status.toUpperCase();
    if (status === 'IN_QUEUE' || status === 'PROCESSING') return;

    if (status === 'COMPLETED' && content.imageUrls?.length) {
      clearInterval(poll);

      const completedJobs = content.imageUrls.map((url: string, index: number) => ({
        id: `${jobId}-img${index + 1}`,
        status: 'done' as const,
        url: `${process.env.NEXT_PUBLIC_API_URL}${url}`,
        resolution,
      }));

      setImages((prev) =>
        prev.map((img) => {
          const found = completedJobs.find((c: { id: string; }) => c.id === img.id);
          return found ? found : img;
        })
      );
    }

    if (status === 'FAILED') {
      clearInterval(poll);
      setImages((prev) =>
        prev.map((img) =>
          img.id.startsWith(jobId) ? { ...img, status: 'done', url: null } : img
        )
      );
    }
  } catch (e) {
    console.error('Erro no polling geral:', e);
  }
}, 2000);

  });

  setModalPrompt(prompt);
  setLoading(false);
};



    return (
  <main className="min-h-screen bg-gray-950 text-white w-full">
    <div className="w-full max-w-6xl mx-auto px-4 pt-28 space-y-12">
      {/* Título */}
      <div className="text-center">
        <h1 className="text-4xl md:text-5xl font-bold text-white">
          Imagino<span className="text-purple-500">.AI</span>
        </h1>
        <p className="text-gray-400 mt-2">
          Transforme ideias em imagens com inteligência artificial.
        </p>
      </div>

      {/* Formulário de prompt */}
        <div className="flex flex-col gap-3 w-full">
          {/* Campo de prompt com botão de config */}
          <div className="relative w-full">
            <input
              type="text"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Digite seu prompt aqui..."
              className="w-full px-4 py-3 pr-12 rounded-xl bg-gray-800 text-white placeholder-gray-500 border border-gray-700 focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
            <button
              onClick={() => alert('Configurações avançadas em breve')}
              className="absolute top-1/2 right-3 transform -translate-y-1/2 text-gray-400 hover:text-white"
              title="Mais configurações em breve"
            >
              ⚙️
            </button>
          </div>

          {/* Resolução + botão gerar */}
            <div className="flex flex-wrap gap-2 justify-between items-center">
              <div className="flex gap-2">
                <button
                  onClick={() => setResolution({ width: 1024, height: 1024 })}
                  className={`px-4 py-2 rounded-lg text-sm ${
                    resolution.width === 1024 ? 'bg-purple-600 text-white' : 'bg-gray-800 text-gray-300'
                  } hover:bg-purple-500 transition`}
                >
                  🟪 1:1
                </button>
                <button
                  onClick={() => setResolution({ width: 768, height: 1152 })}
                  className={`px-4 py-2 rounded-lg text-sm ${
                    resolution.width === 768 ? 'bg-purple-600 text-white' : 'bg-gray-800 text-gray-300'
                  } hover:bg-purple-500 transition`}
                >
                  📱 2:3
                </button>
                <button
                  onClick={() => setResolution({ width: 1152, height: 768 })}
                  className={`px-4 py-2 rounded-lg text-sm ${
                    resolution.width === 1152 ? 'bg-purple-600 text-white' : 'bg-gray-800 text-gray-300'
                  } hover:bg-purple-500 transition`}
                >
                  🖼️ 3:2
                </button>
              </div>

              <button
                onClick={handleSubmit}
                disabled={loading}
                className="px-6 py-3 bg-purple-600 text-white font-medium rounded-xl hover:bg-purple-700 transition disabled:opacity-50"
              >
                {loading ? 'Gerando...' : 'Gerar'}
              </button>
            </div>
        </div>


      {/* Resultado gerado (caso esteja pronto) */}
      {images.length > 0 && (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8">
        {images.map((img, index) => (
          <div
            key={img.id + index}
            className={`relative w-full overflow-hidden rounded-xl border border-gray-700
              ${img.resolution.width === img.resolution.height
                ? 'aspect-square'
                : img.resolution.width > img.resolution.height
                ? 'aspect-[3/2]'
                : 'aspect-[2/3]'}
            `}
          >
            {img.status === 'loading' ? (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-10 h-10 border-4 border-purple-500 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : (
              img.url && (
                <ImageCard
                  src={img.url}
                  onClick={() => {
                    setModalImage(img.url as string);
                    setModalPrompt(prompt);
                    setModalOpen(true);
                  }}
                />
              )
            )}
          </div>

        ))}

      </div>
      )}
    </div>

    <ImageCardModal
      isOpen={modalOpen}
      onClose={() => setModalOpen(false)}
      src={modalImage}
      prompt={modalPrompt}
    />
  </main>
);

}
