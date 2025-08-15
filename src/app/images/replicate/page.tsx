'use client';

import ImageCard from '../../../components/ImageCard';
import ImageCardModal from '../../../components/ImageCardModal';
import { useEffect, useState } from 'react';
import { createReplicateJob, getJobStatus, getUserHistory } from '../../../lib/api';
import type { UiJob } from '../../../types/image-job';
import { useAuth } from '../../../context/AuthContext';
import { useImageHistory } from '../../../hooks/useImageHistory';
import { mapApiToUiJob } from '../../../lib/api';
import { normalizeUrl } from '../../../lib/api';





export default function ReplicatePage() {
  const [prompt, setPrompt] = useState('');
  const [selectedAspectRatio, setSelectedAspectRatio] = useState('1:1');
  const [quality, setQuality] = useState(3);
  const [images, setImages] = useState<UiJob[]>([]);
  const [selectedImageUrl, setSelectedImageUrl] = useState<string | null>(null);
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const { token } = useAuth();
  const { history, setHistory } = useImageHistory();


  

  useEffect(() => {
    if (!history) return;
    // converte jobs da API para o formato que sua UI já usa
    const ui = history
      .map(mapApiToUiJob)     // pega imageUrl OU imageUrls[0] e normaliza
      .filter(j => !!j.url);  

    setImages(ui);

    // mantém a mais recente selecionada no centro
    if (ui.length > 0) {
      setSelectedImageUrl(ui[0].url ?? null);
      setSelectedJobId(ui[0].id);
    } else {
      setSelectedImageUrl(null);
      setSelectedJobId(null);
    }
  }, [history]);



  async function handleGenerate() {
    if (!prompt.trim()) return;
    if (!token) {
      console.warn('Usuário não autenticado');
      return;
    }

    setLoading(true);
    setSelectedImageUrl(null);
    setSelectedJobId(null);

    const jobId = await createReplicateJob(prompt, selectedAspectRatio, token);
    const newJob: UiJob = {
      id: jobId,
      status: 'loading',
      url: null,
      aspectRatio: selectedAspectRatio,
    };

    setImages((prev: UiJob[]) => [newJob, ...prev]);

    const poll = setInterval(async () => {
      const content = await getJobStatus(jobId, token);
      if (!content) return;
      const status = content.status?.toUpperCase();

      const rawUrl =
        content.imageUrl ?? (Array.isArray(content.imageUrls) ? content.imageUrls[0] : null);

      if (status === 'COMPLETED') {
        clearInterval(poll);

        const fullUrl = normalizeUrl(rawUrl);

        setImages((prev: UiJob[]) =>
          prev.map((j: UiJob) => (j.id === jobId ? { ...j, status: 'done', url: fullUrl } : j))
        );
        setSelectedImageUrl(fullUrl);
        setSelectedJobId(jobId);

        const updatedHistory = await getUserHistory(token);
        setHistory(updatedHistory);

        setLoading(false);
      }

      if (status === 'FAILED') {
        clearInterval(poll);
        setImages(prev => prev.map(j => (j.id === jobId ? { ...j, status: 'done' } : j)));
        setLoading(false);
      }
    }, 2000);
  }

  // escolhe a imagem a ser exibida no centro
  const centerImageUrl = selectedImageUrl;

  return (
    <div className="flex h-full flex-1 flex-col lg:flex-row animate-fade-in">
      {/* Painel esquerdo: prompt e controles */}
      <div className="w-full lg:w-1/3 p-6 flex flex-col gap-6 h-full bg-black/40 backdrop-blur-lg animate-fade-in">
        <div className="flex flex-col gap-2 flex-1">
          <label className="text-sm text-gray-300">Prompt</label>
          <textarea
            value={prompt}
            onChange={e => setPrompt(e.target.value)}
            placeholder="Descreva a imagem..."
            className="flex-1 p-4 rounded-xl bg-gray-800/60 text-white resize-none placeholder-gray-500 border border-gray-700 focus:outline-none focus:ring-2 focus:ring-purple-500 transition-colors hover:bg-gray-700"
          />
        </div>
        <div className="flex flex-col gap-4">
          <div className="flex gap-2">
            {['1:1', '9:16', '16:9'].map(ratio => (
              <button
                key={ratio}
                onClick={() => setSelectedAspectRatio(ratio)}
                className={`px-4 py-2 rounded-lg text-sm transition-all transform hover:scale-105 ${
                  selectedAspectRatio === ratio
                    ? 'bg-purple-600 text-white'
                    : 'bg-gray-800 text-gray-300'
                } hover:bg-purple-500`}
              >
                {ratio}
              </button>
            ))}
          </div>

          <div className="space-y-1">
            <label className="text-sm text-gray-300">
              Velocidade x Qualidade ({quality})
            </label>
            <input
              type="range"
              min={1}
              max={5}
              value={quality}
              onChange={e => setQuality(Number(e.target.value))}
              className="w-full accent-purple-500"
            />
            <div className="flex justify-between text-xs text-gray-400">
              <span>Rápido</span>
              <span>Qualidade</span>
            </div>
          </div>

          <button
            onClick={handleGenerate}
            disabled={loading || !token}
            className="mt-2 w-full px-6 py-3 bg-gradient-to-r from-purple-600 to-purple-500 text-white font-medium rounded-xl transition-all duration-300 transform hover:from-purple-500 hover:to-purple-400 hover:scale-105 disabled:opacity-50"
          >
            {loading ? 'Gerando...' : 'Gerar'}
          </button>
        </div>
      </div>

      {/* Painel central: imagem selecionada ou estado de geração */}
      <div className="flex-1 p-4 flex items-center justify-center">
        {centerImageUrl ? (
          <ImageCard
            src={centerImageUrl}
            loading={false}
            onClick={() => {
              setModalOpen(true);
            }}
          />
        ) : loading ? (
          <ImageCard loading={true} onClick={() => {}} />
        ) : (
          <div className="text-gray-500 italic text-center">
            Digite um prompt e clique em &quot;Gerar&quot; para começar.
          </div>
        )}
      </div>

      {/* Painel direito: histórico */}
      {images.filter(img => img.status === 'done' && img.url).length > 0 && (
        <div className="w-full lg:w-1/5 p-4 h-full bg-black/30 backdrop-blur-md">
          <h3 className="text-white mb-2">Histórico</h3>
          <div className="grid grid-cols-3 sm:grid-cols-6 lg:grid-cols-1 gap-2 overflow-y-auto">
            {images
              .filter(img => img.status === 'done' && img.url)
              .map(job => (
                <img
                  key={job.id}
                  src={job.url!}
                  onClick={() => {
                    setSelectedImageUrl(job.url!);
                    setSelectedJobId(job.id);
                  }}
                  className={`cursor-pointer rounded-md border-2 object-cover w-24 h-24 transition-all transform hover:scale-105 ${
                    selectedImageUrl === job.url ? 'border-purple-500' : 'border-transparent'
                  } hover:border-purple-400`}
                  alt=""
                />
              ))}
          </div>
        </div>
      )}

      {/* Modal para ampliar imagem */}
      <ImageCardModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        jobId={selectedJobId}
      />
    </div>
  );
}
