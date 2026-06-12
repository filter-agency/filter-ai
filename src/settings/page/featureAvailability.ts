import { filterServicesByCapabilities } from '@/utils/ai/services/options';
import { AIService } from '@/utils/ai/services/types';

export const isFeatureProviderSupported = (
  services: Record<string, AIService>,
  hasServiceSelector: boolean,
  requiredCapabilities: string[] = []
) => {
  if (!hasServiceSelector || !requiredCapabilities.length) {
    return true;
  }

  if (!Object.keys(services).length) {
    return true;
  }

  return Object.keys(filterServicesByCapabilities(services, requiredCapabilities)).length > 0;
};
