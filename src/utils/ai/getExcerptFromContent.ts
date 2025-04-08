import { generateText } from './services';
import { prompts } from './prompts';
import { t } from '../translate';

export const getExcerptFromContent = async (content: string, oldExcerpt?: string, customPrompt?: string) => {
  if (!content) {
    throw new Error(t('Please add some content first.'));
  }

  const prePrompt = oldExcerpt ? `${t(prompts.common.different)} "${oldExcerpt}".` : '';

  const prompt = customPrompt || prompts.post.excerpt;

  return generateText({
    feature: 'filter-ai-post-excerpt',
    prompt: `${prePrompt} ${t(prompt)} ${content}`,
  });
};
