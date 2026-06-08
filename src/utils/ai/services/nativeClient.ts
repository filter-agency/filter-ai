import apiFetch from '@wordpress/api-fetch';

type GenerateTextArgs = {
  prompt: string;
  feature: string;
  capabilities: string[];
  parts: unknown[];
  service?: string;
};

export const nativeGenerateText = async (args: GenerateTextArgs): Promise<string> => {
  const res = await apiFetch<{ text: string }>({
    path: '/filter-ai/v1/generate-text',
    method: 'POST',
    data: {
      prompt: args.prompt,
      feature: args.feature,
      capabilities: args.capabilities,
      parts: args.parts,
      provider: args.service ?? '',
    },
  });
  return res.text;
};

export const nativeGenerateImage = async (args: {
  prompt: string;
  feature: string;
  candidateCount?: number;
  aspectRatio?: string;
  service?: string;
}): Promise<string[]> => {
  const res = await apiFetch<{ images: string[] }>({
    path: '/filter-ai/v1/generate-image',
    method: 'POST',
    data: {
      prompt: args.prompt,
      feature: args.feature,
      candidateCount: args.candidateCount ?? 1,
      aspectRatio: args.aspectRatio ?? '',
      provider: args.service ?? '',
    },
  });
  return res.images;
};

export const nativeListProviders = async (): Promise<
  Record<string, { label: string; capabilities: string[]; is_available: boolean }>
> => apiFetch({ path: '/filter-ai/v1/providers' });

type StreamTextArgs = {
  prompt: string;
  keywords: string[];
  length?: string;
  feature: string;
  capabilities?: string[];
  parts?: unknown[];
  service?: string;
};

/**
 * Call POST /filter-ai/v1/stream-generate-text and feed each text delta to
 * `onChunk` as it arrives. Returns the accumulated full text once the server
 * sends the `done` sentinel. Uses raw fetch (not apiFetch) because apiFetch
 * unconditionally parses the response body as JSON — incompatible with an SSE
 * stream that needs incremental ReadableStream reads.
 *
 * Server frames are `data: {…json…}\n\n`. JSON payload may contain:
 *  - { delta: string }   — append text fragment
 *  - { done: true }      — end of stream
 *  - { error: string }   — server-side failure; thrown as Error
 *
 * On WP 7.0 native (which can't stream upstream yet) the server sends one
 * big delta frame followed by done. The consumer doesn't care.
 */
export const streamGenerateText = async (
  args: StreamTextArgs,
  onChunk: (delta: string, accumulated: string) => void
): Promise<string> => {
  const config = window.filter_ai_ai;
  if (!config?.restUrl || !config?.nonce) {
    throw new Error('Filter AI REST configuration is unavailable');
  }

  // window.filter_ai_ai.restUrl is rest_url( 'filter-ai/v1' ) — i.e. it already
  // includes the namespace. Just append the route path.
  const url = config.restUrl.replace(/\/$/, '') + '/stream-generate-text';

  const response = await fetch(url, {
    method: 'POST',
    credentials: 'same-origin',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'text/event-stream',
      'X-WP-Nonce': config.nonce,
    },
    body: JSON.stringify({
      prompt: args.prompt,
      keywords: args.keywords,
      length: args.length ?? '',
      feature: args.feature,
      capabilities: args.capabilities ?? ['text_generation'],
      parts: args.parts ?? [],
      provider: args.service ?? '',
    }),
  });

  if (!response.ok || !response.body) {
    const text = await response.text().catch(() => '');
    throw new Error(text || `Streaming request failed (HTTP ${response.status})`);
  }

  const decoder = response.body.pipeThrough(new TextDecoderStream());
  const reader = decoder.getReader();
  let buffer = '';
  let accumulated = '';

  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += value;

      // Frame separator is \n\n. SSE servers may split frames across packets,
      // so we drain only fully-formed frames and leave any partial trailer in
      // the buffer for the next iteration.
      let separatorIndex = buffer.indexOf('\n\n');
      while (separatorIndex !== -1) {
        const rawFrame = buffer.slice(0, separatorIndex);
        buffer = buffer.slice(separatorIndex + 2);
        separatorIndex = buffer.indexOf('\n\n');

        // Each frame may contain multiple `field: value` lines; we only care
        // about `data:` lines per the SSE spec.
        const dataLines = rawFrame
          .split('\n')
          .filter((line) => line.startsWith('data:'))
          .map((line) => line.slice(5).trimStart());
        if (!dataLines.length) continue;
        const payloadStr = dataLines.join('\n');

        let payload: { delta?: string; done?: boolean; error?: string };
        try {
          payload = JSON.parse(payloadStr);
        } catch {
          // Malformed frame — skip rather than abort the stream.
          continue;
        }

        if (payload.error) {
          throw new Error(payload.error);
        }
        if (typeof payload.delta === 'string' && payload.delta.length > 0) {
          accumulated += payload.delta;
          onChunk(payload.delta, accumulated);
        }
        if (payload.done) {
          return accumulated;
        }
      }
    }
  } finally {
    reader.releaseLock();
  }

  return accumulated;
};

export const nativeIsSupported = async (capability: 'text' | 'image'): Promise<boolean> => {
  const res = await apiFetch<{ supported: boolean }>({
    path: `/filter-ai/v1/is-supported?capability=${capability}`,
  });
  return res.supported;
};
