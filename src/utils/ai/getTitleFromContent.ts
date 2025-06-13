import { generateText } from './services';
import { prompts } from './prompts';
import { __ } from '@wordpress/i18n';
import {getTransformedPrompt} from "@/utils/ai/getTransformedPrompt";

export const getTitleFromContent = async (content: string, oldTitle?: string, customPrompt?: string, settings?: any) => {
  if (!content) {
    throw new Error(__('Please add some content first.', 'filter-ai'));
  }

  const promptDifference = oldTitle ? `${prompts.common.different} "${oldTitle}".` : '';

  const prompt = customPrompt || prompts.post_title_prompt;

  const finalPrompt = getTransformedPrompt(`${prompts.common.prefix} ${promptDifference} ${prompt} ${content}`, settings, 'brand_voice_enabled', 'brand_voice_prompt');

  console.log(finalPrompt);

  return generateText({
    feature: 'filter-ai-post-title',
    prompt: finalPrompt,
  });
};
