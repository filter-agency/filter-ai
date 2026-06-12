import { isFeatureProviderSupported } from './featureAvailability';
import { AIService } from '@/utils/ai/services/types';

const services: Record<string, AIService> = {
  anthropic: {
    slug: 'anthropic',
    provider_slug: 'anthropic',
    model_slug: '',
    is_available: true,
    capabilities: ['text_generation'],
    metadata: { name: 'Anthropic - Auto' },
  },
};

describe('isFeatureProviderSupported', () => {
  it('marks a service-backed feature unsupported when no provider/model has the required capability', () => {
    expect(isFeatureProviderSupported(services, true, ['image_generation'])).toBe(false);
  });

  it('keeps the feature available while provider/model services have not loaded yet', () => {
    expect(isFeatureProviderSupported({}, true, ['image_generation'])).toBe(true);
  });

  it('does not require provider/model support for features without service selectors', () => {
    expect(isFeatureProviderSupported(services, false, ['image_generation'])).toBe(true);
  });
});
