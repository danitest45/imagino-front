export async function createRunpodJob(prompt: string, options: {width: number; height: number;}) {
  const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/comfy`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt, negativePrompt: 'low quality, blurry', width: options.width, height: options.height, numInferenceSteps: 30, refinerInferenceSteps: 50, guidanceScale: 7.5, scheduler: 'K_EULER' })
  });
  const json = await res.json();
  return json.content.jobId as string;
}

export async function createReplicateJob(prompt: string, aspectRatio: string) {
  const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/replicate/jobs`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt, aspectRatio })
  });
  const json = await res.json();
  return json.content.jobId as string;
}

export async function getJobStatus(jobId: string) {
  const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/jobs/${jobId}`);
  if (!res.ok) return null;
  return (await res.json()).content;
}
