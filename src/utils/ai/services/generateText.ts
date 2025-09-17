import { sprintf, __ } from '@wordpress/i18n';

const { enums, helpers } = window.aiServices?.ai || {};
const { select } = wp.data;

declare var wp: any;

export const aiCapability = enums?.AiCapability;

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
}: Props) => {
  let resolvedService;

  await wp.data.resolveSelect(window.aiServices.ai.store).getServices();

  if (service) {
    const { isServiceAvailable, getAvailableService } = select(window.aiServices.ai.store);

    const availableService = getAvailableService(service);

    if (!availableService) {
      // Service exists but not configured (API key missing, disabled, etc.)
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
      // Service is configured but cannot handle this capability
      throw new Error(
        sprintf(
          __('The requested service "%s" cannot be used for this feature. Check its capabilities.', 'filter-ai'),
          service
        )
      );
    } else {
      // Service is available and usable
      resolvedService = availableService;
    }
  }

  if (!resolvedService || !prompt || !feature) {
    return null;
  }

  try {
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
      }
    );

    return getTextFromContents(helpers.getCandidateContents(candidates));
  } finally {
    // empty finally as the catch is handled by parent
  }
};
