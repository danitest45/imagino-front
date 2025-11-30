'use client';

import ImageCard from '../../../components/ImageCard';
import ImageCardModal from '../../../components/ImageCardModal';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  createImageJob,
  getImageModelDetails,
  getImageModelVersionDetails,
  getUserHistory,
  mapApiToUiJob,
} from '../../../lib/api';
import type { UiJob, ImageJobApi } from '../../../types/image-job';
import type {
  ImageModelDetails,
  ImageModelVersionDetails,
  JsonSchemaProperty,
} from '../../../types/image-model';
import { useAuth } from '../../../context/AuthContext';
import { useImageHistory } from '../../../hooks/useImageHistory';
import {
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Loader2,
  SlidersHorizontal,
  UploadCloud,
} from 'lucide-react';
import { Problem, mapProblemToUI } from '../../../lib/errors';
import { toast } from '../../../lib/toast';
import OutOfCreditsDialog from '../../../components/OutOfCreditsDialog';
import UpgradePlanDialog from '../../../components/UpgradePlanDialog';
import ResendVerificationDialog from '../../../components/ResendVerificationDialog';
import { useJobPolling } from '../../../hooks/useJobPolling';

type ModelAwareJob = ImageJobApi & {
  model?: string;
  modelSlug?: string;
  provider?: string;
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
  const [images, setImages] = useState<UiJob[]>([]);
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [advancedModalOpen, setAdvancedModalOpen] = useState(false);
  const [outOfCredits, setOutOfCredits] =
    useState<{ current?: number; needed?: number } | null>(null);
  const [upgradeDialog, setUpgradeDialog] = useState(false);
  const [emailModal, setEmailModal] = useState(false);
  const { token } = useAuth();
  const { history, setHistory } = useImageHistory();
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 10;
  const router = useRouter();
  const capabilities = details?.capabilities ?? [];
  const showDetailsSkeleton = detailsLoading;
  const showVersionSkeleton = detailsLoading || versionLoading;

  const updateJob = useCallback((jobId: string, updater: (job: UiJob) => UiJob) => {
    setImages(prev => prev.map(job => (job.id === jobId ? updater(job) : job)));
  }, []);

  const handleJobResolved = useCallback(
    async (
      jobId: string,
      status: UiJob['status'],
      payload: { imageUrl: string | null; imageUrls?: string[] },
    ) => {
      setHistory(prev =>
        prev.map(job =>
          job.jobId === jobId || job.id === jobId
            ? {
                ...job,
                status: status === 'done' ? 'completed' : 'failed',
                imageUrl: payload.imageUrl ?? job.imageUrl,
                imageUrls: payload.imageUrls ?? job.imageUrls,
              }
            : job,
        ),
      );

      if (status === 'done') {
        setSelectedJobId(jobId);

        try {
          const updatedHistory = await getUserHistory();
          setHistory(updatedHistory);
        } catch (historyError) {
          console.warn('Failed to update history:', historyError);
        }
      } else if (status === 'failed') {
        setSelectedJobId(prev => prev ?? jobId);
      }
    },
    [setHistory],
  );

  useJobPolling({ jobs: images, onJobUpdate: updateJob, onJobResolved: handleJobResolved });

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

    if (ui.length > 0) {
      setSelectedJobId(ui[0].id);
    } else {
      setSelectedJobId(null);
    }
  }, [history, slug]);

  useEffect(() => {
    const selected = images.find(job => job.id === selectedJobId) ?? images[0];
    if (selected) {
      setSelectedJobId(selected.id);
    }
  }, [images, selectedJobId]);

  useEffect(() => {
    setLoading(images.some(job => job.status === 'loading'));
  }, [images]);

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

  const centerJob = useMemo(() => {
    if (images.length === 0) return null;
    return images.find(job => job.id === selectedJobId) ?? images[0];
  }, [images, selectedJobId]);

  const totalPages = Math.max(Math.ceil(images.length / ITEMS_PER_PAGE), 1);
  const paginatedImages = useMemo(
    () =>
      images.slice(
        (currentPage - 1) * ITEMS_PER_PAGE,
        currentPage * ITEMS_PER_PAGE,
      ),
    [currentPage, images],
  );

  const renderJobThumbnail = (job: UiJob) => {
    const isSelected = selectedJobId === job.id;
    return (
      <button
        key={job.id}
        onClick={() => {
          setSelectedJobId(job.id);
        }}
        className={`group relative aspect-square overflow-hidden rounded-xl border-2 bg-black/30 transition hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-fuchsia-500/40 ${
          isSelected ? 'border-purple-500' : 'border-white/10 hover:border-purple-400'
        }`}
      >
        {job.status === 'failed' ? (
          <div className="flex h-full w-full items-center justify-center gap-1 text-[11px] text-red-300">
            <AlertCircle className="h-4 w-4" />
            Failed
          </div>
        ) : job.status === 'loading' ? (
          <div className="flex h-full w-full items-center justify-center">
            <Loader2 className="h-5 w-5 animate-spin text-fuchsia-200" />
          </div>
        ) : (
          <img
            src={job.url ?? ''}
            className="h-full w-full object-cover transition duration-200 group-hover:scale-105"
            alt=""
          />
        )}
      </button>
    );
  };

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
      const preview =
        typeof formValues[key] === 'string' && formValues[key]
          ? (formValues[key] as string)
          : '';
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
                    return;
                  }
                  const reader = new FileReader();
                  reader.onload = e => {
                    updateFormValue(key, property, e.target?.result ?? '');
                    setFileNames(prev => ({ ...prev, [key]: file.name }));
                  };
                  reader.readAsDataURL(file);
                }}
              />
            </label>
            <div className="flex items-center justify-between text-xs text-gray-400">
              <span>{fileName ?? 'PNG, JPG or WEBP up to 10MB'}</span>
              {preview && (
                <button
                  type="button"
                  onClick={() => {
                    updateFormValue(key, property, '');
                    setFileNames(prev => {
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
    setSelectedJobId(null);

    const params: Record<string, unknown> = {};

    Object.keys(schemaProperties).forEach(key => {
      const value = formValues[key];
      if (typeof value === 'boolean') {
        params[key] = value;
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
      const jobId = await createImageJob(modelSlug, params);
      const newJob: UiJob = {
        id: jobId,
        status: 'loading',
        url: null,
        aspectRatio: '1:1',
      };

      setImages(prev => [newJob, ...prev]);
      setCurrentPage(1);
    } catch (err) {
      const problem = err as Problem;
      const action = mapProblemToUI(problem);
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
      } else {
      toast('We could not start the image generation.');
      }
      setLoading(false);
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
    loading || !token || !schemaAvailable || missingRequired || !defaultVersionTag;

  return (
    <div className="flex min-h-screen w-full justify-center animate-fade-in">
      <div className="mx-auto flex w-full max-w-[1920px] flex-col gap-4 px-3 pb-8 pt-2 sm:px-4 md:px-5 lg:px-8 xl:px-10 lg:pt-4">
        {detailsError && (
          <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-200">
            {detailsError}
          </div>
        )}

        <div className="grid grid-cols-1 gap-3 lg:grid-cols-[minmax(300px,360px)_minmax(0,1fr)] xl:grid-cols-[minmax(320px,380px)_minmax(0,1fr)] xl:items-start xl:gap-6">
          <div className="flex flex-col gap-3 lg:gap-4">
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
              <div className="space-y-2">
                <section className="w-full rounded-2xl border border-white/10 bg-white/5 p-3 sm:p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm font-semibold text-white">Creative brief</p>
                    <span className="text-[11px] text-gray-500">Tell us what you want to generate</span>
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
                          'Describe the scene, style, and lighting you want...'
                        }
                        className="min-h-[120px] resize-none rounded-2xl border border-white/10 bg-slate-900/70 p-4 text-sm text-white shadow-lg transition focus:border-fuchsia-400 focus:outline-none focus:ring-2 focus:ring-fuchsia-500/40 placeholder:text-gray-500"
                      />
                    </div>
                  ) : (
                    <p className="mt-4 text-sm text-gray-400">
                      This model does not have a configurable prompt field.
                    </p>
                  )}
                </section>

                {imageUploadKeys.length > 0 && (
                  <section className="w-full rounded-2xl border border-white/10 bg-white/5 p-3 sm:p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-sm font-semibold text-white">Visual reference</p>
                      <span className="text-[11px] text-gray-500">Upload guide images</span>
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
                      <p className="text-sm font-semibold text-white">Resolution</p>
                      <span className="text-[11px] text-gray-500">Dimensions and aspect ratio</span>
                    </div>
                    <div className="mt-3 flex flex-col gap-3">
                      {resolutionKeys.map(renderField)}
                    </div>
                  </section>
                )}

                {outputFormatKeys.length > 0 && (
                  <section className="w-full rounded-2xl border border-white/10 bg-white/5 p-3 sm:p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-sm font-semibold text-white">Image output</p>
                      <span className="text-[11px] text-gray-500">File format</span>
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
                        <p className="text-sm font-semibold text-white">More settings</p>
                        <p className="text-xs text-gray-400">
                          Open the modal panel to adjust advanced model parameters.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setAdvancedModalOpen(true)}
                        className="flex w-full items-center justify-center gap-2 rounded-2xl border border-fuchsia-400/30 bg-fuchsia-500/10 px-4 py-3 text-sm font-semibold text-white transition hover:border-fuchsia-400/60 hover:bg-fuchsia-500/20 sm:w-auto"
                      >
                        <SlidersHorizontal className="h-4 w-4 text-fuchsia-200" />
                        Open panel ({modalKeys.length})
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
                {loading ? 'Generating...' : 'Generate with imagino.AI'}
              </button>
              <div className="order-2 hidden text-right text-[11px] text-gray-500 xl:block">
                {capabilities.length > 0 && <span>{capabilities.join(' · ')}</span>}
              </div>
            </div>
          </div>

          <div className="grid gap-3 lg:gap-4 xl:grid-cols-[minmax(0,1fr)_260px] 2xl:grid-cols-[minmax(0,1fr)_300px] xl:items-start">
            <section className="w-full rounded-2xl border border-white/10 bg-black/30 p-3 backdrop-blur sm:p-4">
              <div className="flex justify-end">
                {loading && <span className="text-[11px] text-fuchsia-200">Generating...</span>}
              </div>
              <div className="mt-2 flex w-full justify-center sm:mt-3">
                {centerJob ? (
                  <div className="w-full max-w-full">
                    <ImageCard
                      src={centerJob.url ?? undefined}
                      jobId={centerJob.id ?? undefined}
                      loading={centerJob.status === 'loading'}
                      status={centerJob.status}
                      onClick={() => {
                        setModalOpen(true);
                      }}
                    />
                  </div>
                ) : loading ? (
                  <div className="w-full max-w-full">
                    <ImageCard loading={true} onClick={() => {}} />
                  </div>
                ) : (
                  <div className="w-full max-w-full rounded-2xl border border-dashed border-white/10 bg-black/30 p-6 text-center text-sm text-gray-400">
                    Write your creative brief and click &quot;Generate with imagino.AI&quot; to get started.
                  </div>
                )}
              </div>
            </section>

            <section className="w-full rounded-2xl border border-white/10 bg-black/30 p-3 backdrop-blur sm:p-4 xl:sticky xl:top-4">
              <div className="flex items-center justify-end gap-2 text-white">
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
                  Generated images will appear here as soon as they are ready.
                </p>
              ) : (
                <div className="mt-3 grid grid-cols-3 gap-3 sm:mt-4 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-2 2xl:grid-cols-3">
                  {paginatedImages.map(renderJobThumbnail)}
                </div>
              )}
            </section>
          </div>
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
    </div>
  );
}
