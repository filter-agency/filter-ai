import { generateText } from './services';
import { prompts } from './prompts';
import { __ } from '@wordpress/i18n';

export const getTitleFromContent = async (content: string, oldTitle?: string, customPrompt?: string) => {
  if (!content) {
    throw new Error(__('Please add some content first.', 'filter-ai'));
  }

  const promptDifference = oldTitle ? `${prompts.common.different} "${oldTitle}".` : '';

  return generateText({
    feature: 'filter-ai-post-title',
    prompt: `${prompts.common.prefix} ${promptDifference} ${customPrompt} ${content}`,
  });
};
