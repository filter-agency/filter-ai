const { store } = window.aiServices.ai;

window.wp.data.select(store).getServices();

export const getService = async (capabilities: string[] = []) => {
  return window.wp.data.select(store).getAvailableService({
    capabilities,
  });
};
