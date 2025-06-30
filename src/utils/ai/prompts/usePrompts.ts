import { useSettings } from '@/settings';

export const usePrompts = (key: string) => {
  const { settings } = useSettings();

  const prompt = [settings?.[key]];

  if (settings?.stop_words_enabled && settings?.stop_words_prompt && settings?.stop_words_pre_prompt) {
    prompt.unshift(`${settings.stop_words_pre_prompt} ${settings.stop_words_prompt}`);
  }

  if (settings?.brand_voice_enabled && settings?.brand_voice_prompt) {
    prompt.unshift(settings.brand_voice_prompt);
  }

  return prompt.join('\n\n');
};
