// utils/buildPrompt.ts
import {prompts} from "@/utils/ai/prompts/index";
import {getPromptMetadata} from "@/utils/ai/prompts/getPromptMetaData";

export const buildPrompt = (
  key: keyof typeof prompts,
  settings: Partial<Record<string, string | boolean>>
): string => {
  const promptMeta = getPromptMetadata(key);
  if (!promptMeta) return prompts[key] as string;

  const { prompt, toggle } = promptMeta;
  const defaultPrompt = prompts[key] as string;
  const placeholderExists = !!prompt.placeholder;
  const toggleEnabled = Boolean(settings?.[toggle.key]);
  const userPrompt = settings?.[key]?.toString().trim();

  if (userPrompt) {
    if (placeholderExists) {
      if (toggleEnabled) {
        return `\n${defaultPrompt}${userPrompt}\n`;
      } else {
        return defaultPrompt;
      }
    } else {
      return userPrompt;
    }
  }

  return defaultPrompt;
};
