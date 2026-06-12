import { useSettings } from '@/settings';
import { AIService } from './types';
import { useServices } from './useServices';

type UseService = (key: string) => AIService | undefined;

export const useService: UseService = (key) => {
  const { settings } = useSettings();
  const services = useServices();
  const serviceSlug = settings?.[key];
  const service = Object.values(services).find((s) => s.slug === serviceSlug && s.is_available);

  if (service) {
    return service;
  }

  if (typeof serviceSlug === 'string' && serviceSlug.length > 0) {
    return {
      slug: serviceSlug,
      is_available: true,
      metadata: {
        name: serviceSlug,
      },
    };
  }

  return undefined;
};
