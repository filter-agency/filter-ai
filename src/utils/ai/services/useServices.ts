import { useAIPlugin } from '@/utils/useAIPlugin';
import { AIService } from './types';
import { useSelect } from '@wordpress/data';
import { useState, useEffect } from '@wordpress/element';
import { getMode } from './mode';
import { nativeListProviderModels } from './nativeClient';

type UseServices = () => Record<string, AIService>;

export const useServices: UseServices = () => {
  const aiPlugin = useAIPlugin();
  const [providerModelServices, setProviderModelServices] = useState<Record<string, AIService>>({});

  useEffect(() => {
    nativeListProviderModels()
      .then((services) => setProviderModelServices(services as Record<string, AIService>))
      .catch(() => setProviderModelServices({}));
  }, []);

  const legacyServices = useSelect(
    (select) => {
      if (getMode() === 'native') return {};
      // @ts-expect-error Type 'never' has no call signatures.
      const { getServices } = select(aiPlugin?.ai.store) || {};
      return (getServices?.() || {}) as Record<string, AIService>;
    },
    [aiPlugin]
  );

  if (Object.keys(providerModelServices).length) {
    return providerModelServices;
  }

  return getMode() === 'native' ? {} : legacyServices;
};
