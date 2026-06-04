import {
  storeGenerationParams,
  clearGenerationParams,
  getGenerationParams,
  type GenerationParams,
} from './paramsStore';

jest.mock('@wordpress/data', () => {
  const actual = jest.requireActual('@wordpress/data');
  return actual;
});

const PARAMS: GenerationParams = {
  prompt: 'Why slow living matters',
  keywords: ['calm', 'intention'],
  length: '80 words',
  service: 'anthropic',
  blockName: 'core/paragraph',
  generatedClientIds: ['block-a', 'block-b', 'block-c'],
};

describe('paramsStore', () => {
  it('returns undefined for an unknown clientId', () => {
    expect(getGenerationParams('unknown-id')).toBeUndefined();
  });

  it('round-trips params via store and clear', () => {
    storeGenerationParams('abc-123', PARAMS);
    expect(getGenerationParams('abc-123')).toEqual(PARAMS);
    clearGenerationParams('abc-123');
    expect(getGenerationParams('abc-123')).toBeUndefined();
  });

  it('stores multiple clientIds independently', () => {
    storeGenerationParams('block-1', { ...PARAMS, prompt: 'first' });
    storeGenerationParams('block-2', { ...PARAMS, prompt: 'second' });
    expect(getGenerationParams('block-1')?.prompt).toBe('first');
    expect(getGenerationParams('block-2')?.prompt).toBe('second');
  });

  it('clearGenerationParams on unknown id is a no-op', () => {
    expect(() => clearGenerationParams('does-not-exist')).not.toThrow();
  });
});
