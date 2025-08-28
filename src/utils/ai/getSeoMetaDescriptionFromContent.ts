import { getSettings } from '@/settings';
import { generateText } from './services';
import { __ } from '@wordpress/i18n';

export const getSeoMetaDescriptionFromContent = async (
  content: string,
  oldDescription?: string,
  customPrompt?: string,
  serviceConfig?: { service: string; model: string }
) => {
  if (!content) {
    throw new Error(__('Please add some content first.', 'filter-ai'));
  }

  const settings = await getSettings();

  const promptDifference =
    oldDescription && settings?.common_prompt_different
      ? `${settings.common_prompt_different} "${oldDescription}".`
      : '';

  return generateText({
    feature: 'filter-ai-seo-meta-description',
    prompt: `${settings?.common_prompt_prefix || ''} ${promptDifference} ${customPrompt} ${content}`,
    service: serviceConfig?.service,
    model: serviceConfig?.model,
  });
};
