import { getService } from './getService';
import { getTextFromContents } from './getTextFromContents';
import { prompts } from './prompts';

const { enums, helpers } = window.aiServices.ai;

const capabilities = [enums.AiCapability.TEXT_GENERATION];

export const getExcerptFromContent = async (content: string, customPrompt?: string) => {
  const service = await getService(capabilities);

  if (!service || !content) {
    return null;
  }

  try {
    const prompt = customPrompt || prompts.post.excerpt;

    const candidates = await service.generateText(
      {
        role: enums.ContentRole.USER,
        parts: [
          {
            text: `${prompt} ${content}`,
          },
        ],
      },
      {
        feature: 'filter-ai-post-excerpt',
        capabilities,
      }
    );

    return getTextFromContents(helpers.getCandidateContents(candidates));
  } finally {
    // empty finally as the catch is handled by parent
  }
};
