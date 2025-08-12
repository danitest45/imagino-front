'use client';

import ImageCard from '../../../components/ImageCard';
import ImageCardModal from '../../../components/ImageCardModal';
import { useEffect, useState } from 'react';
import { createReplicateJob, getJobStatus } from '../../../lib/api';
import type { UiJob } from '../../../types/image-job';
import { useAuth } from '../../../context/AuthContext';
import { useImageHistory } from '../../../hooks/useImageHistory';
import { mapApiToUiJob } from '../../../lib/api';
import type { ImageJobApi } from '../../../types/image-job';
import { normalizeUrl } from '../../../lib/api'; 





export default function ReplicatePage() {
  const [prompt, setPrompt] = useState('');
  const [selectedAspectRatio, setSelectedAspectRatio] = useState('1:1');
  const [images, setImages] = useState<UiJob[]>([]);
  const [selectedImageUrl, setSelectedImageUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalPrompt, setModalPrompt] = useState('');
  const [modalImage, setModalImage] = useState('');
  const { token } = useAuth();
  const { history, setHistory, loading: historyLoading } = useImageHistory();


  

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
    } else {
      setSelectedImageUrl(null);
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

        setHistory((prev: ImageJobApi[]) => [
          {
            id: jobId,
            jobId,
            prompt,
            userId: 'me',
            status: 'done',
            imageUrl: rawUrl, // mantém como veio (sem normalizar) — o map normaliza
            imageUrls: content.imageUrls ?? (rawUrl ? [rawUrl] : []),
            aspectRatio: selectedAspectRatio,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
          ...prev,
        ]);

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
    <div className="max-w-6xl mx-auto space-y-8">
      <div className="text-center space-y-2">
        <h1 className="text-4xl font-bold">
          Imagino<span className="text-purple-500">.AI</span>
        </h1>
        <p className="text-gray-400">Gere imagens com modelos hospedados no Replicate.</p>
      </div>

      <div className="flex flex-col lg:flex-row gap-8 items-stretch">
        {/* Painel esquerdo: prompt e controles */}
        <div className="w-full lg:w-2/5 flex">
          <div className="bg-gray-900/70 border border-gray-800 rounded-xl p-6 space-y-4 flex-1">
            <div>
              <label className="block mb-2 text-sm text-gray-300">Prompt</label>
              <textarea
                value={prompt}
                onChange={e => setPrompt(e.target.value)}
                placeholder="Descreva a imagem..."
                className="w-full h-28 p-3 rounded-md bg-gray-800 text-white resize-none placeholder-gray-500 border border-gray-700 focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex gap-2">
                {['1:1', '9:16', '16:9'].map(ratio => (
                  <button
                    key={ratio}
                    onClick={() => setSelectedAspectRatio(ratio)}
                    className={`px-4 py-2 rounded-lg text-sm ${
                      selectedAspectRatio === ratio
                        ? 'bg-purple-600 text-white'
                        : 'bg-gray-800 text-gray-300'
                    } hover:bg-purple-500 transition`}
                  >
                    {ratio}
                  </button>
                ))}
              </div>

              <button
                onClick={handleGenerate}
                disabled={loading || !token}
                className="px-6 py-3 bg-purple-600 text-white font-medium rounded-xl hover:bg-purple-700 transition disabled:opacity-50"
              >
                {loading ? 'Gerando...' : 'Gerar'}
              </button>
            </div>
          </div>
        </div>

        {/* Painel central: imagem selecionada ou estado de geração */}
        <div className="flex-1 flex items-center justify-center">
          {centerImageUrl ? (
            <ImageCard
              src={centerImageUrl}
              loading={false}
              onClick={() => {
                setModalImage(centerImageUrl);
                setModalPrompt(prompt);
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
          <div className="w-full lg:w-1/6">
            <h3 className="text-white mb-2">Histórico</h3>
            <div className="flex flex-wrap lg:flex-col gap-2">
              {images
                .filter(img => img.status === 'done' && img.url)
                .map(job => (
                  <img
                    key={job.id}
                    src={job.url!}
                    onClick={() => setSelectedImageUrl(job.url!)}
                    className={`cursor-pointer rounded-md border-2 object-cover w-16 h-16 ${
                      selectedImageUrl === job.url ? 'border-purple-500' : 'border-transparent'
                    } hover:border-purple-400 transition`}
                    alt=""
                  />
                ))}
            </div>
          </div>
        )}
      </div>

      {/* Modal para ampliar imagem */}
      <ImageCardModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        src={modalImage}
        prompt={modalPrompt}
      />
    </div>
  );
}
