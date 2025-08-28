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

  const aiStore = wp.data.select('ai-services/ai');
  await wp.data.resolveSelect('ai-services/ai').getServices();

  const allServices = aiStore.getServices?.() || {};
  console.log(
    '[AI] All available services:',
    Object.values(allServices).map((s: any) => s?.getServiceSlug?.())
  );

  if (service) {
    console.log(`[AI] Requested service: ${service}`);
    const { isServiceAvailable, getAvailableService } = select('ai-services/ai');

    const availableService = getAvailableService(service);

    if (!availableService) {
      // Service exists but not configured (API key missing, disabled, etc.)
      console.log(`[AI] Service "${service}" exists but is not configured properly (API key missing or disabled).`);
      throw new Error(
        `The requested service "${service}" exists but is not configured properly. Please check API key or plugin settings.`
      );
    } else if (!isServiceAvailable(service)) {
      // Service is configured but cannot handle this capability
      console.log(`[AI] Service "${service}" is configured but not available for this feature/capability.`);
      throw new Error(`The requested service "${service}" cannot be used for this feature. Check its capabilities.`);
    } else {
      // Service is available and usable
      resolvedService = availableService;
      console.log(`[AI] Resolved requested service: ${resolvedService?.getServiceSlug?.()}`);
    }
  }

  if (!resolvedService || !prompt || !feature) {
    console.log('[AI] No service resolved or missing prompt/feature.');
    return null;
  }

  try {
    const slug = resolvedService.getServiceSlug();
    console.log(`[AI] Final choice: ${slug}${model ? ` with model: ${model}` : ''}`);

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
