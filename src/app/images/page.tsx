import { redirect } from 'next/navigation';
import { getPublicImageModels } from '../../lib/api';

export default async function ImagesIndexPage() {
  let targetSlug = 'replicate';

  try {
    const models = await getPublicImageModels();
    if (models.length > 0 && models[0].slug) {
      targetSlug = models[0].slug;
    }
  } catch (error) {
    console.error('Failed to resolve default image model', error);
  }

  redirect(`/images/${targetSlug}`);
}
