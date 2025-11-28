import { generateText } from './services';
import { __ } from '@wordpress/i18n';
import { getSettings } from '@/settings';

export const getTitleFromContent = async (
  content: string,
  oldTitle?: string,
  customPrompt?: string,
  service?: string
) => {
  if (!content) {
    throw new Error(__('Please add some content first.', 'filter-ai'));
  }

  const settings = await getSettings();

  const promptDifference =
    oldTitle && settings?.common_prompt_different ? `${settings.common_prompt_different} "${oldTitle}".` : '';

  const prePrompt = settings?.customise_text_pre_prompt || '';

  return generateText({
    feature: 'filter-ai-post-title',
    prompt: `${settings?.common_prompt_prefix || ''} ${prePrompt} ${promptDifference} ${customPrompt} ${content}`,
    service,
  });
};
