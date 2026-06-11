import { nativeGenerateText, streamGenerateText } from './nativeClient';

type Props = {
  prompt: string;
  feature: string;
  capabilities?: Array<string>;
  parts?: any;
  service?: string;
  model?: string;
};

export const generateText = async ({ prompt, feature, capabilities = [], parts = [], service }: Props) => {
  if (!prompt || !feature) {
    return null;
  }

  const caps = capabilities.length ? capabilities : ['text_generation'];
  return nativeGenerateText({ prompt, feature, capabilities: caps, parts, service });
};

type StreamProps = {
  prompt: string;
  keywords: string[];
  length?: string;
  feature: string;
  capabilities?: string[];
  parts?: unknown[];
  service?: string;
};

/**
 * Stream text generation through our REST endpoint.
 *
 * Both backends — WP 7.0 native AI Client and the ai-services plugin — go
 * through `/filter-ai/v1/stream-generate-text` on the PHP side. The server
 * either yields chunks from a true upstream stream (ai-services) or falls
 * back to one-shot generate_text() and emits a single frame (native, until
 * WP core ships PromptBuilder streaming). The JS consumer is uniform.
 */
export const generateTextStream = async (
  { prompt, keywords, length, feature, capabilities = [], parts = [], service }: StreamProps,
  onChunk: (delta: string, accumulated: string) => void
): Promise<string> => {
  if (!prompt || !feature) {
    return '';
  }
  return streamGenerateText(
    {
      prompt,
      keywords,
      length,
      feature,
      capabilities: capabilities.length ? capabilities : ['text_generation'],
      parts,
      service,
    },
    onChunk
  );
};
