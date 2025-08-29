import { getService } from './getService';

const { enums, helpers } = window.aiServices.ai;
const { select } = wp.data;

declare var wp: any;

export const aiCapability = enums.AiCapability;

const getTextFromContents = (contents: any) => {
  return helpers.getTextFromContents(contents).replaceAll('\n\n\n\n', '\n\n');
};

type Props = {
  prompt: string;
  feature: string;
  capabilities?: Array<typeof aiCapability>;
  parts?: any;
  service?: string;
  model?: string;
};

export const generateText = async ({
  prompt,
  feature,
  capabilities = [aiCapability.TEXT_GENERATION],
  parts = [],
  service,
  model,
}: Props) => {
  let resolvedService;

  await wp.data.resolveSelect('ai-services/ai').getServices();

  if (service) {
    const { isServiceAvailable, getAvailableService } = select('ai-services/ai');

    const availableService = getAvailableService(service);

    if (!availableService) {
      // Service exists but not configured (API key missing, disabled, etc.)
      throw new Error(
        `The requested service "${service}" exists but is not configured properly. Please check API key or plugin settings.`
      );
    } else if (!isServiceAvailable(service)) {
      // Service is configured but cannot handle this capability
      throw new Error(`The requested service "${service}" cannot be used for this feature. Check its capabilities.`);
    } else {
      // Service is available and usable
      resolvedService = availableService;
    }
  }

  if (!resolvedService || !prompt || !feature) {
    return null;
  }

  try {
    const slug = resolvedService.getServiceSlug();

    const candidates = await resolvedService.generateText(
      {
        role: enums.ContentRole.USER,
        parts: [
          {
            text: prompt,
          },
          ...parts,
        ],
      },
      {
        feature,
        capabilities,
        //         ...(model ? { model } : {}),
      }
    );

    return getTextFromContents(helpers.getCandidateContents(candidates));
  } finally {
    // empty finally as the catch is handled by parent
  }
};
