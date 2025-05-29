const { store } = window.aiServices.ai;

export const getService = async (capabilities: string[] = []) => {
  const aiService = await window.wp?.data.resolveSelect(store);

  await aiService.getServices();

  return aiService.getAvailableService({
    capabilities,
  });
};
