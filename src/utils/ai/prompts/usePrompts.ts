import { buildPrompt } from './buildPrompt';
import { useSettings } from '@/settings';
import { prompts } from '.';

export const usePrompts = (key: keyof typeof prompts) => {
  const { settings } = useSettings();
  const parts: string[] = [];

  const hasValue = (val: unknown): val is string => typeof val === 'string' && val.trim().length > 0;

  if (
    settings?.brand_voice_enabled &&
    hasValue(settings.brand_voice_prompt)
  ) {
    parts.push(buildPrompt('brand_voice_prompt', settings));
  }

  if (
    settings?.stop_words_enabled &&
    hasValue(settings.stop_words_prompt)
  ) {
    parts.push(buildPrompt('stop_words_prompt', settings));
  }

  parts.push(buildPrompt(key, settings));

  return parts.join('\n\n');
};