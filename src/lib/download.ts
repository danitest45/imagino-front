import { normalizeUrl } from './api';

export function downloadJob(jobId: string) {
  const url = normalizeUrl(`/api/jobs/${jobId}/download`);
  if (!url) return;
  const link = document.createElement('a');
  link.href = url;
  link.download = '';
  document.body.appendChild(link);
  link.click();
  link.remove();
}
