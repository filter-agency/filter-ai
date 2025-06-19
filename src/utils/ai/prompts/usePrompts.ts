import { useSettings } from '@/settings';
import { prompts } from '.'

export const usePrompts = (key: keyof typeof prompts) => {
  const { settings } = useSettings();

  const prompt = [settings?.[key] || prompts?.[key]];

  if (settings?.stop_words_enabled) {
    const stopWordsPrompt = settings?.stop_words_prompt || prompts.stop_words_prompt;

    prompt.unshift(stopWordsPrompt);
  }

  if (settings?.brand_voice_enabled) {
    const brandVoicePrompt = settings?.brand_voice_prompt || prompts.brand_voice_prompt;

    prompt.unshift(brandVoicePrompt);
  }

  return prompt.join('\n\n');
};