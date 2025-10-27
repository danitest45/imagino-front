import ImageModelClient from './ImageModelClient';

type SegmentParams = Record<string, string | string[] | undefined>;

type PageProps = {
  params?: Promise<SegmentParams>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function isPromise<T>(value: unknown): value is Promise<T> {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as Promise<T>).then === 'function'
  );
}

function assertHasSlug(params: SegmentParams): asserts params is { slug: string } {
  if (typeof params.slug !== 'string') {
    throw new Error('Missing slug param');
  }
}

export default function ImageModelPage({ params }: PageProps) {
  if (!params) {
    throw new Error('Missing route params');
  }

  if (isPromise<SegmentParams>(params)) {
    throw new Error('Route params must be provided synchronously');
  }

  assertHasSlug(params);

  return <ImageModelClient slug={params.slug} />;
}
