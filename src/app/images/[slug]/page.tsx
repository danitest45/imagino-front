import ImageModelClient from './ImageModelClient';

type ImageModelPageParams = { slug: string };

export default function ImageModelPage({ params }: { params: ImageModelPageParams }) {
  return <ImageModelClient slug={params.slug.toLowerCase()} />;
}
