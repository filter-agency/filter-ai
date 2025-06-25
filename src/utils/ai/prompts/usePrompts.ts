import { useSettings } from '@/settings';
import { prompts } from '.';

export const usePrompts = (key: keyof typeof prompts) => {
  const { settings } = useSettings();

  const prompt = [settings?.[key] || prompts?.[key]];

  if (settings?.stop_words_enabled && (settings?.stop_words_prompt || prompts.stop_words_prompt)) {
    prompt.unshift(`${prompts.stop_words_pre_prompt} ${settings.stop_words_prompt || prompts.stop_words_prompt}`);
  }

  if (settings?.brand_voice_enabled && (settings?.brand_voice_prompt || prompts.brand_voice_prompt)) {
    prompt.unshift(settings?.brand_voice_prompt || prompts.brand_voice_prompt);
  }

  return prompt.join('\n\n');
};
