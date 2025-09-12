import { AIService } from './types';
import { useSelect } from '@wordpress/data';

type UseServices = () => Record<string, AIService>;

export const useServices: UseServices = () => {
  const services = useSelect((select) => {
    // @ts-expect-error Type 'never' has no call signatures.
    const { getServices } = select(window.aiServices.ai.store) || {};

    const aiServices: Record<string, AIService> = getServices?.() || {};

    return aiServices;
  }, []);

  return services;
};
