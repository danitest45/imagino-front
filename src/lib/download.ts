import { fetchWithAuth } from './auth';
import { apiUrl } from './config';

export async function downloadJob(jobId: string): Promise<void> {
  try {
    const response = await fetchWithAuth(apiUrl(`/api/image/jobs/${jobId}/download`));
    const blob = await response.blob();
    const extension = blob.type === 'image/jpeg' ? 'jpg'
      : blob.type === 'image/gif' ? 'gif' : 'png';
    const blobUrl = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = blobUrl;
    link.download = `imagino-${jobId}.${extension}`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(blobUrl), 0);
  } catch (error) {
    console.error('Failed to download image', error);
  }
}
