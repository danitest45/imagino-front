import { notFound } from 'next/navigation';
import GenerationLibrary from '../../components/generation/GenerationLibrary';

export const metadata = { title: 'Library · Imagino', robots: { index: false, follow: false } };

export default function LibraryPage() {
  if (process.env.NEXT_PUBLIC_GENERATION_V2_ENABLED !== 'true') notFound();
  return <GenerationLibrary />;
}
