import { getBase64Image, getMimeType, supportedMimeTypes } from '@/utils/image';
import { generateText, aiCapability } from './services';
import { prompts } from './prompts';
import { __, sprintf } from '@wordpress/i18n';

export const getAltTextFromUrl = async (url: string, oldAltText?: string, customPrompt?: string) => {
  if (!url) {
    throw new Error(__('Please select an image.', 'filter-ai'));
  }

  const mimeType = getMimeType(url);

  if (!mimeType) {
    throw new Error(
      sprintf(
        __('Sorry, that image type is not supported. Please use one of the following types: %s.', 'filter-ai'),
        supportedMimeTypes.join(', ')
      )
    );
  }

  const base64Image = await getBase64Image(url);

  const promptDifference = oldAltText ? `${prompts.common.different} "${oldAltText}".` : '';

  const prompt = customPrompt || prompts.image_alt_text_prompt;

  return generateText({
    feature: 'filter-ai-image-alt-text',
    prompt: `${prompts.common.prefix} ${promptDifference} ${prompt}`,
    capabilities: [aiCapability.MULTIMODAL_INPUT, aiCapability.TEXT_GENERATION],
    parts: [
      {
        inlineData: {
          mimeType,
          data: base64Image,
        },
      },
    ],
  });
};
