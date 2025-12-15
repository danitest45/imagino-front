'use client';

import Link from 'next/link';
import ImageCard from '../../../components/ImageCard';
import ImageCardModal from '../../../components/ImageCardModal';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  createImageJob,
  getImageModelDetails,
  getImageModelVersionDetails,
  getJobStatus,
  getPublicImageModels,
  getUserHistory,
  mapApiToUiJob,
  normalizeUrl,
} from '../../../lib/api';
import type { UiJob, ImageJobApi } from '../../../types/image-job';
import type {
  ImageModelDetails,
  ImageModelVersionDetails,
  JsonSchemaProperty,
  PublicImageModelSummary,
} from '../../../types/image-model';
import { useAuth } from '../../../context/AuthContext';
import { useImageHistory } from '../../../hooks/useImageHistory';
import {
  ChevronLeft,
  ChevronRight,
  LayoutGrid,
  SlidersHorizontal,
  Sparkles,
  UploadCloud,
} from 'lucide-react';
import { Problem, mapProblemToUI } from '../../../lib/errors';
import { toast } from '../../../lib/toast';
import OutOfCreditsDialog from '../../../components/OutOfCreditsDialog';
import UpgradePlanDialog from '../../../components/UpgradePlanDialog';
import ResendVerificationDialog from '../../../components/ResendVerificationDialog';

type ModelAwareJob = ImageJobApi & {
  model?: string;
  modelSlug?: string;
  provider?: string;
};

type AlbumEntry = UiJob & {
  prompt?: string;
  modelSlug?: string;
  createdAt?: string;
};

function formatLabel(key: string): string {
  return key
    .replace(/[_-]+/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/^\w/, match => match.toUpperCase());
}

function isPromptField(key: string, property: JsonSchemaProperty | undefined): boolean {
  if (!property) return false;
  if (/prompt/i.test(key)) return true;
  if (property.title && /prompt/i.test(property.title)) return true;
  return false;
}

function shouldUseTextarea(key: string, property: JsonSchemaProperty | undefined): boolean {
  if (!property) return false;
  if (property.enum) return false;
  if (property.format === 'uri') return false;
  if (isPromptField(key, property)) return true;
  if (property.maxLength && property.maxLength > 200) return true;
  return property.type === 'string';
}

function isImageUploadField(
  key: string,
  property: JsonSchemaProperty | undefined,
): boolean {
  if (!property) return false;
  if (property.format !== 'uri') return false;
  if (property.contentMediaType) {
    return property.contentMediaType.startsWith('image/');
  }
  return /image/i.test(key);
}

function normalizeIdentifier(value: string | undefined): string {
  return (value ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function isResolutionField(
  key: string,
  property: JsonSchemaProperty | undefined,
): boolean {
  if (!property) return false;
  if (isAspectRatioField(key, property)) return false;
  const normalizedKey = normalizeIdentifier(key);
  const normalizedTitle = normalizeIdentifier(property.title);
  const normalizedDescription = normalizeIdentifier(property.description);

  const candidates = [normalizedKey, normalizedTitle, normalizedDescription];
  return candidates.some(value => {
    if (!value) return false;
    if (value.includes('resolucao') || value.includes('resolution')) return true;
    if (value.includes('largura') || value.includes('width')) return true;
    if (value.includes('altura') || value.includes('height')) return true;
    if (value.includes('dimensao') || value.includes('dimension')) return true;
    if (value.includes('proporcao') || value.includes('proportion')) return true;
    if (value.endsWith('size')) return true;
    return false;
  });
}

function isAspectRatioField(
  key: string,
  property: JsonSchemaProperty | undefined,
): boolean {
  if (!property) return false;
  const normalizedKey = normalizeIdentifier(key);
  const normalizedTitle = normalizeIdentifier(property.title);
  const normalizedDescription = normalizeIdentifier(property.description);

  const candidates = [normalizedKey, normalizedTitle, normalizedDescription];
  return candidates.some(value => {
    if (!value) return false;
    if (value.includes('aspect ratio') || value.includes('aspectratio')) return true;
    if (value.includes('proporcao') || value.includes('proporção')) return true;
    if (value.includes('ratio') && value.includes('aspect')) return true;
    return false;
  });
}

function isOutputFormatField(
  key: string,
  property: JsonSchemaProperty | undefined,
): boolean {
  if (!property) return false;
  const normalizedKey = normalizeIdentifier(key);
  const normalizedTitle = normalizeIdentifier(property.title);
  const normalizedDescription = normalizeIdentifier(property.description);

  const candidates = [normalizedKey, normalizedTitle, normalizedDescription];
  return candidates.some(value => {
    if (!value) return false;
    if (value.includes('outputformat') || value.includes('imageformat')) return true;
    if (value.includes('formato de saida') || value.includes('formato de saída')) return true;
    if (value.includes('formato') && (value.includes('saida') || value.includes('saída'))) return true;
    if (value.includes('filetype') || value.includes('file type')) return true;
    if (value.includes('output type') || value.includes('tipodearquivo')) return true;
    if (value.includes('mime') || value.includes('mimetype')) return true;
    return false;
  });
}

export default function ImageModelPage() {
  const params = useParams();
  const slugParam = params?.slug;
  const slug = Array.isArray(slugParam) ? slugParam[0] : slugParam;
  const [details, setDetails] = useState<ImageModelDetails | null>(null);
  const [detailsLoading, setDetailsLoading] = useState(true);
  const [detailsError, setDetailsError] = useState<string | null>(null);
  const [versionDetails, setVersionDetails] = useState<ImageModelVersionDetails | null>(null);
  const [versionLoading, setVersionLoading] = useState(false);
  const [versionError, setVersionError] = useState<string | null>(null);
  const [formValues, setFormValues] = useState<Record<string, unknown>>({});
  const [fileNames, setFileNames] = useState<Record<string, string>>({});
  const [filePreviews, setFilePreviews] = useState<Record<string, string>>({});
  const filePreviewsRef = useRef<Record<string, string>>({});
  const [images, setImages] = useState<UiJob[]>([]);
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const selectedJobIdRef = useRef<string | null>(null);
  const pollersRef = useRef<Map<string, { intervalId: number; timeoutId: number }>>(new Map());
  const [loading, setLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [advancedModalOpen, setAdvancedModalOpen] = useState(false);
  const [outOfCredits, setOutOfCredits] =
    useState<{ current?: number; needed?: number } | null>(null);
  const [upgradeDialog, setUpgradeDialog] = useState(false);
  const [emailModal, setEmailModal] = useState(false);
  const [models, setModels] = useState<PublicImageModelSummary[]>([]);
  const [modelsLoading, setModelsLoading] = useState(true);
  const [modelsError, setModelsError] = useState<string | null>(null);
  const { token } = useAuth();
  const { history, setHistory, loading: historyLoading } = useImageHistory();
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 10;
  const router = useRouter();
  const capabilities = details?.capabilities ?? [];
  const showVersionSkeleton = detailsLoading || versionLoading;
  const updateSelectedJobId = useCallback((jobId: string | null) => {
    selectedJobIdRef.current = jobId;
    setSelectedJobId(jobId);
  }, []);

  const stopPolling = useCallback((jobId: string) => {
    const poller = pollersRef.current.get(jobId);
    if (poller) {
      clearInterval(poller.intervalId);
      clearTimeout(poller.timeoutId);
      pollersRef.current.delete(jobId);
    }
  }, []);

  const startPolling = useCallback(
    (jobId: string, options?: { markAsCurrent?: boolean }) => {
      if (pollersRef.current.has(jobId)) return;

      const timeoutId = window.setTimeout(() => {
        stopPolling(jobId);
        setImages(prev => prev.map(job => (job.id === jobId ? { ...job, status: 'failed' } : job)));
        if (options?.markAsCurrent) {
          setLoading(false);
        }
        toast('Image generation timed out after 5 minutes.');
      }, 5 * 60 * 1000);

      const intervalId = window.setInterval(async () => {
        try {
          const content = await getJobStatus(jobId);
          const status = content?.status?.toUpperCase();
          const rawUrl =
            content?.imageUrl ?? (Array.isArray(content?.imageUrls) ? content.imageUrls[0] : null);

          if (status === 'COMPLETED') {
            stopPolling(jobId);
            const fullUrl = normalizeUrl(rawUrl);

            setImages(prev =>
              prev.map(job => (job.id === jobId
                ? { ...job, status: 'done', url: fullUrl ?? job.url ?? null }
                : job)),
            );

            if (options?.markAsCurrent || selectedJobIdRef.current === jobId) {
              updateSelectedJobId(jobId);
            }

            try {
              const updatedHistory = await getUserHistory();
              setHistory(updatedHistory);
            } catch (historyError) {
              console.warn('Failed to refresh history after completion', historyError);
            }

            if (options?.markAsCurrent) {
              window.dispatchEvent(new Event('creditsUpdated'));
              setLoading(false);
            }
          }

          if (status === 'FAILED') {
            stopPolling(jobId);
            setImages(prev => prev.map(job => (job.id === jobId ? { ...job, status: 'failed' } : job)));
            if (options?.markAsCurrent) {
              setLoading(false);
            }
          }
        } catch (pollError) {
          // Mark the job as failed so UI shows an error state for the image
          setImages(prev => prev.map(job => (job.id === jobId ? { ...job, status: 'failed' } : job)));
          // Stop the poller and clear loading for current request
          stopPolling(jobId);
          if (options?.markAsCurrent) {
            setLoading(false);
            // Let the user know the image generation failed to update
            toast('Image generation failed — there was an error checking the job status.');
          }
          // Avoid calling console.error here (dev overlay), leave non-blocking info in debug
          console.debug('Polling encountered an error for job', jobId, pollError);
        }
      }, 3000);

      pollersRef.current.set(jobId, { intervalId, timeoutId });
    },
    [setHistory, stopPolling, updateSelectedJobId],
  );

  useEffect(
    () => () => {
      pollersRef.current.forEach(({ intervalId, timeoutId }) => {
        clearInterval(intervalId);
        clearTimeout(timeoutId);
      });
      pollersRef.current.clear();
    },
    [],
  );

  useEffect(() => {
    filePreviewsRef.current = filePreviews;
  }, [filePreviews]);

  useEffect(
    () => () => {
      Object.values(filePreviewsRef.current).forEach(url => URL.revokeObjectURL(url));
    },
    [],
  );

  useEffect(() => {
    let active = true;
    setModelsLoading(true);
    setModelsError(null);

    getPublicImageModels()
      .then(data => {
        if (!active) return;
        setModels(data);
      })
      .catch(error => {
        console.warn('Failed to fetch image models', error);
        if (!active) return;
        setModelsError('Não conseguimos carregar os modelos agora.');
        setModels([]);
      })
      .finally(() => {
        if (active) {
          setModelsLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!history) return;
    const filtered = history.filter(job => {
      const raw = job as ModelAwareJob;
      const jobModel = raw.model ?? raw.modelSlug ?? raw.provider;
      if (!jobModel) return true;
      return jobModel === slug;
    });
    const ui = filtered.map(mapApiToUiJob);

    setImages(ui);
    setCurrentPage(1);

    setSelectedJobId(prev => {
      if (prev && ui.some(job => job.id === prev)) {
        selectedJobIdRef.current = prev;
        return prev;
      }
      const fallback = ui[0]?.id ?? null;
      selectedJobIdRef.current = fallback;
      return fallback;
    });

    ui.forEach(job => {
      if (job.status === 'loading') {
        startPolling(job.id);
      } else {
        stopPolling(job.id);
      }
    });
  }, [history, slug, startPolling, stopPolling]);

  useEffect(() => {
    if (!slug) return;
    let active = true;
    setDetailsLoading(true);
    setDetailsError(null);

    getImageModelDetails(slug)
      .then(data => {
        if (!active) return;
        console.debug('[ImageModelPage] Loaded model details', {
          slug,
          defaultVersionTag: data.defaultVersionTag,
        });
        setDetails(data);
      })
      .catch(error => {
        if (!active) return;
        console.error('Failed to load model details', error);
        setDetailsError('We couldn\'t load this model.');
      })
      .finally(() => {
        if (active) {
          setDetailsLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [slug]);

  const defaultVersionTag = details?.defaultVersionTag ?? '';

  useEffect(() => {
    if (!slug) return;
    if (!defaultVersionTag) {
      setVersionDetails(null);
      if (!detailsLoading) {
        setVersionError('Details unavailable');
      }
      setVersionLoading(false);
      return;
    }

    let active = true;
    setVersionLoading(true);
    setVersionError(null);

    console.debug('[ImageModelPage] Resolving version schema', {
      slug,
      defaultVersionTag,
    });

    getImageModelVersionDetails(slug, defaultVersionTag)
      .then(data => {
        if (!active) return;
        if (!data) {
          setVersionDetails(null);
          setVersionError('Details unavailable');
          return;
        }
        setVersionDetails(data);
      })
      .catch(error => {
        if (!active) return;
        console.error('Failed to load version details', error);
        setVersionDetails(null);
        setVersionError('Model details unavailable.');
      })
      .finally(() => {
        if (active) {
          setVersionLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [slug, defaultVersionTag, detailsLoading]);

  useEffect(() => {
    setAdvancedModalOpen(false);
  }, [slug, defaultVersionTag]);

  useEffect(() => {
    if (detailsLoading) {
      setVersionError(null);
    }
  }, [detailsLoading]);

  useEffect(() => {
    if (!versionDetails?.paramSchema?.properties) {
      setFormValues({});
      setFileNames({});
      return;
    }

    const defaults = versionDetails.defaults ?? {};
    const properties = versionDetails.paramSchema.properties;
    const nextValues: Record<string, unknown> = {};

    Object.entries(properties).forEach(([key, property]) => {
      const defaultValue = defaults[key] ?? property?.default;
      if (defaultValue !== undefined) {
        nextValues[key] = defaultValue as unknown;
      } else if (property?.type === 'boolean') {
        nextValues[key] = false;
      } else {
        nextValues[key] = '';
      }
    });

    setFormValues(nextValues);
    setFileNames({});
  }, [versionDetails]);

  const schemaProperties = useMemo(
    () => versionDetails?.paramSchema?.properties ?? {},
    [versionDetails?.paramSchema?.properties],
  );
  const requiredFields = useMemo(
    () => new Set(versionDetails?.paramSchema?.required ?? []),
    [versionDetails?.paramSchema?.required],
  );

  const orderedKeys = useMemo(() => {
    const keys = Object.keys(schemaProperties);
    return keys.sort((a, b) => {
      const aPrompt = isPromptField(a, schemaProperties[a]);
      const bPrompt = isPromptField(b, schemaProperties[b]);
      if (aPrompt && !bPrompt) return -1;
      if (!aPrompt && bPrompt) return 1;
      return 0;
    });
  }, [schemaProperties]);

  const promptKey = useMemo(
    () => orderedKeys.find(key => isPromptField(key, schemaProperties[key])),
    [orderedKeys, schemaProperties],
  );

  const nonPromptKeys = useMemo(
    () =>
      orderedKeys.filter(
        key => key !== promptKey,
      ),
    [orderedKeys, promptKey],
  );

  const resolutionKeys = useMemo(
    () =>
      nonPromptKeys.filter(key => {
        const property = schemaProperties[key];
        if (!property) return false;
        return isResolutionField(key, property);
      }),
    [nonPromptKeys, schemaProperties],
  );

  const imageUploadKeys = useMemo(
    () =>
      nonPromptKeys.filter(key => {
        const property = schemaProperties[key];
        if (!property) return false;
        return isImageUploadField(key, property);
      }),
    [nonPromptKeys, schemaProperties],
  );

  const hasMultipleImageUploadFields = imageUploadKeys.length > 1;

  const outputFormatKeys = useMemo(
    () =>
      nonPromptKeys.filter(key => {
        const property = schemaProperties[key];
        if (!property) return false;
        if (isResolutionField(key, property)) return false;
        return isOutputFormatField(key, property);
      }),
    [nonPromptKeys, schemaProperties],
  );

  const essentialKeys = useMemo(
    () => [...resolutionKeys, ...outputFormatKeys, ...imageUploadKeys],
    [resolutionKeys, outputFormatKeys, imageUploadKeys],
  );

  const modalKeys = useMemo(
    () =>
      nonPromptKeys.filter(
        key => !essentialKeys.includes(key),
      ),
    [nonPromptKeys, essentialKeys],
  );

  const promptValue = promptKey
    ? (typeof formValues[promptKey] === 'string' ? (formValues[promptKey] as string) : '')
    : '';

  const schemaAvailable =
    !!versionDetails?.paramSchema?.properties &&
    Object.keys(versionDetails.paramSchema.properties).length > 0;

  const missingRequired = schemaAvailable
    ? Array.from(requiredFields).some(key => {
        const value = formValues[key];
        if (typeof value === 'boolean') return false;
        if (value === 0) return false;
        if (value === '' || value === undefined || value === null) return true;
        return false;
      })
    : false;

  const modelLookup = useMemo(() => {
    const lookup = new Map<string, string>();
    models.forEach(model => lookup.set(model.slug, model.displayName));
    return lookup;
  }, [models]);

  const albumImages: AlbumEntry[] = useMemo(
    () =>
      history.map(job => {
        const uiJob = mapApiToUiJob(job);
        const raw = job as ModelAwareJob;
        const jobModel = raw.model ?? raw.modelSlug ?? raw.provider;
        return {
          ...uiJob,
          prompt: job.prompt,
          modelSlug: jobModel ?? undefined,
          createdAt: job.createdAt,
        };
      }),
    [history],
  );

  const centerJob = useMemo(() => {
    if (selectedJobId) {
      const match = images.find(img => img.id === selectedJobId);
      if (match) return match;
    }
    return images[0];
  }, [images, selectedJobId]);

  const centerStatus = centerJob?.status ?? (loading || isSubmitting ? 'loading' : 'done');
  const totalPages = Math.max(Math.ceil(images.length / ITEMS_PER_PAGE), 1);
  const paginatedImages = images.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE,
  );

  function updateFormValue(
    key: string,
    property: JsonSchemaProperty | undefined,
    value: unknown,
  ) {
    setFormValues(prev => ({
      ...prev,
      [key]: value,
    }));
    if (property && property.format === 'uri') {
      if (value === '' || value === undefined) {
        setFileNames(prev => {
          const next = { ...prev };
          delete next[key];
          return next;
        });
      }
    }
  }

  function renderField(key: string) {
    const property = schemaProperties[key];
    if (!property) return null;

    const id = `${slug}-${key}`;
    const label = property.title ?? formatLabel(key);
    const required = requiredFields.has(key);
    const description = property.description;
    const baseWrapperClass =
      'flex w-full max-w-full flex-col gap-3 rounded-2xl border border-white/10 bg-slate-950/70 p-4 shadow-inner shadow-purple-500/10 transition hover:border-fuchsia-400/40 sm:flex-row sm:items-stretch sm:gap-4';
    const uploadWrapperClass =
      'flex w-full max-w-full flex-row flex-wrap items-start gap-3 rounded-2xl border border-white/10 bg-slate-950/70 p-4 shadow-inner shadow-purple-500/10 transition hover:border-fuchsia-400/40 sm:flex-nowrap sm:items-stretch sm:gap-4';
    const labelClass =
      'text-[11px] font-semibold uppercase tracking-[0.32em] text-gray-400';
    const inputClass =
      'w-full rounded-xl border border-white/10 bg-slate-950/40 px-4 py-3 text-sm text-white shadow-lg transition focus:border-fuchsia-400 focus:outline-none focus:ring-2 focus:ring-fuchsia-500/40 placeholder:text-gray-500';

    if (property.type === 'boolean') {
      const checked = Boolean(formValues[key]);
      return (
        <div key={key} className={baseWrapperClass}>
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1">
              <span className="text-sm font-medium text-gray-200">
                {label}
                {required && <span className="ml-1 text-xs text-fuchsia-300">*</span>}
              </span>
              {description && <p className="text-xs leading-5 text-gray-400">{description}</p>}
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={checked}
              onClick={() => updateFormValue(key, property, !checked)}
              className={`relative inline-flex h-6 w-12 items-center rounded-full transition ${
                checked ? 'bg-fuchsia-500/80' : 'bg-white/15'
              }`}
            >
              <span
                className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition ${
                  checked ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
              <span className="sr-only">Toggle {label}</span>
            </button>
          </div>
        </div>
      );
    }

    if (isImageUploadField(key, property)) {
      const fileName = fileNames[key];
      const preview = filePreviews[key]
        ?? (typeof formValues[key] === 'string' && formValues[key]
          ? (formValues[key] as string)
          : '');
      return (
        <div key={key} className={uploadWrapperClass}>
          <div className="w-full space-y-1 sm:w-2/5">
            <label htmlFor={id} className={labelClass}>
              {label}
              {required && <span className="ml-1 text-xs text-fuchsia-300">*</span>}
            </label>
            {description && <p className="text-xs leading-5 text-gray-400">{description}</p>}
          </div>
          <div className="w-full space-y-2 sm:w-3/5">
            <label
              htmlFor={id}
              className={`group relative flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border border-dashed px-4 py-3 text-center transition ${
                preview
                  ? 'border-fuchsia-400/60 bg-slate-900/60'
                  : 'border-white/20 bg-slate-950/40 hover:border-fuchsia-400/60 hover:bg-slate-900/60'
              }`}
            >
              {preview ? (
                <img
                  src={preview}
                  alt={label}
                  className="h-20 w-full rounded-lg object-cover shadow-lg"
                />
              ) : (
                <>
                  <UploadCloud className="h-8 w-8 text-fuchsia-300" />
                  <span className="text-sm font-medium text-white">
                    Clique para enviar
                  </span>
                  <span className="text-xs text-gray-400">
                    Arraste e solte ou selecione um arquivo
                  </span>
                </>
              )}
              <input
                id={id}
                type="file"
                accept={property.contentMediaType ?? 'image/*'}
                className="sr-only"
                onChange={event => {
                  const file = event.target.files?.[0];
                  if (!file) {
                    updateFormValue(key, property, '');
                    setFileNames(prev => {
                      const next = { ...prev };
                      delete next[key];
                      return next;
                    });
                    const currentPreview = filePreviews[key];
                    if (currentPreview) {
                      URL.revokeObjectURL(currentPreview);
                    }
                    setFilePreviews(prev => {
                      const next = { ...prev };
                      delete next[key];
                      return next;
                    });
                    return;
                  }

                  if (file.size > 10 * 1024 * 1024) {
                    toast('File too large. Please choose a file under 10MB.');
                    event.target.value = '';
                    return;
                  }

                  const objectUrl = URL.createObjectURL(file);
                  const existingPreview = filePreviews[key];
                  if (existingPreview) {
                    URL.revokeObjectURL(existingPreview);
                  }

                  updateFormValue(key, property, file);
                  setFileNames(prev => ({ ...prev, [key]: file.name }));
                  setFilePreviews(prev => ({ ...prev, [key]: objectUrl }));
                }}
              />
            </label>
            <div className="flex items-center justify-between text-xs text-gray-400">
              <span>{fileName ?? 'PNG, JPG or WEBP up to 10MB'}</span>
              {preview && (
                <button
                  type="button"
                  onClick={() => {
                    const existingPreview = filePreviews[key];
                    if (existingPreview) {
                      URL.revokeObjectURL(existingPreview);
                    }
                    updateFormValue(key, property, '');
                    setFileNames(prev => {
                      const next = { ...prev };
                      delete next[key];
                      return next;
                    });
                    setFilePreviews(prev => {
                      const next = { ...prev };
                      delete next[key];
                      return next;
                    });
                  }}
                  className="font-medium text-fuchsia-300 transition hover:text-fuchsia-200"
                >
                  Remover
                </button>
              )}
            </div>
          </div>
        </div>
      );
    }

    if (property.enum) {
      const value = formValues[key];
      const firstOption = property.enum?.[0];
      const selectValue =
        typeof firstOption === 'boolean'
          ? (typeof value === 'boolean' ? String(value) : value === '' ? '' : String(value ?? ''))
          : ((value as string | number | undefined) ?? '');
      return (
        <div key={key} className={baseWrapperClass}>
          <div className="space-y-1">
            <label htmlFor={id} className={labelClass}>
              {label}
              {required && <span className="ml-1 text-xs text-fuchsia-300">*</span>}
            </label>
            {description && <p className="text-xs leading-5 text-gray-400">{description}</p>}
          </div>
          <select
            id={id}
            value={selectValue}
            onChange={event => {
              const raw = event.target.value;
              const sample = property.enum?.[0];
              let parsed: unknown = raw;
              if (typeof sample === 'number') {
                parsed = raw === '' ? '' : Number(raw);
              } else if (typeof sample === 'boolean') {
                parsed = raw === 'true';
              }
              updateFormValue(key, property, parsed);
            }}
            className={`${inputClass} appearance-none pr-10`}
          >
            {!required && <option value="">Select an option</option>}
            {property.enum?.map(option => {
              const optionLabel = typeof option === 'string' ? option : String(option);
              const optionValue = typeof option === 'boolean' ? String(option) : option;
              return (
                <option key={optionLabel} value={optionValue as string | number | undefined}>
                  {optionLabel}
                </option>
              );
            })}
          </select>
        </div>
      );
    }

    if (property.type === 'number' || property.type === 'integer') {
      const value = formValues[key];
      return (
        <div key={key} className={baseWrapperClass}>
          <div className="space-y-1">
            <label htmlFor={id} className={labelClass}>
              {label}
              {required && <span className="ml-1 text-xs text-fuchsia-300">*</span>}
            </label>
            {description && <p className="text-xs leading-5 text-gray-400">{description}</p>}
          </div>
          <input
            id={id}
            type="number"
            value={value === undefined || value === null ? '' : (value as number)}
            onChange={event => {
              const raw = event.target.value;
              if (raw === '') {
                updateFormValue(key, property, '');
                return;
              }
              const parsed = property.type === 'integer' ? parseInt(raw, 10) : parseFloat(raw);
              updateFormValue(key, property, Number.isNaN(parsed) ? '' : parsed);
            }}
            min={property.minimum}
            max={property.maximum}
            step={property.multipleOf ?? (property.type === 'integer' ? 1 : undefined)}
            className={inputClass}
          />
        </div>
      );
    }

    if (shouldUseTextarea(key, property)) {
      const value = formValues[key];
      return (
        <div key={key} className={baseWrapperClass}>
          <div className="space-y-1">
            <label htmlFor={id} className={labelClass}>
              {label}
              {required && <span className="ml-1 text-xs text-fuchsia-300">*</span>}
            </label>
            {description && <p className="text-xs leading-5 text-gray-400">{description}</p>}
          </div>
          <textarea
            id={id}
            value={typeof value === 'string' ? value : ''}
            onChange={event => updateFormValue(key, property, event.target.value)}
            placeholder={property.description ?? ''}
            className={`${inputClass} min-h-[160px] resize-none`}
          />
        </div>
      );
    }

    return (
      <div key={key} className={baseWrapperClass}>
        <div className="space-y-1">
          <label htmlFor={id} className={labelClass}>
            {label}
            {required && <span className="ml-1 text-xs text-fuchsia-300">*</span>}
          </label>
          {description && <p className="text-xs leading-5 text-gray-400">{description}</p>}
        </div>
        <input
          id={id}
          type="text"
          value={typeof formValues[key] === 'string' ? (formValues[key] as string) : ''}
          onChange={event => updateFormValue(key, property, event.target.value)}
          placeholder={property.description ?? ''}
          className={inputClass}
        />
      </div>
    );
  }
  async function handleGenerate() {
    if (!slug || !defaultVersionTag || !schemaAvailable) return;
    if (missingRequired) {
      toast('Please complete the required fields before generating.');
      return;
    }
    if (!token) {
      console.warn('User not authenticated');
      return;
    }

    setLoading(true);
    setIsSubmitting(true);

    const tempId = `temp-${Date.now()}`;
    const placeholderJob: UiJob = {
      id: tempId,
      status: 'loading',
      url: null,
      aspectRatio: '1:1',
    };

    setImages(prev => [placeholderJob, ...prev]);
    setCurrentPage(1);
    updateSelectedJobId(tempId);

    const params: Record<string, unknown> = {};
    const files: Record<string, File> = {};

    Object.keys(schemaProperties).forEach(key => {
      const value = formValues[key];
      if (typeof value === 'boolean') {
        params[key] = value;
        return;
      }
      if (value instanceof File) {
        files[key] = value;
        params[key] = fileNames[key] ?? value.name;
        return;
      }
      if (value === '' || value === undefined || value === null) {
        return;
      }
      params[key] = value;
    });

    try {
      const modelSlug = details?.slug ?? slug;
      if (!modelSlug) {
        throw new Error('Model slug not available');
      }
      const jobId = await createImageJob(modelSlug, params, {
        files: Object.keys(files).length > 0 ? files : undefined,
      });

      setImages(prev =>
        prev.map(job => (job.id === tempId ? { ...job, id: jobId } : job)),
      );
      updateSelectedJobId(jobId);
      startPolling(jobId, { markAsCurrent: true });
      setLoading(false);
      setIsSubmitting(false);
    } catch (err) {
      setImages(prev => prev.filter(job => job.id !== tempId));

      const problem = err as Problem;
      const action = mapProblemToUI(problem);
      if (problem && typeof problem === 'object' && 'code' in problem) {
        if (problem.code === 'EMAIL_NOT_VERIFIED') {
          setEmailModal(true);
        } else if (action.kind === 'toast') {
          toast(action.message);
        } else if (action.kind === 'modal') {
          if (problem.code === 'INSUFFICIENT_CREDITS') {
            setOutOfCredits(problem.meta as { current?: number; needed?: number });
          } else if (problem.code === 'FORBIDDEN_FEATURE') {
            setUpgradeDialog(true);
          }
        } else if (action.kind === 'redirect' && action.cta) {
          toast(action.message);
          router.push(action.cta);
        }
      } else {
        const message = err instanceof Error ? err.message : 'We could not start the image generation.';
        toast(message);
      }
      setLoading(false);
      setIsSubmitting(false);
    }
  }

  useEffect(() => {
    if (!advancedModalOpen) return;
    const originalOverflow = document.body.style.overflow;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setAdvancedModalOpen(false);
      }
    };
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [advancedModalOpen]);

  const isGenerateDisabled =
    isSubmitting || !token || !schemaAvailable || missingRequired || !defaultVersionTag;


  return (
    <div className="flex min-h-[100dvh] w-full justify-center animate-fade-in">
      <div className="mx-auto flex w-full max-w-[1920px] flex-col gap-5 px-3 pb-10 pt-2 sm:px-4 md:px-5 lg:px-8 xl:px-10 lg:pt-4">
        {detailsError && (
          <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-200">
            {detailsError}
          </div>
        )}

        <section className="rounded-3xl border border-white/10 bg-gradient-to-r from-slate-900/70 via-purple-950/60 to-slate-900/70 p-4 shadow-[0_30px_120px_-40px_rgba(168,85,247,0.4)] ring-1 ring-white/5 sm:p-6">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-2">
              <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.3em] text-fuchsia-200">
                <Sparkles className="h-4 w-4" /> Modelos disponíveis
              </p>
              <h1 className="text-2xl font-semibold text-white sm:text-3xl">Escolha o motor de criação</h1>
              <p className="text-sm text-gray-300">
                Simplificamos a seleção: escolha o modelo acima e gere suas cenas sem sair da mesma tela.
              </p>
            </div>
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs font-semibold text-white/90 shadow-inner shadow-fuchsia-500/20">
              <LayoutGrid className="h-4 w-4 text-fuchsia-300" />
              <span>{models.length > 0 ? `${models.length} modelos` : 'Carregando modelos'}</span>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {modelsLoading &&
              Array.from({ length: 4 }).map((_, index) => (
                <div
                  key={`model-skeleton-${index}`}
                  className="h-24 w-full animate-pulse rounded-2xl border border-white/10 bg-white/5"
                />
              ))}

            {!modelsLoading && modelsError && (
              <div className="col-span-full rounded-2xl border border-rose-500/30 bg-rose-500/10 p-4 text-sm text-rose-100">
                {modelsError}
              </div>
            )}

            {!modelsLoading &&
              models.map(model => {
                const active = model.slug === slug;
                return (
                  <Link
                    key={model.slug}
                    href={`/images/${model.slug}`}
                    className={`group relative flex h-full flex-col justify-between overflow-hidden rounded-2xl border p-4 transition duration-200 hover:translate-y-[-2px] hover:shadow-lg hover:shadow-fuchsia-500/20 focus:outline-none focus:ring-2 focus:ring-fuchsia-400/50 ${
                      active
                        ? 'border-fuchsia-400/70 bg-gradient-to-r from-fuchsia-500/15 via-purple-500/10 to-cyan-400/10'
                        : 'border-white/10 bg-black/40 hover:border-fuchsia-400/50'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-xs uppercase tracking-[0.2em] text-gray-400">Modelo</p>
                        <p className="text-base font-semibold text-white">{model.displayName}</p>
                      </div>
                      <span
                        className={`inline-flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold ${
                          active ? 'bg-fuchsia-500/30 text-white' : 'bg-white/10 text-gray-200'
                        }`}
                      >
                        {model.provider ?? 'AI'}
                      </span>
                    </div>
                    <div className="mt-3 flex items-center justify-between text-[11px] text-gray-400">
                      <span className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/5 px-2 py-1">
                        <Sparkles className="h-3 w-3 text-fuchsia-300" />
                        {model.capabilities?.[0] ?? 'Criação rápida'}
                      </span>
                      {active && <span className="text-fuchsia-200">Selecionado</span>}
                    </div>
                  </Link>
                );
              })}
          </div>
        </section>

        <section className="rounded-3xl border border-white/10 bg-black/40 p-3 shadow-[0_30px_120px_-50px_rgba(0,0,0,0.9)] backdrop-blur-sm sm:p-5">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-1">
              <p className="text-[11px] uppercase tracking-[0.25em] text-fuchsia-200">Geração de imagens</p>
              <h2 className="text-xl font-semibold text-white sm:text-2xl">Configure o pedido e gere agora</h2>
              <p className="text-sm text-gray-300">Ajuste o prompt, uploads e parâmetros essenciais antes de enviar.</p>
            </div>
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-gray-200">
              <span className="h-2 w-2 rounded-full bg-emerald-400" />
              {capabilities.length > 0 ? capabilities.join(' · ') : 'Pronto para criar'}
            </div>
          </div>

          <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-[minmax(320px,420px)_minmax(0,1fr)] xl:grid-cols-[minmax(360px,460px)_minmax(0,1fr)] xl:items-start xl:gap-6">
            <div className="flex flex-col gap-4">
              {showVersionSkeleton && (
                <div className="space-y-3">
                  {Array.from({ length: 3 }).map((_, index) => (
                    <div
                      key={`schema-skeleton-${index}`}
                      className="h-32 w-full max-w-[520px] rounded-2xl border border-white/10 bg-white/[0.08] animate-pulse"
                    />
                  ))}
                </div>
              )}

              {!showVersionSkeleton && schemaAvailable && (
                <div className="space-y-3">
                  <section className="w-full rounded-2xl border border-white/10 bg-white/5 p-3 sm:p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-sm font-semibold text-white">Brief criativo</p>
                      <span className="text-[11px] text-gray-500">Conte o que precisa gerar</span>
                    </div>
                    {promptKey ? (
                      <div className="mt-3 flex flex-col gap-3 sm:gap-4">
                        <label htmlFor={`${slug}-${promptKey}`} className="text-sm font-medium text-gray-200">
                          {schemaProperties[promptKey]?.title ?? 'Prompt'}
                        </label>
                        <textarea
                          id={`${slug}-${promptKey}`}
                          value={promptValue}
                          onChange={event =>
                            updateFormValue(promptKey, schemaProperties[promptKey], event.target.value)
                          }
                          placeholder={
                            schemaProperties[promptKey]?.description ??
                            'Descreva a cena, estilo e iluminação que deseja...'
                          }
                          className="min-h-[120px] resize-none rounded-2xl border border-white/10 bg-slate-900/70 p-4 text-sm text-white shadow-lg transition focus:border-fuchsia-400 focus:outline-none focus:ring-2 focus:ring-fuchsia-500/40 placeholder:text-gray-500"
                        />
                      </div>
                    ) : (
                      <div className="mt-3 rounded-2xl border border-white/10 bg-black/40 p-3 text-xs text-gray-300">
                        Este modelo não exige prompt.
                      </div>
                    )}
                  </section>

                  {imageUploadKeys.length > 0 && (
                    <section className="w-full rounded-2xl border border-white/10 bg-white/5 p-3 sm:p-4">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="text-sm font-semibold text-white">Imagens de referência</p>
                        <span className="text-[11px] text-gray-500">Upload para guiar o resultado</span>
                      </div>

                      <div
                        className={`mt-3 grid grid-cols-1 gap-3 ${
                          hasMultipleImageUploadFields ? 'lg:grid-cols-2' : ''
                        }`}
                      >
                        {imageUploadKeys.map(renderField)}
                      </div>
                    </section>
                  )}

                  {resolutionKeys.length > 0 && (
                    <section className="w-full rounded-2xl border border-white/10 bg-white/5 p-3 sm:p-4">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="text-sm font-semibold text-white">Resolução</p>
                        <span className="text-[11px] text-gray-500">Dimensões e proporção</span>
                      </div>
                      <div className="mt-3 flex flex-col gap-3">
                        {resolutionKeys.map(renderField)}
                      </div>
                    </section>
                  )}

                  {outputFormatKeys.length > 0 && (
                    <section className="w-full rounded-2xl border border-white/10 bg-white/5 p-3 sm:p-4">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="text-sm font-semibold text-white">Saída da imagem</p>
                        <span className="text-[11px] text-gray-500">Formato do arquivo</span>
                      </div>
                      <div className="mt-3 flex flex-col gap-3">
                        {outputFormatKeys.map(renderField)}
                      </div>
                    </section>
                  )}

                  {modalKeys.length > 0 && (
                    <section className="w-full rounded-2xl border border-white/10 bg-white/5 p-3 sm:p-4">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div className="space-y-1">
                          <p className="text-sm font-semibold text-white">Mais ajustes</p>
                          <p className="text-xs text-gray-400">
                            Abra o painel para refinar parâmetros avançados do modelo.
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => setAdvancedModalOpen(true)}
                          className="flex w-full items-center justify-center gap-2 rounded-2xl border border-fuchsia-400/30 bg-fuchsia-500/10 px-4 py-3 text-sm font-semibold text-white transition hover:border-fuchsia-400/60 hover:bg-fuchsia-500/20 sm:w-auto"
                        >
                          <SlidersHorizontal className="h-4 w-4 text-fuchsia-200" />
                          Abrir painel ({modalKeys.length})
                        </button>
                      </div>
                    </section>
                  )}
                </div>
              )}

              {!showVersionSkeleton && !schemaAvailable && (
                <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-4 text-sm text-rose-200">
                  {versionError ?? 'Details unavailable'}
                </div>
              )}

              <div className="grid w-full max-w-full gap-3 lg:grid-cols-[minmax(0,1fr)_220px] lg:items-center">
                <button
                  onClick={handleGenerate}
                  disabled={isGenerateDisabled}
                  className="order-1 w-full rounded-2xl bg-gradient-to-r from-fuchsia-500 via-purple-500 to-cyan-400 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-purple-500/30 transition duration-300 hover:shadow-purple-500/50 focus:outline-none focus:ring-2 focus:ring-fuchsia-500/40 disabled:cursor-not-allowed disabled:opacity-60 xl:order-2"
                >
                  {isSubmitting ? 'Gerando...' : 'Gerar com imagino.AI'}
                </button>
                <div className="order-2 hidden text-right text-[11px] text-gray-500 xl:block">
                  {capabilities.length > 0 && <span>{capabilities.join(' · ')}</span>}
                </div>
              </div>
            </div>

            <div className="grid gap-3 lg:gap-4 xl:grid-cols-[minmax(0,1fr)_260px] 2xl:grid-cols-[minmax(0,1fr)_300px] xl:items-start">
              <section className="w-full rounded-2xl border border-white/10 bg-black/30 p-3 backdrop-blur sm:p-4">
                <div className="flex justify-between text-xs text-fuchsia-200">
                  {isSubmitting && <span>Gerando...</span>}
                  {details?.displayName && <span className="text-gray-300">{details.displayName}</span>}
                </div>
                <div className="mt-2 flex w-full justify-center sm:mt-3">
                  {centerJob ? (
                    <div className="w-full max-w-full">
                      <ImageCard
                        src={centerJob.url ?? undefined}
                        jobId={centerJob.id}
                        status={centerStatus}
                        onClick={() => {
                          if (centerStatus === 'done') {
                            setModalOpen(true);
                          }
                        }}
                      />
                    </div>
                  ) : (
                    <div className="w-full max-w-full rounded-2xl border border-dashed border-white/10 bg-black/30 p-6 text-center text-sm text-gray-400">
                      Escreva seu briefing criativo e clique em "Gerar com imagino.AI" para começar.
                    </div>
                  )}
                </div>
              </section>

              <section className="w-full rounded-2xl border border-white/10 bg-black/30 p-3 backdrop-blur sm:p-4 xl:sticky xl:top-4">
                <div className="flex items-center justify-between gap-2 text-white">
                  <p className="text-sm font-semibold">Últimas execuções</p>
                  {totalPages > 1 && (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setCurrentPage(p => Math.max(p - 1, 1))}
                        disabled={currentPage === 1}
                        className="rounded-full border border-white/10 p-1 text-xs disabled:opacity-50"
                      >
                        <ChevronLeft size={14} />
                      </button>
                      <span className="text-[11px] text-gray-300">
                        {currentPage} / {totalPages}
                      </span>
                      <button
                        onClick={() => setCurrentPage(p => Math.min(p + 1, totalPages))}
                        disabled={currentPage === totalPages}
                        className="rounded-full border border-white/10 p-1 text-xs disabled:opacity-50"
                      >
                        <ChevronRight size={14} />
                      </button>
                    </div>
                  )}
                </div>

                {images.length === 0 ? (
                  <p className="mt-3 text-sm text-gray-400 sm:mt-4">
                    As imagens geradas e execuções em andamento aparecerão aqui.
                  </p>
                ) : (
                  <div className="mt-3 grid grid-cols-3 gap-3 sm:mt-4 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-2 2xl:grid-cols-3">
                    {paginatedImages.map(job => (
                      <button
                        key={job.id}
                        onClick={() => {
                          updateSelectedJobId(job.id);
                        }}
                        className={`group relative aspect-square overflow-hidden rounded-xl border-2 bg-black/30 transition hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-fuchsia-500/40 ${
                          selectedJobId === job.id ? 'border-purple-500' : 'border-white/10'
                        }`}
                      >
                        {job.status === 'done' && job.url ? (
                          <img
                            src={job.url}
                            className="h-full w-full object-cover transition duration-200 group-hover:scale-105"
                            alt=""
                          />
                        ) : job.status === 'failed' ? (
                          <div className="flex h-full w-full flex-col items-center justify-center gap-2 bg-red-500/10 text-red-100">
                            <span className="text-xs font-semibold">Falhou</span>
                            <span className="text-[11px] text-red-100/80">Toque para tentar novamente</span>
                          </div>
                        ) : (
                          <div className="flex h-full w-full items-center justify-center bg-white/5 text-[11px] uppercase tracking-wide text-gray-300">
                            Carregando...
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </section>
            </div>
          </div>
        </section>

        <section className="rounded-3xl border border-white/10 bg-black/30 p-3 shadow-[0_30px_120px_-50px_rgba(168,85,247,0.3)] backdrop-blur sm:p-5">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-1">
              <p className="text-[11px] uppercase tracking-[0.25em] text-fuchsia-200">Seu álbum</p>
              <h3 className="text-xl font-semibold text-white sm:text-2xl">Todas as imagens geradas</h3>
              <p className="text-sm text-gray-300">
                Visualize cada criação feita com a imagino.AI, independente do modelo utilizado.
              </p>
            </div>
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs font-semibold text-gray-200">
              <Sparkles className="h-4 w-4 text-fuchsia-200" />
              {albumImages.length === 1 ? '1 imagem salva' : `${albumImages.length} imagens salvas`}
            </div>
          </div>

          {historyLoading && (
            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
              {Array.from({ length: 8 }).map((_, index) => (
                <div
                  key={`album-skeleton-${index}`}
                  className="aspect-square w-full animate-pulse rounded-2xl border border-white/10 bg-white/5"
                />
              ))}
            </div>
          )}

          {!historyLoading && albumImages.length === 0 && (
            <div className="mt-4 rounded-2xl border border-white/10 bg-black/40 p-6 text-center text-sm text-gray-300">
              Suas gerações aparecerão aqui assim que forem concluídas.
            </div>
          )}

          {!historyLoading && albumImages.length > 0 && (
            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
              {albumImages.map(entry => {
                const label = entry.modelSlug ? modelLookup.get(entry.modelSlug) ?? entry.modelSlug : 'Modelo';
                const dateLabel = entry.createdAt
                  ? new Date(entry.createdAt).toLocaleDateString('pt-BR', {
                      day: '2-digit',
                      month: 'short',
                      hour: '2-digit',
                      minute: '2-digit',
                    })
                  : '';
                return (
                  <button
                    key={entry.id}
                    onClick={() => {
                      updateSelectedJobId(entry.id);
                      setModalOpen(true);
                    }}
                    className="group relative aspect-square overflow-hidden rounded-2xl border border-white/10 bg-white/5 text-left shadow-lg shadow-black/20 transition hover:-translate-y-1 hover:border-fuchsia-300/60 hover:shadow-fuchsia-500/20 focus:outline-none focus:ring-2 focus:ring-fuchsia-400/50"
                  >
                    {entry.status === 'done' && entry.url ? (
                      <img src={entry.url} alt="Imagem gerada" className="h-full w-full object-cover transition duration-200 group-hover:scale-105" />
                    ) : entry.status === 'failed' ? (
                      <div className="flex h-full w-full flex-col items-center justify-center gap-2 bg-red-500/10 text-red-100">
                        <span className="text-xs font-semibold">Falhou</span>
                        <span className="text-[11px] text-red-100/80">Toque para detalhes</span>
                      </div>
                    ) : (
                      <div className="flex h-full w-full items-center justify-center bg-white/5 text-[11px] uppercase tracking-wide text-gray-300">
                        Em progresso
                      </div>
                    )}

                    <div className="absolute inset-x-0 bottom-0 space-y-1 bg-gradient-to-t from-black/80 via-black/60 to-transparent p-3 text-xs text-white">
                      <p className="line-clamp-2 text-sm font-semibold text-white drop-shadow">{entry.prompt || 'Solicitação enviada'}</p>
                      <div className="flex items-center justify-between text-[11px] text-gray-200">
                        <span className="truncate">{label}</span>
                        {dateLabel && <span>{dateLabel}</span>}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </section>
      </div>

      {advancedModalOpen && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 px-4 py-8"
          onClick={() => setAdvancedModalOpen(false)}
        >
          <div
            className="relative w-full max-w-3xl overflow-hidden rounded-3xl border border-white/10 bg-slate-950/95 shadow-2xl"
            onClick={event => event.stopPropagation()}
          >
            <div className="flex flex-col gap-2 border-b border-white/5 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="space-y-1">
                <h2 className="text-base font-semibold text-white">Advanced settings</h2>
                <p className="text-xs text-gray-400">
                  Adjust parameters that are hidden from the main screen.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setAdvancedModalOpen(false)}
                className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs font-semibold uppercase tracking-[0.22em] text-gray-300 transition hover:border-fuchsia-400/60 hover:text-white"
              >
                Close
              </button>
            </div>
            <div className="max-h-[70vh] space-y-3 overflow-y-auto px-6 py-4">
              {modalKeys.map(renderField)}
            </div>
            <div className="flex justify-end border-t border-white/5 bg-black/40 px-6 py-4">
              <button
                type="button"
                onClick={() => setAdvancedModalOpen(false)}
                className="rounded-2xl border border-fuchsia-400/40 bg-fuchsia-500/20 px-4 py-2 text-sm font-semibold text-white transition hover:border-fuchsia-400/70 hover:bg-fuchsia-500/30"
              >
                Finish adjustments
              </button>
            </div>
          </div>
        </div>
      )}

      <ImageCardModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        jobId={selectedJobId}
      />
      <OutOfCreditsDialog
        open={outOfCredits !== null}
        current={outOfCredits?.current}
        needed={outOfCredits?.needed}
        onClose={() => setOutOfCredits(null)}
      />
      <UpgradePlanDialog
        open={upgradeDialog}
        onClose={() => setUpgradeDialog(false)}
      />
      <ResendVerificationDialog
        open={emailModal}
        email={typeof window !== 'undefined' ? localStorage.getItem('userEmail') : ''}
        onClose={() => setEmailModal(false)}
      />
    </div>
  );
}
