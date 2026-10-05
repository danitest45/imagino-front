import { notFound } from 'next/navigation';
import GenerationWorkspace from '../../../components/generation/GenerationWorkspace';

export default async function CreatePage({ params }: { params: Promise<{ kind: string }> }) {
  const { kind } = await params;
  if (process.env.NEXT_PUBLIC_GENERATION_V2_ENABLED !== 'true' || (kind !== 'image' && kind !== 'video')) notFound();
  return <GenerationWorkspace kind={kind} />;
}
