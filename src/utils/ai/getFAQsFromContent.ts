import { getSettings } from '@/settings';
import { generateText } from './services';
import { __ } from '@wordpress/i18n';

export const getFAQsFromContent = async (
  content: string,
  numberOfItems: string,
  oldFAQs?: string,
  customPrompt?: string,
  service?: string
) => {
  if (!content) {
    throw new Error(__('Please add some content first.', 'filter-ai'));
  }

  const settings = await getSettings();

  const promptDifference =
    oldFAQs && settings?.common_prompt_different ? `${settings.common_prompt_different} "${oldFAQs}".` : '';

  const prompt = customPrompt?.replace('{{number}}', numberOfItems);

  const prePrompt = settings?.yoast_seo_title_pre_prompt || '';

  return generateText({
    feature: 'filter-ai-post-faqs',
    prompt: `${settings?.common_prompt_prefix || ''} ${prePrompt} ${promptDifference} ${prompt} ${content}`,
    service,
  });
};
