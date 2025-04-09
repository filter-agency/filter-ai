import { getBase64Image, getMimeType, supportedMimeTypes } from '@/utils/image';
import { t } from '@/utils/translate';
import { generateText, aiCapability } from './services';
import { prompts } from './prompts';

export const getAltTextFromUrl = async (url: string, oldAltText?: string, customPrompt?: string) => {
  if (!url) {
    throw new Error(t('Please select an image.'));
  }

  const mimeType = getMimeType(url);

  if (!mimeType) {
    throw new Error(
      t(
        `Sorry, that image type is not supported. Please use one of the following types: ${supportedMimeTypes.join(', ')}.`
      )
    );
  }

  const base64Image = await getBase64Image(url);

  const prePrompt = oldAltText ? `${t(prompts.common.different)} "${oldAltText}".` : '';

  const prompt = customPrompt || prompts.image.altText;

  return generateText({
    feature: 'filter-ai-image-alt-text',
    prompt: `${prePrompt} ${t(prompt)}`,
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
