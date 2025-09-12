import { useSettings } from '@/settings';
import { AIService } from './types';
import { useSelect } from '@wordpress/data';

type UseService = (key: string) => AIService | undefined;

export const useService: UseService = (key) => {
  const { settings } = useSettings();

  const serviceSlug = settings?.[key];

  const service = useSelect((select) => {
    const { getServices } = select('ai-services/ai') || {};

    // @ts-expect-error Type 'never' has no call signatures.
    const aiServices: Record<string, AIService> = getServices?.() || {};

    const _service = Object.values(aiServices).find((s) => s.slug === serviceSlug && s.is_available);

    return _service;
  }, []);

  return service;
};
