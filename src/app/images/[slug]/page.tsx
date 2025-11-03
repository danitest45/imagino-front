'use client';

import ImageCard from '../../../components/ImageCard';
import ImageCardModal from '../../../components/ImageCardModal';
import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  createImageJob,
  getImageModelDetails,
  getImageModelVersionDetails,
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
import { ChevronDown, ChevronLeft, ChevronRight, ImageOff, UploadCloud } from 'lucide-react';
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

function normalizeIdentifier(value: string | undefined): string {
  return (value ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function isReferenceImageField(
  key: string,
  property: JsonSchemaProperty | undefined,
): boolean {
  if (!property) return false;
  if (!isImageUploadField(key, property)) return false;

  const normalizedKey = normalizeIdentifier(key);
  const normalizedTitle = normalizeIdentifier(property.title);
  const normalizedDescription = normalizeIdentifier(property.description);

  const candidates = [normalizedKey, normalizedTitle, normalizedDescription];
  return candidates.some(value => {
    if (!value) return false;
    if (value.includes('referencia')) return true;
    if (value.includes('reference')) return true;
    if (value.includes('ref image')) return true;
    if (value.includes('guidance image')) return true;
    if (value.includes('init image')) return true;
    if (value.includes('source image')) return true;
    if (value.includes('control image')) return true;
    return false;
  });
}

function isPrimaryParamField(
  key: string,
  property: JsonSchemaProperty | undefined,
): boolean {
  if (!property) return false;
  if (isPromptField(key, property)) return false;
  if (isImageUploadField(key, property)) return true;

  const normalize = (value: string | undefined) =>
    (value ?? '').toLowerCase().replace(/[^a-z0-9]/g, '');

  const normalizedKey = normalize(key);
  const normalizedTitle = normalize(property.title);

  const matchesPrimary = (value: string) => {
    if (!value) return false;
    if (value.includes('width') || value.includes('height')) return true;
    if (value.includes('resolution') || value.includes('megapixel')) return true;
    if (value.includes('dimension') || value.includes('size')) return true;
    if (value.includes('aspectratio') || value.endsWith('aspect')) return true;
    if (value.includes('outputquality') || value === 'quality' || value.endsWith('quality')) return true;
    if (value.includes('outputformat') || (value.endsWith('format') && value.includes('output'))) {
      return true;
    }
    if (value.includes('numoutputs') || value.includes('numimages') || value.endsWith('outputs')) {
      return true;
    }
    return false;
  };

  return matchesPrimary(normalizedKey) || matchesPrimary(normalizedTitle);
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
  const [advancedSettingsExpanded, setAdvancedSettingsExpanded] = useState(false);
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

  useEffect(() => {
    if (!slug) return;
    if (!defaultVersionTag) {
      setVersionDetails(null);
      if (!detailsLoading) {
        setVersionError('Detalhes indisponíveis');
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
          setVersionError('Detalhes indisponíveis');
          return;
        }
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
  }, [slug, defaultVersionTag, detailsLoading]);

  useEffect(() => {
    setAdvancedSettingsExpanded(false);
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

  const referenceImageKey = useMemo(
    () =>
      orderedKeys.find(key =>
        isReferenceImageField(key, schemaProperties[key]),
      ),
    [orderedKeys, schemaProperties],
  );

  const otherKeys = useMemo(
    () =>
      orderedKeys.filter(
        key => key !== promptKey && key !== referenceImageKey,
      ),
    [orderedKeys, promptKey, referenceImageKey],
  );

  const primaryKeys = useMemo(
    () =>
      otherKeys.filter(key =>
        isPrimaryParamField(key, schemaProperties[key]),
      ),
    [otherKeys, schemaProperties],
  );

  const advancedKeys = useMemo(
    () =>
      otherKeys.filter(
        key => !isPrimaryParamField(key, schemaProperties[key]),
      ),
    [otherKeys, schemaProperties],
  );

  const hasAdvancedFields = advancedKeys.length > 0;

  const referenceImageProperty = referenceImageKey
    ? schemaProperties[referenceImageKey]
    : undefined;
  const referenceImageValue =
    referenceImageKey && typeof formValues[referenceImageKey] === 'string'
      ? (formValues[referenceImageKey] as string)
      : '';
  const referenceImageFileName = referenceImageKey
    ? fileNames[referenceImageKey]
    : undefined;

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
    const wrapperClass =
      'flex flex-col gap-3 rounded-2xl border border-white/10 bg-slate-950/70 p-4 shadow-inner shadow-purple-500/10 transition hover:border-fuchsia-400/40';
    const labelClass =
      'text-[11px] font-semibold uppercase tracking-[0.32em] text-gray-400';
    const inputClass =
      'w-full rounded-xl border border-white/10 bg-slate-950/40 px-4 py-3 text-sm text-white shadow-lg transition focus:border-fuchsia-400 focus:outline-none focus:ring-2 focus:ring-fuchsia-500/40 placeholder:text-gray-500';

    if (property.type === 'boolean') {
      const checked = Boolean(formValues[key]);
      return (
        <div key={key} className={wrapperClass}>
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
              <span className="sr-only">Alternar {label}</span>
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
        <div key={key} className={wrapperClass}>
          <div className="space-y-1">
            <label htmlFor={id} className={labelClass}>
              {label}
              {required && <span className="ml-1 text-xs text-fuchsia-300">*</span>}
            </label>
            {description && <p className="text-xs leading-5 text-gray-400">{description}</p>}
          </div>
          <label
            htmlFor={id}
            className={`group relative flex cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border border-dashed px-4 py-6 text-center transition ${
              preview
                ? 'border-fuchsia-400/60 bg-slate-900/60'
                : 'border-white/20 bg-slate-950/40 hover:border-fuchsia-400/60 hover:bg-slate-900/60'
            }`}
          >
            {preview ? (
              <img
                src={preview}
                alt={label}
                className="h-32 w-full rounded-lg object-cover shadow-lg"
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
            <span>{fileName ?? 'PNG, JPG ou WEBP até 10MB'}</span>
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
        <div key={key} className={wrapperClass}>
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
            {!required && <option value="">Selecione uma opção</option>}
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
        <div key={key} className={wrapperClass}>
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
        <div key={key} className={wrapperClass}>
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
      <div key={key} className={wrapperClass}>
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

  function renderReferenceSection() {
    const disabled = !referenceImageKey || !referenceImageProperty;
    const label = referenceImageProperty?.title ?? 'Imagem de referência';
    const required = referenceImageKey ? requiredFields.has(referenceImageKey) : false;
    const description =
      referenceImageProperty?.description ?? 'Use uma imagem para guiar o estilo do resultado.';
    const inputId = referenceImageKey ? `${slug}-${referenceImageKey}` : 'reference-image-disabled';
    const preview = referenceImageValue;
    const helperText = referenceImageFileName ?? 'PNG, JPG ou WEBP até 10MB';

    return (
      <div className="rounded-2xl border border-white/10 bg-white/5 p-5 shadow-inner shadow-purple-500/5">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-2">
            <p className="text-sm font-semibold text-white">
              {label}
              {required && <span className="ml-1 text-xs text-fuchsia-300">*</span>}
            </p>
            <p className="text-xs leading-5 text-gray-400">{description}</p>
          </div>
          {!disabled && preview && (
            <button
              type="button"
              onClick={() => {
                if (!referenceImageKey || !referenceImageProperty) return;
                updateFormValue(referenceImageKey, referenceImageProperty, '');
                setFileNames(prev => {
                  const next = { ...prev };
                  delete next[referenceImageKey];
                  return next;
                });
              }}
              className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold text-fuchsia-200 transition hover:border-fuchsia-400/50 hover:text-white"
            >
              Remover
            </button>
          )}
        </div>

        {disabled ? (
          <div className="mt-4 flex h-44 flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-white/15 bg-slate-950/40 text-center text-xs text-gray-500">
            <ImageOff className="h-8 w-8 text-gray-500" />
            <p className="max-w-[220px] text-xs text-gray-500">
              Este modelo não suporta envio de imagem de referência.
            </p>
          </div>
        ) : (
          <div className="mt-4 space-y-3">
            <label
              htmlFor={inputId}
              className={`group relative flex min-h-[176px] cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border border-dashed px-4 py-6 text-center transition ${
                preview
                  ? 'border-fuchsia-400/70 bg-slate-900/70'
                  : 'border-white/20 bg-slate-950/40 hover:border-fuchsia-400/70 hover:bg-slate-900/60'
              }`}
            >
              {preview ? (
                <img
                  src={preview}
                  alt={label}
                  className="h-40 w-full rounded-xl object-cover shadow-lg"
                />
              ) : (
                <>
                  <UploadCloud className="h-10 w-10 text-fuchsia-300" />
                  <span className="text-sm font-semibold text-white">
                    Adicionar referência visual
                  </span>
                  <span className="text-xs text-gray-400">
                    Arraste uma imagem ou clique para selecionar
                  </span>
                </>
              )}
            </label>
            <input
              id={inputId}
              type="file"
              disabled={disabled}
              accept={referenceImageProperty?.contentMediaType ?? 'image/*'}
              className="sr-only"
              onChange={event => {
                if (!referenceImageKey || !referenceImageProperty) return;
                const file = event.target.files?.[0];
                if (!file) {
                  updateFormValue(referenceImageKey, referenceImageProperty, '');
                  setFileNames(prev => {
                    const next = { ...prev };
                    delete next[referenceImageKey];
                    return next;
                  });
                  return;
                }
                const reader = new FileReader();
                reader.onload = e => {
                  updateFormValue(
                    referenceImageKey,
                    referenceImageProperty,
                    e.target?.result ?? '',
                  );
                  setFileNames(prev => ({ ...prev, [referenceImageKey]: file.name }));
                };
                reader.readAsDataURL(file);
              }}
            />
            <p className="text-xs text-gray-400">{helperText}</p>
          </div>
        )}
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
    <div className="flex min-h-screen flex-1 flex-col lg:flex-row lg:items-stretch animate-fade-in">
      <div className="w-full lg:max-w-[620px] xl:max-w-[700px] flex-shrink-0 p-3 sm:p-4 md:p-6 flex flex-col gap-4 bg-black/40 backdrop-blur-lg animate-fade-in lg:h-screen lg:overflow-hidden">
        <header className="rounded-2xl border border-white/10 bg-white/5 p-4 shadow-inner shadow-purple-500/10">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <span className="text-[11px] font-semibold uppercase tracking-[0.32em] text-fuchsia-100">
                imagino.AI studio
              </span>
              <h1 className="mt-1 text-base font-semibold text-white">
                {detailsLoading
                  ? 'Carregando modelo...'
                  : details?.displayName ?? slug ?? 'Modelo de imagem'}
              </h1>
            </div>
            <div className="flex items-center gap-2 text-[11px] text-gray-400">
              <span className="hidden sm:inline">Atualização de créditos em tempo real</span>
              <span className="sm:hidden">Créditos em tempo real</span>
            </div>
          </div>
          {detailsError && <p className="mt-2 text-xs text-rose-300">{detailsError}</p>}
        </header>

        {versionLoading && (
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-gray-400">
            Carregando campos do modelo...
          </div>
        )}

        {!versionLoading && schemaAvailable && (
          <div className="grid gap-4 xl:grid-cols-2">
            <section className="rounded-2xl border border-white/10 bg-white/5 p-4 xl:col-span-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-semibold text-white">Brief criativo</p>
                <span className="text-[11px] uppercase tracking-[0.25em] text-gray-500">Descrição</span>
              </div>
              {promptKey ? (
                <div className="mt-4 flex flex-col gap-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <label htmlFor={`${slug}-${promptKey}`} className="text-sm font-medium text-gray-200">
                      {schemaProperties[promptKey]?.title ?? 'Creative brief'}
                    </label>
                    <span className="text-[11px] text-gray-500">Adicione assunto, estilo e detalhes</span>
                  </div>
                  <textarea
                    id={`${slug}-${promptKey}`}
                    value={promptValue}
                    onChange={event =>
                      updateFormValue(promptKey, schemaProperties[promptKey], event.target.value)
                    }
                    placeholder={
                      schemaProperties[promptKey]?.description ??
                      'Descreva a cena, o estilo e a iluminação desejada...'
                    }
                    className="min-h-[140px] resize-none rounded-2xl border border-white/10 bg-slate-900/70 p-4 text-sm text-white shadow-lg transition focus:border-fuchsia-400 focus:outline-none focus:ring-2 focus:ring-fuchsia-500/40 placeholder:text-gray-500"
                  />
                  <div className="flex flex-wrap gap-2">
                    {promptSuggestions.map(suggestion => (
                      <button
                        key={suggestion.title}
                        type="button"
                        onClick={() =>
                          updateFormValue(promptKey, schemaProperties[promptKey], suggestion.prompt)
                        }
                        className="group min-w-[150px] flex-1 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-left text-xs text-gray-200 transition hover:border-fuchsia-400/40 hover:bg-white/10"
                      >
                        <span className="block text-xs font-semibold text-white">{suggestion.title}</span>
                        <span className="mt-1 block text-[11px] text-gray-400 group-hover:text-gray-200">
                          {suggestion.prompt}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <p className="mt-4 text-sm text-gray-400">
                  Este modelo não possui campo de prompt configurável.
                </p>
              )}
            </section>

            <div className="xl:col-span-1">
              {renderReferenceSection()}
            </div>

            <section className="rounded-2xl border border-white/10 bg-white/5 p-4 xl:col-span-1">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-semibold text-white">Ajustes essenciais</p>
                <span className="text-[11px] uppercase tracking-[0.25em] text-gray-500">Principais controles</span>
              </div>
              {primaryKeys.length > 0 ? (
                <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                  {primaryKeys.map(renderField)}
                </div>
              ) : (
                <p className="mt-4 text-sm text-gray-400">
                  Todos os parâmetros deste modelo estão nas configurações avançadas.
                </p>
              )}
            </section>

            {hasAdvancedFields && (
              <section className="rounded-2xl border border-white/10 bg-white/5 p-4 xl:col-span-2">
                <button
                  type="button"
                  onClick={() => setAdvancedSettingsExpanded(prev => !prev)}
                  className="flex w-full items-center justify-between gap-3 text-left"
                >
                  <div>
                    <p className="text-sm font-semibold text-white">Configurações avançadas</p>
                    <p className="text-xs text-gray-400">Ajuste parâmetros adicionais para refinar o resultado.</p>
                  </div>
                  <span
                    className={`rounded-full border border-white/10 bg-white/5 p-1 transition ${
                      advancedSettingsExpanded
                        ? 'rotate-180 border-fuchsia-400/40 text-fuchsia-200'
                        : 'text-gray-400'
                    }`}
                  >
                    <ChevronDown className="h-4 w-4" />
                  </span>
                </button>
                {advancedSettingsExpanded && (
                  <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
                    {advancedKeys.map(renderField)}
                  </div>
                )}
              </section>
            )}
          </div>
        )}

        {!versionLoading && !schemaAvailable && (
          <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-4 text-sm text-rose-200">
            {versionError ?? 'Detalhes indisponíveis'}
          </div>
        )}

        <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_220px] xl:items-center">
          <p className="order-2 text-center text-[11px] text-gray-500 xl:order-1 xl:text-left">
            Each render uses 1 credit. Upgrade plans unlock higher limits and premium models.
          </p>
          <button
            onClick={handleGenerate}
            disabled={isGenerateDisabled}
            className="order-1 w-full rounded-2xl bg-gradient-to-r from-fuchsia-500 via-purple-500 to-cyan-400 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-purple-500/30 transition duration-300 hover:shadow-purple-500/50 focus:outline-none focus:ring-2 focus:ring-fuchsia-500/40 disabled:cursor-not-allowed disabled:opacity-60 xl:order-2"
          >
            {loading ? 'Generating...' : 'Generate with imagino.AI'}
          </button>
        </div>

        {!showCenterOnMobile && doneImages.length > 0 && (
          <div className="lg:hidden">
            <div className="mb-2 flex items-center justify-between px-1">
              <h3 className="text-sm text-white">Recent renders</h3>
              {totalPages > 1 && <div className="text-xs text-gray-400">{doneImages.length} renders</div>}
            </div>
            <div className="-mx-1 flex gap-2 overflow-x-auto pb-2 px-1 no-scrollbar">
              {doneImages.slice(0, 30).map(job => (
                <img
                  key={job.id}
                  src={job.url!}
                  onClick={() => {
                    setSelectedImageUrl(job.url!);
                    setSelectedJobId(job.id);
                  }}
                  className={`h-20 w-20 flex-none cursor-pointer rounded-md border-2 object-cover transition-all ${
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
