import { getService } from './getService';
import { __ } from '@wordpress/i18n';

const { enums } = window.aiServices.ai;
const { select } = wp.data;

declare var wp: any;

export const aiCapability = enums.AiCapability.IMAGE_GENERATION;

type GenerateImageProps = {
  prompt: string;
  feature: string;
  candidateCount?: number;
  aspectRatio?: string;
  service?: string;
  model?: string;
};

export const generateImage = async ({
  prompt,
  feature,
  candidateCount,
  aspectRatio,
  service,
  model,
}: GenerateImageProps): Promise<string[]> => {
  let resolvedService;

  const capabilities = [aiCapability.IMAGE_GENERATION];

  if (service) {
    const { isServiceAvailable, getAvailableService } = select('ai-services/ai');

    const availableService = getAvailableService(service);

    if (!availableService) {
      console.log(`[AI] Service "${service}" exists but is not configured properly (API key missing or disabled).`);
      throw new Error(
        `The requested service "${service}" exists but is not configured properly. Please check API key or plugin settings.`
      );
    } else if (!isServiceAvailable(service)) {
      console.log(`[AI] Service "${service}" is configured but not available for this feature/capability.`);
      throw new Error(`The requested service "${service}" cannot be used for this feature. Check its capabilities.`);
    } else {
      resolvedService = availableService;
    }
  } else {
    // If no specific service is requested, find a default one that supports image generation
    console.log('[AI] No service requested. Attempting to find a default image generation service.');
    const { getServicesByCapability } = select('ai-services/ai');
    const imageServices = getServicesByCapability(aiCapability);

    if (imageServices.length > 0) {
      resolvedService = imageServices[0];
      console.log(`[AI] Resolved default service: ${resolvedService?.getServiceSlug?.()}`);
    }
  }

  if (!service || !prompt || !feature) {
    return [];
  }

  try {
    const slug = resolvedService.getServiceSlug();

    const resolvedModel = resolvedService.getModel({
      feature,
      capabilities: [aiCapability],
      generationConfig: {
        candidateCount,
        aspectRatio,
        ...(model ? { model } : {}),
      },
    });

    if (!resolvedModel || typeof resolvedModel.generateImage !== 'function') {
      throw new Error(__(`No valid model found for service "${resolvedService?.getServiceSlug?.()}"`, 'filter-ai'));
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
