import ImageModelClient from './ImageModelClient';

type ImageModelPageParams = { slug: string };

type ImageModelPageProps = {
  params: ImageModelPageParams | Promise<ImageModelPageParams>;
};

export default function ImageModelPage({ params }: ImageModelPageProps) {
  const resolvedParams = params as ImageModelPageParams;
  return <ImageModelClient slug={resolvedParams.slug} />;
}
