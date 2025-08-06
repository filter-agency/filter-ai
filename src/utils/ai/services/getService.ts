import { resolveSelect } from '@wordpress/data';

const { store } = window.aiServices.ai;

export const getService = async (capabilities: string[] = []) => {
  const aiService = await resolveSelect(store);

  await aiService.getServices();

  return aiService.getAvailableService({
    capabilities,
  });
};
