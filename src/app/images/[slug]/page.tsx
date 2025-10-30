'use client';

import ImageCard from '../../../components/ImageCard';
import ImageCardModal from '../../../components/ImageCardModal';
import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  createImageJob,
  getImageModelDetails,
  getPublicModelVersion,
  getJobStatus,
  getUserHistory,
  mapApiToUiJob,
  normalizeUrl,
} from '../../../lib/api';
import type { UiJob, ImageJobApi } from '../../../types/image-job';
import type {
  ImageModelDetails,
  ImageModelVersionDetails,
  JsonSchemaProperty,
} from '../../../types/image-model';
import { useAuth } from '../../../context/AuthContext';
import { useImageHistory } from '../../../hooks/useImageHistory';
import { ChevronLeft, ChevronRight } from 'lucide-react';
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

const promptSuggestions = [
  {
    title: 'Neon city portrait',
    prompt:
      'Cinematic portrait of a cyberpunk explorer lit by neon reflections, ultra-detailed, 85mm photo',
  },
  {
    title: 'Product spotlight',
    prompt:
      'Minimalist product render of a smart home speaker on a marble table, dramatic studio lighting',
  },
  {
    title: 'Floating lab concept',
    prompt:
      'Concept art of a floating botanical laboratory above the clouds, illustrated in watercolor style',
  },
];

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
  const [selectedImageUrl, setSelectedImageUrl] = useState<string | null>(null);
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [outOfCredits, setOutOfCredits] =
    useState<{ current?: number; needed?: number } | null>(null);
  const [upgradeDialog, setUpgradeDialog] = useState(false);
  const [emailModal, setEmailModal] = useState(false);
  const { token } = useAuth();
  const { history, setHistory } = useImageHistory();
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 10;
  const router = useRouter();

  useEffect(() => {
    if (!history) return;
    const filtered = history.filter(job => {
      const raw = job as ModelAwareJob;
      const jobModel = raw.model ?? raw.modelSlug ?? raw.provider;
      if (!jobModel) return true;
      return jobModel === slug;
    });
    const ui = filtered
      .map(mapApiToUiJob)
      .filter(j => !!j.url);

    setImages(ui);
    setCurrentPage(1);

    if (ui.length > 0) {
      setSelectedImageUrl(ui[0].url ?? null);
      setSelectedJobId(ui[0].id);
    } else {
      setSelectedImageUrl(null);
      setSelectedJobId(null);
    }
  }, [history, slug]);

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
        setDetailsError('Não foi possível carregar este modelo.');
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
  const versionLabel = detailsLoading ? 'Carregando...' : defaultVersionTag || 'default';

  useEffect(() => {
    if (!slug || !defaultVersionTag) return;
    let active = true;
    setVersionLoading(true);
    setVersionError(null);

    const versionId = details?.versions.find(v => v.tag === defaultVersionTag)?.id;
    const modelId = details?.id;

    console.debug('[ImageModelPage] Resolving version schema', {
      slug,
      defaultVersionTag,
      versionId,
    });

    getPublicModelVersion(slug, defaultVersionTag, {
      modelId,
      versionId,
      versions: details?.versions,
    })
      .then(data => {
        if (!active) return;
        setVersionDetails(data);
      })
      .catch(error => {
        if (!active) return;
        console.error('Failed to load version details', error);
        setVersionDetails(null);
        setVersionError('Detalhes do modelo não disponíveis.');
      })
      .finally(() => {
        if (active) {
          setVersionLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [slug, defaultVersionTag, details]);

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

  const otherKeys = useMemo(
    () => orderedKeys.filter(key => key !== promptKey),
    [orderedKeys, promptKey],
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

  const centerImageUrl = selectedImageUrl;
  const doneImages = images.filter(img => img.status === 'done' && img.url);
  const totalPages = Math.max(Math.ceil(doneImages.length / ITEMS_PER_PAGE), 1);
  const paginatedImages = doneImages.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE,
  );
  const showCenterOnMobile = !!centerImageUrl || loading;

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
    const commonLabel = (
      <label htmlFor={id} className="text-sm font-medium text-gray-200">
        {label}
        {required && <span className="ml-1 text-xs text-fuchsia-300">*</span>}
      </label>
    );

    if (property.type === 'boolean') {
      const checked = Boolean(formValues[key]);
      return (
        <div
          key={key}
          className="flex items-start justify-between gap-3 rounded-xl border border-white/10 bg-black/30 px-4 py-3"
        >
          <div>
            <p className="text-sm font-medium text-gray-200">
              {label}
              {required && <span className="ml-1 text-xs text-fuchsia-300">*</span>}
            </p>
            {description && <p className="text-xs text-gray-400 mt-1">{description}</p>}
          </div>
          <input
            id={id}
            type="checkbox"
            className="h-5 w-5 cursor-pointer accent-fuchsia-400"
            checked={checked}
            onChange={event => updateFormValue(key, property, event.target.checked)}
          />
        </div>
      );
    }

    if (isImageUploadField(key, property)) {
      const fileName = fileNames[key];
      return (
        <div key={key} className="flex flex-col gap-2">
          {commonLabel}
          <input
            id={id}
            type="file"
            accept={property.contentMediaType ?? 'image/*'}
            className="w-full cursor-pointer rounded-2xl border border-white/10 bg-slate-900/70 px-4 py-3 text-sm text-white shadow-lg transition focus:border-fuchsia-400 focus:outline-none focus:ring-2 focus:ring-fuchsia-500/40"
            onChange={event => {
              const file = event.target.files?.[0];
              if (!file) {
                updateFormValue(key, property, '');
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
          {fileName && <p className="text-xs text-gray-400">{fileName}</p>}
          {description && <p className="text-xs text-gray-400">{description}</p>}
        </div>
      );
    }

    if (property.enum) {
      const value = formValues[key];
      return (
        <div key={key} className="flex flex-col gap-2">
          {commonLabel}
          <select
            id={id}
            value={(value as string | number | undefined) ?? ''}
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
            className="w-full rounded-2xl border border-white/10 bg-slate-900/70 px-4 py-3 text-sm text-white shadow-lg transition focus:border-fuchsia-400 focus:outline-none focus:ring-2 focus:ring-fuchsia-500/40"
          >
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
          {description && <p className="text-xs text-gray-400">{description}</p>}
        </div>
      );
    }

    if (property.type === 'number' || property.type === 'integer') {
      const value = formValues[key];
      return (
        <div key={key} className="flex flex-col gap-2">
          {commonLabel}
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
            className="w-full rounded-2xl border border-white/10 bg-slate-900/70 px-4 py-3 text-sm text-white shadow-lg transition focus:border-fuchsia-400 focus:outline-none focus:ring-2 focus:ring-fuchsia-500/40"
          />
          {description && <p className="text-xs text-gray-400">{description}</p>}
        </div>
      );
    }

    if (shouldUseTextarea(key, property)) {
      const value = formValues[key];
      return (
        <div key={key} className="flex flex-col gap-2">
          {commonLabel}
          <textarea
            id={id}
            value={typeof value === 'string' ? value : ''}
            onChange={event => updateFormValue(key, property, event.target.value)}
            placeholder={property.description ?? ''}
            className="h-40 sm:h-48 md:h-60 resize-none rounded-2xl border border-white/10 bg-slate-900/70 p-4 text-sm text-white shadow-lg transition focus:border-fuchsia-400 focus:outline-none focus:ring-2 focus:ring-fuchsia-500/40 placeholder:text-gray-500"
          />
          {description && <p className="text-xs text-gray-400">{description}</p>}
        </div>
      );
    }

    return (
      <div key={key} className="flex flex-col gap-2">
        {commonLabel}
        <input
          id={id}
          type="text"
          value={typeof formValues[key] === 'string' ? (formValues[key] as string) : ''}
          onChange={event => updateFormValue(key, property, event.target.value)}
          placeholder={property.description ?? ''}
          className="w-full rounded-2xl border border-white/10 bg-slate-900/70 px-4 py-3 text-sm text-white shadow-lg transition focus:border-fuchsia-400 focus:outline-none focus:ring-2 focus:ring-fuchsia-500/40 placeholder:text-gray-500"
        />
        {description && <p className="text-xs text-gray-400">{description}</p>}
      </div>
    );
  }

  async function handleGenerate() {
    if (!slug || !defaultVersionTag || !schemaAvailable) return;
    if (missingRequired) {
      toast('Preencha os campos obrigatórios antes de gerar.');
      return;
    }
    if (!token) {
      console.warn('User not authenticated');
      return;
    }

    setLoading(true);
    setSelectedImageUrl(null);
    setSelectedJobId(null);

    const params: Record<string, unknown> = {};

    Object.keys(schemaProperties).forEach(key => {
      const value = formValues[key];
      const defaultValue = versionDetails?.defaults?.[key];
      if (typeof value === 'boolean') {
        params[key] = value;
        return;
      }
      if (value === '' || value === undefined || value === null) {
        if (defaultValue !== undefined) {
          params[key] = defaultValue;
        } else if (requiredFields.has(key)) {
          params[key] = value;
        }
        return;
      }
      params[key] = value;
    });

    try {
      const versionTag = defaultVersionTag;
      if (!versionTag) {
        throw new Error('Model default version not available');
      }
      const jobId = await createImageJob(slug, versionTag, params);
      const newJob: UiJob = {
        id: jobId,
        status: 'loading',
        url: null,
        aspectRatio: '1:1',
      };

      setImages(prev => [newJob, ...prev]);
      setCurrentPage(1);

      const poll = setInterval(async () => {
        try {
          const content = await getJobStatus(jobId);
          if (!content) return;
          const status = content.status?.toUpperCase();
          const rawUrl =
            content.imageUrl ?? (Array.isArray(content.imageUrls) ? content.imageUrls[0] : null);

          if (status === 'COMPLETED') {
            clearInterval(poll);
            const fullUrl = normalizeUrl(rawUrl);

            setImages(prev =>
              prev.map(job => (job.id === jobId ? { ...job, status: 'done', url: fullUrl } : job)),
            );
            setSelectedImageUrl(fullUrl);
            setSelectedJobId(jobId);

            try {
              const updatedHistory = await getUserHistory();
              setHistory(updatedHistory);
            } catch (historyError) {
              console.warn('Failed to update history:', historyError);
            }

            window.dispatchEvent(new Event('creditsUpdated'));
            setLoading(false);
          }

          if (status === 'FAILED') {
            clearInterval(poll);
            setImages(prev => prev.map(job => (job.id === jobId ? { ...job, status: 'done' } : job)));
            setLoading(false);
          }
        } catch (pollError) {
          console.error('Polling error:', pollError);
          clearInterval(poll);
          setLoading(false);
        }
      }, 2000);
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
        toast('Não foi possível iniciar a geração de imagens.');
      }
      setLoading(false);
    }
  }

  const isGenerateDisabled =
    loading || !token || !schemaAvailable || missingRequired || !defaultVersionTag;

  return (
    <div className="flex h-full flex-1 flex-col lg:flex-row lg:items-start animate-fade-in">
      <div className="w-full lg:w-[480px] flex-shrink-0 p-3 sm:p-4 md:p-6 flex flex-col h-auto lg:h-full bg-black/40 backdrop-blur-lg animate-fade-in">
        <div className="flex flex-col gap-5 md:gap-6 lg:flex-1">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4 shadow-inner shadow-purple-500/10">
            <div className="flex items-center justify-between gap-3">
              <span className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-fuchsia-500/30 via-purple-500/30 to-cyan-400/30 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.25em] text-fuchsia-100">
                imagino.AI studio
              </span>
              <span className="text-[11px] text-gray-400">Credits update live</span>
            </div>
            <p className="mt-3 text-sm text-gray-200">
              {detailsLoading
                ? 'Carregando modelo...'
                : details?.displayName ?? slug ?? 'Modelo de imagem'}
            </p>
            {detailsError && <p className="mt-2 text-xs text-rose-300">{detailsError}</p>}
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/5 p-4 space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-white">Model version</p>
              <span className="text-[11px] uppercase tracking-[0.25em] text-gray-500">
                {versionLabel}
              </span>
            </div>
          </div>

          {promptKey && schemaAvailable && !versionLoading ? (
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <label htmlFor={`${slug}-${promptKey}`} className="text-sm font-medium text-gray-200">
                  {schemaProperties[promptKey]?.title ?? 'Creative brief'}
                </label>
                <span className="text-[11px] text-gray-500">Add subject, mood &amp; camera details</span>
              </div>
              <textarea
                id={`${slug}-${promptKey}`}
                value={promptValue}
                onChange={event => updateFormValue(promptKey, schemaProperties[promptKey], event.target.value)}
                placeholder={
                  schemaProperties[promptKey]?.description ??
                  'Describe the scene, subject, style, and lighting you want to see...'
                }
                className="h-40 sm:h-48 md:h-72 resize-none rounded-2xl border border-white/10 bg-slate-900/70 p-4 text-sm text-white shadow-lg transition focus:border-fuchsia-400 focus:outline-none focus:ring-2 focus:ring-fuchsia-500/40 placeholder:text-gray-500"
              />
              <div className="flex flex-wrap gap-2">
                {promptSuggestions.map(suggestion => (
                  <button
                    key={suggestion.title}
                    type="button"
                    onClick={() => updateFormValue(promptKey, schemaProperties[promptKey], suggestion.prompt)}
                    className="group flex-1 min-w-[160px] rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-left text-xs text-gray-200 transition hover:border-fuchsia-400/40 hover:bg-white/10"
                  >
                    <span className="block text-xs font-semibold text-white">{suggestion.title}</span>
                    <span className="mt-1 block text-[11px] text-gray-400 group-hover:text-gray-200">
                      {suggestion.prompt}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          {versionLoading && (
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-gray-400">
              Carregando campos do modelo...
            </div>
          )}

          {!versionLoading && schemaAvailable && (
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4 space-y-4">
              {otherKeys.map(renderField)}
            </div>
          )}

          {!versionLoading && !schemaAvailable && (
            <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-4 text-sm text-rose-200">
              {versionError ?? 'Detalhes do modelo não disponíveis.'}
            </div>
          )}
        </div>

        <button
          onClick={handleGenerate}
          disabled={isGenerateDisabled}
          className="mt-4 md:mt-6 w-full rounded-2xl bg-gradient-to-r from-fuchsia-500 via-purple-500 to-cyan-400 px-4 md:px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-purple-500/30 transition duration-300 hover:shadow-purple-500/50 focus:outline-none focus:ring-2 focus:ring-fuchsia-500/40 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? 'Generating...' : 'Generate with imagino.AI'}
        </button>
        <p className="mt-2 text-center text-[11px] text-gray-500">
          Each render uses 1 credit. Upgrade plans unlock higher limits and premium models.
        </p>

        {!showCenterOnMobile && doneImages.length > 0 && (
          <div className="mt-3 lg:hidden">
            <div className="flex items-center justify-between mb-2 px-1">
              <h3 className="text-white text-sm">Recent renders</h3>
              {totalPages > 1 && <div className="text-xs text-gray-400">{doneImages.length} renders</div>}
            </div>
            <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2 -mx-1 px-1">
              {doneImages.slice(0, 30).map(job => (
                <img
                  key={job.id}
                  src={job.url!}
                  onClick={() => {
                    setSelectedImageUrl(job.url!);
                    setSelectedJobId(job.id);
                  }}
                  className={`cursor-pointer rounded-md border-2 object-cover w-20 h-20 flex-none transition-all ${
                    selectedImageUrl === job.url ? 'border-purple-500' : 'border-transparent'
                  }`}
                  alt=""
                />
              ))}
            </div>
          </div>
        )}
      </div>

      <div className={`${showCenterOnMobile ? 'flex' : 'hidden'} lg:flex flex-1 p-4 pt-2 flex-col items-center justify-start`}>
        {centerImageUrl ? (
          <div className="max-w-[512px] w-full">
            <ImageCard
              src={centerImageUrl}
              jobId={selectedJobId ?? undefined}
              loading={false}
              onClick={() => {
                setModalOpen(true);
              }}
            />
          </div>
        ) : loading ? (
          <div className="max-w-[512px] w-full">
            <ImageCard loading={true} onClick={() => {}} />
          </div>
        ) : (
          <div className="hidden lg:block px-4 text-center text-sm text-gray-500">
            Draft your creative brief and press &quot;Generate with imagino.AI&quot; to begin.
          </div>
        )}

        {doneImages.length > 0 && showCenterOnMobile && (
          <div className="mt-4 w-full lg:hidden">
            <div className="flex items-center justify-between mb-2 px-1">
              <h3 className="text-white text-sm">Recent renders</h3>
              {totalPages > 1 && (
                <div className="text-xs text-gray-400">{doneImages.length} renders</div>
              )}
            </div>
            <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2 -mx-1 px-1">
              {doneImages.slice(0, 30).map(job => (
                <img
                  key={job.id}
                  src={job.url!}
                  onClick={() => {
                    setSelectedImageUrl(job.url!);
                    setSelectedJobId(job.id);
                  }}
                  className={`cursor-pointer rounded-md border-2 object-cover w-20 h-20 flex-none transition-all ${
                    selectedImageUrl === job.url ? 'border-purple-500' : 'border-transparent'
                  }`}
                  alt=""
                />
              ))}
            </div>
          </div>
        )}
      </div>

      {doneImages.length > 0 && (
        <div className="hidden lg:block w-full lg:w-64 flex-shrink-0 p-4 bg-black/30 backdrop-blur-md">
          <h3 className="text-white mb-2 text-sm md:text-base">Recent renders</h3>
          <div className="grid grid-cols-3 lg:grid-cols-2 gap-2 overflow-hidden">
            {paginatedImages.map(job => (
              <img
                key={job.id}
                src={job.url!}
                onClick={() => {
                  setSelectedImageUrl(job.url!);
                  setSelectedJobId(job.id);
                }}
                className={`cursor-pointer rounded-md border-2 object-cover w-16 h-16 lg:w-24 lg:h-24 transition-all transform hover:scale-105 ${
                  selectedImageUrl === job.url ? 'border-purple-500' : 'border-transparent'
                } hover:border-purple-400`}
                alt=""
              />
            ))}
          </div>
          {totalPages > 1 && (
            <div className="flex justify-center gap-4 mt-2 text-white">
              <button
                onClick={() => setCurrentPage(p => Math.max(p - 1, 1))}
                disabled={currentPage === 1}
                className="disabled:opacity-50 p-1"
              >
                <ChevronLeft size={16} />
              </button>
              <button
                onClick={() => setCurrentPage(p => Math.min(p + 1, totalPages))}
                disabled={currentPage === totalPages}
                className="disabled:opacity-50 p-1"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          )}
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
