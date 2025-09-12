import { __, sprintf } from '@wordpress/i18n';

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
};

export const generateImage = async ({
  prompt,
  feature,
  candidateCount,
  aspectRatio,
  service,
}: GenerateImageProps): Promise<string[]> => {
  let resolvedService;

  if (service) {
    const { isServiceAvailable, getAvailableService } = select(window.aiServices.ai.store);

    const availableService = getAvailableService(service);

    if (!availableService) {
      console.error(`[AI] Service "${service}" exists but is not configured properly (API key missing or disabled).`);
      throw new Error(
        sprintf(
          __(
            'The requested service "%s" exists but is not configured properly. Please check API key or plugin settings.',
            'filter-ai'
          ),
          service
        )
      );
    } else if (!isServiceAvailable(service)) {
      console.error(`[AI] Service "${service}" is configured but not available for this feature/capability.`);
      throw new Error(
        sprintf(
          __('The requested service "%s" cannot be used for this feature. Check its capabilities.', 'filter-ai'),
          service
        )
      );
    } else {
      resolvedService = availableService;
    }
  } else {
    // If no specific service is requested, find a default one that supports image generation
    console.error('[AI] No service requested. Attempting to find a default image generation service.');
    const { getServicesByCapability } = select(window.aiServices.ai.store);
    const imageServices = getServicesByCapability(aiCapability);

    if (imageServices.length > 0) {
      resolvedService = imageServices[0];
      console.error(`[AI] Resolved default service: ${resolvedService?.getServiceSlug?.()}`);
    }
  }

  if (!service || !prompt || !feature) {
    return [];
  }

  try {
    const metadata = resolvedService.getServiceMetadata();

    const resolvedModel = resolvedService.getModel({
      feature,
      capabilities: [aiCapability],
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
