'use client';

import ImageCard from '../../../components/ImageCard';
import { useState } from 'react';
import ImageCardModal from '../../../components/ImageCardModal';
import { useImageJobs } from '../../../hooks/useImageJobs';
export default function Home() {
    const [modalOpen, setModalOpen] = useState(false);
    const [modalJobId, setModalJobId] = useState<string | null>(null);
    const [prompt, setPrompt] = useState('');
    const [loading, setLoading] = useState(false);
    const [resolution, setResolution] = useState({ width: 1024, height: 1024 });
    const { jobs, submitPrompt } = useImageJobs();

    

const handleSubmit = async () => {
  if (!prompt.trim()) return;
  setLoading(true);
  await submitPrompt(prompt, resolution);
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
      {jobs.map((job) => (
        <div key={job.id} className="grid grid-cols-2 gap-4 w-full">
          {job.status === 'loading'
            ? Array.from({ length: 4 }).map((_, i) => (
                <ImageCard
                  key={`${job.id}-${i}`}
                  loading={true}
                  onClick={() => {}}
                />
              ))
            : job.urls?.map((url, i) => (
                <ImageCard
                  key={`${job.id}-${i}`}
                  src={url}
                  loading={false}
                  onClick={() => {
                    setModalJobId(job.id);
                    setModalOpen(true);
                  }}
                />
              ))}
        </div>
      ))}
    </div>

    <ImageCardModal
      isOpen={modalOpen}
      onClose={() => setModalOpen(false)}
      jobId={modalJobId}
    />
  </main>
);

}
