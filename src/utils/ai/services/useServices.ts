import { useAIPlugin } from '@/utils/useAIPlugin';
import { AIService } from './types';
import { useSelect } from '@wordpress/data';
import { useState, useEffect } from '@wordpress/element';
import { getMode } from './mode';
import { nativeListProviders } from './nativeClient';

type UseServices = () => Record<string, AIService>;

export const useServices: UseServices = () => {
  const aiPlugin = useAIPlugin();
  const [nativeServices, setNativeServices] = useState<Record<string, AIService>>({});

  useEffect(() => {
    if (getMode() === 'native') {
      nativeListProviders()
        .then((providers) => {
          const mapped: Record<string, AIService> = {};
          Object.entries(providers).forEach(([slug, p]) => {
            mapped[slug] = { slug, metadata: { name: p.label }, is_available: p.is_available } as AIService;
          });
          setNativeServices(mapped);
        })
        .catch(() => setNativeServices({}));
    }
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

  return getMode() === 'native' ? nativeServices : legacyServices;
};
