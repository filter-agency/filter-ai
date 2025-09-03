import { __ } from '@wordpress/i18n';
import { generateText } from './services';
import { getSettings } from '@/settings';

export const customiseText = async (
  feature: string,
  text: string,
  prompt: string,
  serviceConfig?: { service: string; name: string }
) => {
  if (!prompt) {
    throw new Error(__('Prompt missing, please check settings', 'filter-ai'));
  }

  if (!text) {
    throw new Error(__('Please provide some text', 'filter-ai'));
  }

  const settings = await getSettings();

  return generateText({
    feature,
    prompt: `${settings?.common_prompt_prefix || ''} ${prompt} \`${text}\``,
    service: serviceConfig?.service,
  });
};
