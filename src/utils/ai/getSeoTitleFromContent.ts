import { generateText } from './services';
import { prompts } from './prompts/index';
import { __ } from '@wordpress/i18n';

export const getSeoTitleFromContent = async (content: string, oldTitle?: string, customPrompt?: string) => {
  if (!content) {
    throw new Error(__('Please add some content first.', 'filter-ai'));
  }

  const prePrompt =
    'Please provide 5 options separated by 2 pipes "||", do not return anything other than your answer.';

  const promptDifference = oldTitle ? `${prompts.common.different} "${oldTitle}".` : '';

  const prompt = customPrompt || prompts.yoast_seo_title_prompt;

  return generateText({
    feature: 'filter-ai-seo-title',
    prompt: `${prePrompt} ${promptDifference} ${prompt} ${content}`,
  });
};
