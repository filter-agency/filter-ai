import { __ } from '@wordpress/i18n';
import { generateText } from './services';
import { getSettings } from '@/settings';

export const customiseText = async (
  feature: string,
  content: string,
  oldContent: string,
  prompt: string,
  service?: string
) => {
  if (!prompt) {
    throw new Error(__('Prompt missing, please check settings', 'filter-ai'));
  }

  if (!content) {
    throw new Error(__('Please provide some text', 'filter-ai'));
  }

  const settings = await getSettings();

  const promptDifference =
    oldContent && settings?.common_prompt_different ? `${settings.common_prompt_different} "${oldContent}".` : '';

  const prePrompt = settings?.customise_text_pre_prompt || '';

  return generateText({
    feature,
    prompt: `${settings?.common_prompt_prefix || ''} ${prePrompt} ${promptDifference} ${prompt} \`${content}\``,
    service,
  });
};
