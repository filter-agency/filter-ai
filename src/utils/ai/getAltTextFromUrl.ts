import { getBase64Image, getMimeType, supportedMimeTypes } from '@/utils/image';
import { generateText, aiCapability } from './services';
import { __, sprintf } from '@wordpress/i18n';
import { getSettings } from '@/settings';

export const getAltTextFromUrl = async (url: string, oldAltText?: string, prompt?: string, service?: string) => {
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

  const settings = await getSettings();

  const promptDifference =
    oldAltText && settings?.common_prompt_different ? `${settings.common_prompt_different} "${oldAltText}".` : '';

  return generateText({
    feature: 'filter-ai-image-alt-text',
    prompt: `${settings?.common_prompt_prefix || ''} ${promptDifference} ${prompt}`,
    capabilities: [aiCapability.MULTIMODAL_INPUT, aiCapability.TEXT_GENERATION],
    parts: [
      {
        inlineData: {
          mimeType,
          data: base64Image,
        },
      },
    ],
    service,
  });
};
