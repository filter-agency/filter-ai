import { generateText } from './generateText';
import * as nativeClient from './nativeClient';

jest.mock('./nativeClient');

describe('generateText', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (nativeClient.nativeGenerateText as jest.Mock).mockResolvedValue('hello world');
  });

  afterEach(() => {
    delete window.filter_ai_ai;
  });

  it.each(['native', 'legacy'] as const)(
    'routes %s mode to the Filter AI REST client and returns its text',
    async (mode) => {
      window.filter_ai_ai = { mode, restUrl: '/wp-json/', nonce: 'x' };

      const result = await generateText({
        prompt: 'p',
        feature: 'filter-ai-seo-title',
        capabilities: ['text_generation'],
      });
      expect(nativeClient.nativeGenerateText).toHaveBeenCalledWith(
        expect.objectContaining({ prompt: 'p', feature: 'filter-ai-seo-title' })
      );
      expect(result).toBe('hello world');
    }
  );

  it('returns null when required generation details are missing', async () => {
    const result = await generateText({
      prompt: '',
      feature: 'filter-ai-seo-title',
    });

    expect(nativeClient.nativeGenerateText).not.toHaveBeenCalled();
    expect(result).toBeNull();
  });
});
