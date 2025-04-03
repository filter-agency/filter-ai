import { getBase64Image, getMimeType, supportedMimeTypes } from '../image';
import { t } from '../translate';
import { getService } from './getService';
import { getTextFromContents } from './getTextFromContents';
import { prompts } from './prompts';

const { enums, helpers } = window.aiServices.ai;

const capabilities = [enums.AiCapability.MULTIMODAL_INPUT, enums.AiCapability.TEXT_GENERATION];

export const getAltTextFromUrl = async (url: string, customPrompt?: string) => {
  const service = await getService(capabilities);

  if (!service || !url) {
    return null;
  }

  try {
    const mimeType = getMimeType(url);

    if (!mimeType) {
      throw new Error(
        t(
          `Sorry, that image type is not supported. Please use one of the following types: ${supportedMimeTypes.join(', ')}.`
        )
      );
    }

    const base64Image = await getBase64Image(url);

    let prompt = customPrompt || prompts.image.altText;

    const candidates = await service.generateText(
      {
        role: enums.ContentRole.USER,
        parts: [
          {
            text: prompt,
          },
          {
            inlineData: {
              mimeType,
              data: base64Image,
            },
          },
        ],
      },
      {
        feature: 'filter-ai-alt-text',
        capabilities,
      }
    );

    return getTextFromContents(helpers.getCandidateContents(candidates));
  } finally {
    // empty finally as the catch is handled by parent
  }
};
