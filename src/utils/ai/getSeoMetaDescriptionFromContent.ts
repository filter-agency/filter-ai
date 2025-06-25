import { generateText } from './services';
import { prompts } from './prompts';
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

  return generateText({
    feature: 'filter-ai-seo-meta-description',
    prompt: `${prompts.common.prefix} ${promptDifference} ${customPrompt} ${content}`,
  });
};
