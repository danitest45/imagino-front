// JSON que o back envia (camelCase padrão do ASP.NET)
export interface ImageJobApi {
  id: string;
  jobId: string;
  prompt: string;
  userId: string;
  status: 'loading' | 'processing' | 'done' | 'failed';
  imageUrl: string | null;
  aspectRatio?: string | null;
  createdAt: string; // ISO
  updatedAt: string; // ISO
}

// Formato que a UI da página já usa
export interface UiJob {
  id: string;
  status: 'loading' | 'done';
  url: string | null;
  aspectRatio: string;
}
