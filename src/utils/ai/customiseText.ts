import { t } from '@/utils/translate';
import { generateText } from './services';

export const customiseText = async (feature: string, text: string, prompt: string) => {
  if (!prompt) {
    throw new Error(t('Prompt missing, please check settings'));
  }

  if (!text) {
    throw new Error(t('Please provide some text'));
  }

  return generateText({
    feature,
    prompt: `${prompt} \`${text}\``,
  });
};
