import { getSettings } from '@/settings';
import { generateText } from './services';
import { __ } from '@wordpress/i18n';

export const getSeoTitleFromContent = async (
  content: string,
  oldTitle?: string,
  customPrompt?: string,
  serviceConfig?: { service: string; model: string }
) => {
  if (!content) {
    throw new Error(__('Please add some content first.', 'filter-ai'));
  }

  const settings = await getSettings();

  const prePrompt = settings?.yoast_seo_title_pre_prompt || '';

  const promptDifference =
    oldTitle && settings?.common_prompt_different ? `${settings.common_prompt_different} "${oldTitle}".` : '';

  return generateText({
    feature: 'filter-ai-seo-title',
    prompt: `${prePrompt} ${promptDifference} ${customPrompt} ${content}`,
    service: serviceConfig?.service,
    model: serviceConfig?.model,
  });
};
