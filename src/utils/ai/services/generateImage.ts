import { waitForAIPlugin } from '@/utils/useAIPlugin';
import { select } from '@wordpress/data';
import { __, sprintf } from '@wordpress/i18n';

type GenerateImageProps = {
  prompt: string;
  feature: string;
  candidateCount?: number;
  aspectRatio?: string;
  service?: string;
};

export const generateImage = async ({
  prompt,
  feature,
  candidateCount,
  aspectRatio,
  service,
}: GenerateImageProps): Promise<string[]> => {
  const aiPlugin = await waitForAIPlugin();

  if (!aiPlugin) {
    throw new Error(__('Error loading AI plugin', 'filter-ai'));
  }

  const capabilities = [aiPlugin.ai.enums.AiCapability.IMAGE_GENERATION];

  // @ts-expect-error
  const { isServiceAvailable, getAvailableService } = select(aiPlugin.ai.store);

  let resolvedService;

  if (service && isServiceAvailable(service)) {
    resolvedService = getAvailableService({ slugs: [service], capabilities });
  } else {
    resolvedService = getAvailableService({ capabilities });
  }

  if (!resolvedService || !prompt || !feature) {
    return [];
  }

  try {
    const metadata = resolvedService.getServiceMetadata();

    const resolvedModel = resolvedService.getModel({
      feature,
      capabilities,
      generationConfig: {
        candidateCount,
        aspectRatio,
      },
    });

    if (!resolvedModel || typeof resolvedModel.generateImage !== 'function') {
      throw new Error(sprintf(__('No valid model found for service %s', 'filter-ai'), metadata.name));
    }

    const candidates = await resolvedModel.generateImage(prompt);

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
