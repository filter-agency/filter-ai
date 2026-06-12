import { filterServicesByCapabilities, getServiceDisplayName } from './options';
import { AIService } from './types';

const services: Record<string, AIService> = {
  anthropic: {
    slug: 'anthropic',
    provider_slug: 'anthropic',
    model_slug: '',
    is_available: true,
    capabilities: ['text_generation', 'multimodal_input'],
    metadata: { name: 'Anthropic - Auto' },
  },
  'anthropic::claude-opus-4': {
    slug: 'anthropic::claude-opus-4',
    provider_slug: 'anthropic',
    model_slug: 'claude-opus-4',
    is_available: true,
    capabilities: ['text_generation', 'multimodal_input'],
    metadata: { name: 'Anthropic - Opus' },
  },
  'openai::gpt-image-1': {
    slug: 'openai::gpt-image-1',
    provider_slug: 'openai',
    model_slug: 'gpt-image-1',
    is_available: true,
    capabilities: ['image_generation'],
    metadata: { name: 'OpenAI - GPT Image' },
  },
};

describe('provider/model service options', () => {
  it('filters flattened options by feature capabilities', () => {
    expect(Object.keys(filterServicesByCapabilities(services, ['text_generation']))).toEqual([
      'anthropic',
      'anthropic::claude-opus-4',
    ]);

    expect(Object.keys(filterServicesByCapabilities(services, ['image_generation']))).toEqual(['openai::gpt-image-1']);
  });

  it('falls back to the raw saved value when a selected model is not in the catalog', () => {
    expect(getServiceDisplayName(services, 'anthropic::retired-model')).toBe('anthropic::retired-model');
  });
});
