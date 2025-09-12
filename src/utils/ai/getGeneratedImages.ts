import { __ } from '@wordpress/i18n';
import { generateImage } from '@/utils/ai/services/generateImage';
import { getSettings } from '@/settings';

export const getGeneratedImages = async (prompt: string, service?: string) => {
  if (!prompt) {
    throw new Error(__('Prompt missing, please check settings', 'filter-ai'));
  }

  const settings = await getSettings();

  const images = await generateImage({
    prompt: `${settings?.generate_image_pre_prompt || ''} ${prompt}`,
    feature: 'generate-ai-img-feature',
    candidateCount: 3,
    aspectRatio: '1:1',
    service,
  });

  return images;
};
