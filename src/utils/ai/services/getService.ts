import { waitForAIPlugin } from '@/utils/useAIPlugin';
import { resolveSelect } from '@wordpress/data';

export const getService = async (capabilities: string[] = []) => {
  const aiPlugin = await waitForAIPlugin();

  if (!aiPlugin) {
    return null;
  }

  const aiService = await resolveSelect(aiPlugin.ai);

  await aiService.getServices();

  return aiService.getAvailableService({
    capabilities,
  });
};
