import { getSettings } from '@/settings';
import { generateText } from './services';
import { __ } from '@wordpress/i18n';

export const getExcerptFromContent = async (
  content: string,
  oldExcerpt?: string,
  customPrompt?: string,
  serviceConfig?: { service: string }
) => {
  if (!content) {
    throw new Error(__('Please add some content first.', 'filter-ai'));
  }

  const settings = await getSettings();

  const promptDifference =
    oldExcerpt && settings?.common_prompt_different ? `${settings.common_prompt_different} "${oldExcerpt}".` : '';

  return generateText({
    feature: 'filter-ai-post-excerpt',
    prompt: `${settings?.common_prompt_prefix || ''} ${promptDifference} ${customPrompt} ${content}`,
    service: serviceConfig?.service,
  });
};
