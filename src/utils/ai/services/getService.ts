import { waitForAIPlugin } from '@/utils/useAIPlugin';
import { resolveSelect } from '@wordpress/data';

type AIServiceSelector = {
  getAvailableService: (options: { capabilities: string[] }) => unknown;
  getServices: () => Promise<unknown>;
};

export const getService = async (capabilities: string[] = []) => {
  const aiPlugin = await waitForAIPlugin();

  if (!aiPlugin) {
    return null;
  }

  const aiService = (await resolveSelect(aiPlugin.ai)) as AIServiceSelector;

  await aiService.getServices();

  return aiService.getAvailableService({
    capabilities,
  });
};
