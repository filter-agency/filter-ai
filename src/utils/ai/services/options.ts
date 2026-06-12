import { AIService } from './types';

export const serviceMatchesCapabilities = (service: AIService, capabilities: string[] = []) => {
  if (!capabilities.length) {
    return true;
  }

  const supported = service.capabilities || [];
  return capabilities.every((capability) => supported.includes(capability));
};
export const filterServicesByCapabilities = (
  services: Record<string, AIService>,
  capabilities: string[] = []
): Record<string, AIService> =>
  Object.values(services)
    .filter((service) => service.is_available && serviceMatchesCapabilities(service, capabilities))
    .reduce((acc, service) => ({ ...acc, [service.slug]: service }), {});

export const getServiceDisplayName = (services: Record<string, AIService>, serviceSlug?: string) => {
  if (!serviceSlug) {
    return '';
  }

  return services[serviceSlug]?.metadata.name || serviceSlug;
};
