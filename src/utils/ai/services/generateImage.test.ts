import { generateImage } from './generateImage';
import * as nativeClient from './nativeClient';

jest.mock('./nativeClient');

describe('generateImage (native mode)', () => {
  beforeEach(() => {
    window.filter_ai_ai = { mode: 'native', restUrl: '/wp-json/', nonce: 'x' };
    (nativeClient.nativeGenerateImage as jest.Mock).mockResolvedValue(['data:image/png;base64,AAA']);
  });

  it('routes to the native REST client and returns image URLs', async () => {
    const result = await generateImage({ prompt: 'cat', feature: 'generate-ai-img-feature' });
    expect(nativeClient.nativeGenerateImage).toHaveBeenCalledWith(
      expect.objectContaining({ prompt: 'cat', feature: 'generate-ai-img-feature' })
    );
    expect(result).toEqual(['data:image/png;base64,AAA']);
  });
});
