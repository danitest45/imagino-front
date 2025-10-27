import ImageModelClient from './ImageModelClient';

type ImageModelPageParams = { slug: string };

export default function ImageModelPage({
  params,
}: {
  params: ImageModelPageParams;
}) {
  const { slug } = params;
  return <ImageModelClient slug={slug} />;
}
