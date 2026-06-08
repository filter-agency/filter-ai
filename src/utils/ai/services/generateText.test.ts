import { generateText } from './generateText';
import * as nativeClient from './nativeClient';

jest.mock('./nativeClient');

describe('generateText (native mode)', () => {
  beforeEach(() => {
    window.filter_ai_ai = { mode: 'native', restUrl: '/wp-json/', nonce: 'x' };
    (nativeClient.nativeGenerateText as jest.Mock).mockResolvedValue('hello world');
  });

  it('routes to the native REST client and returns its text', async () => {
    const result = await generateText({
      prompt: 'p',
      feature: 'filter-ai-seo-title',
      capabilities: ['text_generation'],
    });
    expect(nativeClient.nativeGenerateText).toHaveBeenCalledWith(
      expect.objectContaining({ prompt: 'p', feature: 'filter-ai-seo-title' })
    );
    expect(result).toBe('hello world');
  });
});
