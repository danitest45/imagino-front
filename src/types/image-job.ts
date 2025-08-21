// JSON sent by the backend (ASP.NET camelCase)
export interface ImageJobApi {
  id: string;
  jobId: string;
  prompt: string;
  userId: string;
  status: 'loading' | 'processing' | 'done' | 'failed';
  imageUrl: string | null;
  imageUrls?: string[];          // <- what the backend is sending
  aspectRatio?: string | null;
  createdAt: string; // ISO
  updatedAt: string; // ISO
}

// Format already used by the page UI
export interface UiJob {
  id: string;
  status: 'loading' | 'done';
  url: string | null;
  aspectRatio: string;
}

// Detalhes retornados pelo endpoint GET /api/jobs/details/{jobId}
export interface JobDetails {
  imageUrl: string;
  prompt: string;
  username: string;
  createdAt: string;
  aspectRatio: string;
}

export interface LatestJob {
  id: string;
  imageUrl: string;
  prompt: string;
  username: string | null;
  createdAt: string;
  aspectRatio: string | null;
}
