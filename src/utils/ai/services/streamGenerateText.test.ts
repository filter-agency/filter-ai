/**
 * Unit tests for the SSE consumer inside nativeClient.streamGenerateText.
 *
 * Covers the most common SSE bugs: frames split across packets, frames
 * containing multiple `data:` lines, malformed JSON skipped without
 * crashing the stream, and the done sentinel terminating the consumer.
 *
 * jsdom doesn't ship TextEncoder / ReadableStream / TextDecoderStream, so we
 * pull them in from Node's built-ins before importing the module under test.
 */
import { TextEncoder, TextDecoder } from 'util';
import { ReadableStream, TextDecoderStream } from 'stream/web';

// Node's stream/web types disagree subtly with the DOM types on
// ReadableStream / TextDecoderStream (e.g. Symbol.toStringTag, the `from`
// static). The runtime behaviour we exercise here is identical; cast through
// `any` so we don't have to mirror the DOM lib in the test harness.
(global as { TextEncoder?: typeof TextEncoder }).TextEncoder = TextEncoder;
(global as { TextDecoder?: typeof TextDecoder }).TextDecoder = TextDecoder;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
(global as any).ReadableStream = ReadableStream;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
(global as any).TextDecoderStream = TextDecoderStream;

import { streamGenerateText } from './nativeClient';

// Minimal ReadableStream of chunks for tests; pushes each chunk in order.
const stringStream = (chunks: string[]): ReadableStream<Uint8Array> => {
  const encoder = new TextEncoder();
  let i = 0;
  return new ReadableStream<Uint8Array>({
    pull(controller) {
      if (i >= chunks.length) {
        controller.close();
        return;
      }
      controller.enqueue(encoder.encode(chunks[i]));
      i += 1;
    },
  });
};

const mockResponse = (chunks: string[]): Response => {
  // Reuse the Web Streams shim; jsdom doesn't provide a Response constructor
  // that accepts a ReadableStream body in every version, so we construct an
  // object literal duck-typed to what the consumer actually reads.
  return {
    ok: true,
    status: 200,
    body: stringStream(chunks),
    text: async () => '',
  } as unknown as Response;
};

describe('streamGenerateText SSE parser', () => {
  beforeEach(() => {
    window.filter_ai_ai = { mode: 'legacy', restUrl: '/wp-json/filter-ai/v1', nonce: 'nonce' };
    global.fetch = jest.fn();
  });

  it('accumulates deltas across multiple frames and returns the full text on done', async () => {
    (global.fetch as jest.Mock).mockResolvedValue(
      mockResponse(['data: {"delta":"Hello"}\n\n', 'data: {"delta":" world"}\n\n', 'data: {"done":true}\n\n'])
    );

    const chunks: string[] = [];
    const result = await streamGenerateText({ prompt: 'p', keywords: [], feature: 'f' }, (delta) => {
      chunks.push(delta);
    });

    expect(chunks).toEqual(['Hello', ' world']);
    expect(result).toBe('Hello world');
  });

  it('handles a frame split across two network packets', async () => {
    (global.fetch as jest.Mock).mockResolvedValue(
      // Frame boundary intentionally falls inside the JSON payload.
      mockResponse(['data: {"delta":"Hel', 'lo"}\n\ndata: {"done":true}\n\n'])
    );

    const chunks: string[] = [];
    const result = await streamGenerateText({ prompt: 'p', keywords: [], feature: 'f' }, (delta) => {
      chunks.push(delta);
    });

    expect(chunks).toEqual(['Hello']);
    expect(result).toBe('Hello');
  });

  it('skips malformed JSON without aborting the stream', async () => {
    (global.fetch as jest.Mock).mockResolvedValue(
      mockResponse(['data: not json\n\n', 'data: {"delta":"survived"}\n\n', 'data: {"done":true}\n\n'])
    );

    const chunks: string[] = [];
    const result = await streamGenerateText({ prompt: 'p', keywords: [], feature: 'f' }, (delta) => {
      chunks.push(delta);
    });

    expect(chunks).toEqual(['survived']);
    expect(result).toBe('survived');
  });

  it('throws on a server-emitted error frame', async () => {
    (global.fetch as jest.Mock).mockResolvedValue(mockResponse(['data: {"error":"boom"}\n\n']));

    await expect(streamGenerateText({ prompt: 'p', keywords: [], feature: 'f' }, () => {})).rejects.toThrow('boom');
  });

  it('sends prompt, keywords, length, and provider in the request body', async () => {
    (global.fetch as jest.Mock).mockResolvedValue(mockResponse(['data: {"done":true}\n\n']));

    await streamGenerateText(
      {
        prompt: 'topic',
        keywords: ['alpha', 'beta'],
        length: '80 words',
        feature: 'filter-ai-generate-content',
        service: 'openai',
      },
      () => {}
    );

    const [, init] = (global.fetch as jest.Mock).mock.calls[0];
    const body = JSON.parse(init.body);
    expect(body.prompt).toBe('topic');
    expect(body.keywords).toEqual(['alpha', 'beta']);
    expect(body.length).toBe('80 words');
    expect(body.provider).toBe('openai');
    expect(init.headers['X-WP-Nonce']).toBe('nonce');
  });
});
