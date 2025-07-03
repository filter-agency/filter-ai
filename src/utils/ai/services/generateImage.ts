import { getService } from './getService';

const { enums } = window.aiServices.ai;

export const aiCapability = enums.AiCapability;

type GenerateImageProps = {
  prompt: string;
  feature: string;
  candidateCount?: number;
  aspectRatio?: string;
};

export const generateImage = async ({
  prompt,
  feature,
  candidateCount,
  aspectRatio,
}: GenerateImageProps): Promise<string[]> => {
  const capabilities = [aiCapability.IMAGE_GENERATION];
  const service = await getService(capabilities);

  if (!service || !prompt || !feature) {
    return [];
  }

  try {
    const model = service.getModel({
      feature,
      capabilities,
      generationConfig: {
        candidateCount,
        aspectRatio,
      },
    });

    const candidates = await model.generateImage(prompt);

    const imageUrls: string[] = [];

    for (const candidate of candidates) {
      for (const part of candidate.content.parts) {
        if (part.inlineData) {
          imageUrls.push(part.inlineData.data);
          break;
        }
        if (part.fileData) {
          imageUrls.push(part.fileData.fileUri);
          break;
        }
      }
    }

    return imageUrls;
  } catch (error) {
    console.error('Image generation failed:', error);
    throw error;
  }
};
