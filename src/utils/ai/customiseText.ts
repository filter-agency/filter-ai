import { __ } from '@wordpress/i18n';
import { generateText } from './services';
import { prompts } from './prompts';

export const customiseText = async (feature: string, text: string, prompt: string) => {
  if (!prompt) {
    throw new Error(__('Prompt missing, please check settings', 'filter-ai'));
  }

  if (!text) {
    throw new Error(__('Please provide some text', 'filter-ai'));
  }

  return generateText({
    feature,
    prompt: `${prompts.common.prefix} ${prompt} \`${text}\``,
  });
};
