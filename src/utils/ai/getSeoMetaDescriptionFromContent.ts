import { generateText } from './services';
import { prompts } from './prompts/index';
import { __ } from '@wordpress/i18n';

export const getSeoMetaDescriptionFromContent = async (
  content: string,
  oldDescription?: string,
  customPrompt?: string
) => {
  if (!content) {
    throw new Error(__('Please add some content first.', 'filter-ai'));
  }

  const promptDifference = oldDescription ? `${prompts.common.different} "${oldDescription}".` : '';

  const prompt = customPrompt || prompts.yoast_seo_meta_description_prompt;

  return generateText({
    feature: 'filter-ai-seo-meta-description',
    prompt: `${prompts.common.prefix} ${promptDifference} ${prompt} ${content}`,
  });
};
