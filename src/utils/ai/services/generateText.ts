import { waitForAIPlugin } from '@/utils/useAIPlugin';
import { select } from '@wordpress/data';
import { __ } from '@wordpress/i18n';

const getTextFromContents = async (contents: any) => {
  const aiPlugin = await waitForAIPlugin();

  return aiPlugin?.ai.helpers.getTextFromContents(contents).replaceAll('\n\n\n\n', '\n\n');
};

type Props = {
  prompt: string;
  feature: string;
  capabilities?: Array<string>;
  parts?: any;
  service?: string;
  model?: string;
};

export const generateText = async ({ prompt, feature, capabilities = [], parts = [], service }: Props) => {
  const aiPlugin = await waitForAIPlugin();

  if (!aiPlugin) {
    throw new Error(__('Error loading AI plugin', 'filter-ai'));
  }

  if (!capabilities.length) {
    capabilities = [aiPlugin.ai.enums.AiCapability.TEXT_GENERATION];
  }

  // @ts-expect-error
  const { isServiceAvailable, getAvailableService } = select(aiPlugin.ai.store);

  let resolvedService;

  if (service && isServiceAvailable(service)) {
    resolvedService = getAvailableService(service);
  } else {
    resolvedService = getAvailableService({ capabilities });
  }

  if (!resolvedService || !prompt || !feature) {
    return null;
  }

  try {
    const candidates = await resolvedService.generateText(
      {
        role: aiPlugin.ai.enums.ContentRole.USER,
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

    const text = await getTextFromContents(aiPlugin.ai.helpers.getCandidateContents(candidates));

    return text;
  } finally {
    // empty finally as the catch is handled by parent
  }
};
