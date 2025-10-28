import ImageModelClient from './ImageModelClient';

type Params = { slug: string };

export default function Page({ params }: { params: Params }) {
  return <ImageModelClient slug={params.slug} />;
}
