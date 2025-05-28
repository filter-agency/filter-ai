import { generateText } from './services';
import { prompts } from './prompts';
import { __ } from '@wordpress/i18n';

export const getExcerptFromContent = async (content: string, oldExcerpt?: string, customPrompt?: string) => {
  if (!content) {
    throw new Error(__('Please add some content first.', 'filter-ai'));
  }

  const prePrompt = oldExcerpt ? `${prompts.common.different} "${oldExcerpt}".` : '';

  const prompt = customPrompt || prompts.post_excerpt_prompt;

  return generateText({
    feature: 'filter-ai-post-excerpt',
    prompt: `${prePrompt} ${prompt} ${content}`,
  });
};
