import ImageModelClient from './ImageModelClient';

type ImageModelPageParams = {
  slug: string;
};

export default async function ImageModelPage({
  params,
}: {
  params: Promise<ImageModelPageParams>;
}) {
  const { slug } = await params;

  return <ImageModelClient slug={slug} />;
}
