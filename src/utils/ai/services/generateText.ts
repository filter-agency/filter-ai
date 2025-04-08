import { getService } from './getService';

const { enums, helpers } = window.aiServices.ai;

export const aiCapability = enums.AiCapability;

const getTextFromContents = (contents: any) => {
  return helpers.getTextFromContents(contents).replaceAll('\n\n\n\n', '\n\n');
};

type Props = {
  prompt: string;
  feature: string;
  capabilities?: Array<typeof aiCapability>;
  parts?: any;
};

export const generateText = async ({
  prompt,
  feature,
  capabilities = [aiCapability.TEXT_GENERATION],
  parts = [],
}: Props) => {
  const service = await getService(capabilities);

  if (!service || !prompt || !feature) {
    return null;
  }

  try {
    const candidates = await service.generateText(
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
