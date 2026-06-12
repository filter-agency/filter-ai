export type AIService = {
  slug: string;
  provider_slug?: string;
  model_slug?: string;
  label?: string;
  provider_label?: string;
  model_label?: string;
  capabilities?: string[];
  is_available: boolean;
  metadata: {
    name: string;
  };
};
