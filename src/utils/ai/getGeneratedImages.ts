import { __ } from '@wordpress/i18n';
import { generateImage } from '@/utils/ai/services/generateImage';
import { prompts } from '@/utils/ai/prompts';

export const getGeneratedImages = async (prompt: string) => {
  if (!prompt) {
    throw new Error(__('Prompt missing, please check settings', 'filter-ai'));
  }

  const images = await generateImage({
    prompt: `${prompts.generate_image_pre_prompt} ${prompt}`,
    feature: 'generate-ai-img-feature',
    candidateCount: 3,
    aspectRatio: '1:1',
  });

  return images;
};
