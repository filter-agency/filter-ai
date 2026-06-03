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

export const nativeIsSupported = async (capability: 'text' | 'image'): Promise<boolean> => {
  const res = await apiFetch<{ supported: boolean }>({
    path: `/filter-ai/v1/is-supported?capability=${capability}`,
  });
  return res.supported;
};
