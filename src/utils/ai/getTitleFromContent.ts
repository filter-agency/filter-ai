import { generateText } from './services';
import { prompts } from './prompts';
import { t } from '@/utils/translate';

export const getTitleFromContent = async (content: string, oldTitle?: string, customPrompt?: string) => {
  if (!content) {
    throw new Error(t('Please add some content first.'));
  }

  const prePrompt = oldTitle ? `${t(prompts.common.different)} "${oldTitle}".` : '';

  const prompt = customPrompt || prompts.post_title_prompt;

  return generateText({
    feature: 'filter-ai-post-title',
    prompt: `${prePrompt} ${t(prompt)} ${content}`,
  });
};
