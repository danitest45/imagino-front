import { notFound } from 'next/navigation';
import ImageModelClient from './ImageModelClient';

type ImageModelPageParams = { slug: string };

type ImageModelPageProps = {
  params: ImageModelPageParams | Promise<ImageModelPageParams>;
};

export default async function ImageModelPage({ params }: ImageModelPageProps) {
  const resolvedParams = await Promise.resolve(params);
  const slug = typeof resolvedParams.slug === 'string' ? resolvedParams.slug.toLowerCase() : '';

  if (!slug) {
    notFound();
  }

  return <ImageModelClient slug={slug} />;
}
