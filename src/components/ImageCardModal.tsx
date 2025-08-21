'use client';

import React, { useEffect, useState } from 'react';
import { X, Share2, Download } from 'lucide-react';
import { getJobDetails } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import type { JobDetails } from '../types/image-job';
import { downloadJob } from '../lib/download';

type Props = {
  isOpen: boolean;
  onClose: () => void;
  jobId: string | null;
  fallbackUrl?: string;
};

/**
 * Modal para exibir detalhes de uma imagem buscando dados do backend.
 */
export default function ImageCardModal({ isOpen, onClose, jobId, fallbackUrl }: Props) {
  const { token } = useAuth();
  const [details, setDetails] = useState<JobDetails | null>(null);

  useEffect(() => {
    if (!isOpen || !jobId || !token) {
      setDetails(null);
      return;
    }

    setDetails(null);
    let ignore = false;
    (async () => {
      try {
        const data = await getJobDetails(jobId);
        if (!ignore) setDetails(data);
      } catch {
        if (!ignore) setDetails(null);
      }
    })();
    return () => {
      ignore = true;
    };
  }, [isOpen, jobId, token]);

  if (!isOpen) return null;

  const date = details ? new Date(details.createdAt).toLocaleString() : '';
  const imageUrl = details?.imageUrl ?? fallbackUrl;
  if (!imageUrl) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
      onClick={onClose}
    >
      <div
        className="bg-gray-900 text-gray-100 max-w-6xl w-full h-full md:h-auto md:max-h-[90vh] rounded-lg overflow-hidden flex flex-col md:flex-row"
        onClick={e => e.stopPropagation()}
      >
        {/* Image */}
        <div className="flex-1 bg-black flex items-center justify-center p-4">
          <img src={imageUrl} alt="Full image" className="max-h-full max-w-full object-contain" />
        </div>

        {/* Information */}
        <div className="w-full md:w-80 lg:w-96 border-t md:border-t-0 md:border-l border-gray-800 p-6 flex flex-col gap-4 overflow-y-auto">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <p className="font-semibold">{details?.username}</p>
              <p className="text-xs text-gray-400">{date}</p>
            </div>
            <button onClick={onClose} className="text-gray-400 hover:text-white">
              <X size={20} />
            </button>
          </div>

          <div className="flex gap-3">
            <button className="flex items-center gap-1 text-xs px-2 py-1 rounded bg-gray-800 hover:bg-gray-700" disabled={!details}>
              <Share2 size={14} /> Share
            </button>
              {jobId && (
                <button
                  type="button"
                  className="flex items-center gap-1 text-xs px-2 py-1 rounded bg-gray-800 hover:bg-gray-700"
                  onClick={() => downloadJob(jobId)}
                >
                  <Download size={14} /> Download
                </button>
              )}
          </div>

          <div className="text-sm space-y-1">
            <p>
              <span className="font-semibold">Resolution:</span> {details?.aspectRatio}
            </p>
          </div>

          <div>
            <h4 className="text-sm font-semibold mb-1">Prompt</h4>
            <p className="text-sm text-gray-300 whitespace-pre-wrap break-words">{details?.prompt}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
