import { getAltTextFromUrl } from './getAltTextFromUrl';
import * as services from './services';

jest.mock('./services');
jest.mock('@/utils/image', () => ({
  getMimeType: () => 'image/png',
  getBase64Image: async () => 'BASE64DATA',
  supportedMimeTypes: ['image/png'],
}));
jest.mock('@/settings', () => ({ getSettings: async () => ({ common_prompt_prefix: '' }) }));

describe('getAltTextFromUrl (native mode)', () => {
  beforeEach(() => {
    window.filter_ai_ai = { mode: 'native', restUrl: '/wp-json/', nonce: 'x' };
    (services.generateText as jest.Mock).mockResolvedValue('alt text');
  });

  it('routes to generateText without waiting for the legacy AI plugin', async () => {
    const result = await getAltTextFromUrl('http://example.com/cat.png', undefined, 'describe it');
    expect(services.generateText).toHaveBeenCalledWith(
      expect.objectContaining({
        feature: 'filter-ai-image-alt-text',
        capabilities: ['multimodal_input', 'text_generation'],
      })
    );
    expect(result).toBe('alt text');
  });
});
