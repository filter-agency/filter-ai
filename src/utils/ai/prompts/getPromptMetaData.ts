import { sections, Prompt, Toggle } from '@/settings/sections';

type PromptMeta = {
  prompt: Prompt;
  toggle: Toggle;
};

export const getPromptMetadata = (
  key: string
): PromptMeta | undefined => {
  for (const section of sections) {
    for (const feature of section.features) {
      if (feature.prompt.key === key) {
        return {
          prompt: feature.prompt,
          toggle: feature.toggle,
        };
      }
    }
  }
  return undefined;
};