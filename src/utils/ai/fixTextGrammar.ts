import { __ } from '@wordpress/i18n';
import { generateText } from './services';
import { getSettings } from '@/settings';

export const fixTextGrammar = async (content: string, prompt: string, service?: string) => {
  if (!prompt) {
    throw new Error(__('Prompt missing, please check settings', 'filter-ai'));
  }

  if (!content) {
    throw new Error(__('Please provide some text', 'filter-ai'));
  }

  const settings = await getSettings();

  return generateText({
    feature: 'filter-ai-fix-grammar',
    prompt: `${settings?.common_prompt_prefix || ''} ${prompt} \`${content}\``,
    service,
  });
};
