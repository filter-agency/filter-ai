const { store } = window.aiServices.ai;

export const getService = async (capabilities: string[] = []) => {
  const services = window.wp.data.select(store).getServices();

  if (!services) {
    const newServices = await window.wp.apiFetch({
      path: '/ai-services/v1/services',
    });

    if (!newServices) {
      return;
    }

    window.wp.data.dispatch(store).receiveServices(newServices);
  }

  return window.wp.data.select(store).getAvailableService({
    capabilities,
  });
};
