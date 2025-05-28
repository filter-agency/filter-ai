import { ai } from '@/utils';
import { FilterAISettings } from './useSettings';
import { __ } from '@wordpress/i18n';

type Toggle = {
  key: keyof FilterAISettings;
  label: string;
  help?: string;
};

type Prompt = {
  key: keyof FilterAISettings;
  label: string;
  placeholder: string;
};

type Feature = {
  key: string;
  toggle: Toggle;
  prompt: Prompt;
};

type Section = {
  header: string;
  key: string;
  features: Feature[];
};

export const sections: Section[] = [
  {
    header: 'Images',
    key: 'image',
    features: [
      {
        key: 'image_alt_text',
        toggle: {
          key: 'image_alt_text_enabled',
          label: __('Image alt text', 'filter-ai'),
          help: __('Generate descriptive text about the selected image for use as the alternative text.', 'filter-ai'),
        },
        prompt: {
          key: 'image_alt_text_prompt',
          label: __('Image alt text prompt', 'filter-ai'),
          placeholder: ai.prompts.image_alt_text_prompt,
        },
      },
    ],
  },
  {
    header: 'Post',
    key: 'post',
    features: [
      {
        key: 'post_title',
        toggle: {
          key: 'post_title_enabled',
          label: __('Post title', 'filter-ai'),
          help: __('Generate a page title based on the post content.', 'filter-ai'),
        },
        prompt: {
          key: 'post_title_prompt',
          label: __('Post title prompt', 'filter-ai'),
          placeholder: ai.prompts.post_title_prompt,
        },
      },
      {
        key: 'post_excerpt',
        toggle: {
          key: 'post_excerpt_enabled',
          label: __('Post excerpt', 'filter-ai'),
          help: __('Generate an excerpt based on the post content.', 'filter-ai'),
        },
        prompt: {
          key: 'post_excerpt_prompt',
          label: __('Post excerpt prompt', 'filter-ai'),
          placeholder: ai.prompts.post_excerpt_prompt,
        },
      },
      {
        key: 'post_tags',
        toggle: {
          key: 'post_tags_enabled',
          label: __('Post tags', 'filter-ai'),
          help: __('Generate tags based on the post content.', 'filter-ai'),
        },
        prompt: {
          key: 'post_tags_prompt',
          label: __('Post tags prompt', 'filter-ai'),
          placeholder: ai.prompts.post_tags_prompt,
        },
      },
    ],
  },
  {
    header: 'Customise Text',
    key: 'customise_text',
    features: [
      {
        key: 'customise_text_rewrite',
        toggle: {
          key: 'customise_text_rewrite_enabled',
          label: __('Rewrite text', 'filter-ai'),
          help: __('Rewrite the text into a new version.', 'filter-ai'),
        },
        prompt: {
          key: 'customise_text_rewrite_prompt',
          label: __('Rewrite text prompt', 'filter-ai'),
          placeholder: ai.prompts.customise_text_rewrite_prompt,
        },
      },
      {
        key: 'customise_text_expand',
        toggle: {
          key: 'customise_text_expand_enabled',
          label: __('Expand text', 'filter-ai'),
          help: __('Write more of the same.', 'filter-ai'),
        },
        prompt: {
          key: 'customise_text_expand_prompt',
          label: __('Expand text prompt', 'filter-ai'),
          placeholder: ai.prompts.customise_text_expand_prompt,
        },
      },
      {
        key: 'customise_text_condense',
        toggle: {
          key: 'customise_text_condense_enabled',
          label: __('Condense text', 'filter-ai'),
          help: __('Reduce the text into a shorter version.', 'filter-ai'),
        },
        prompt: {
          key: 'customise_text_condense_prompt',
          label: __('Condense text prompt', 'filter-ai'),
          placeholder: ai.prompts.customise_text_condense_prompt,
        },
      },
      {
        key: 'customise_text_summarise',
        toggle: {
          key: 'customise_text_summarise_enabled',
          label: __('Summarise text', 'filter-ai'),
          help: __('Generate a separate summary of the content.', 'filter-ai'),
        },
        prompt: {
          key: 'customise_text_summarise_prompt',
          label: __('Summarise text prompt', 'filter-ai'),
          placeholder: ai.prompts.customise_text_summarise_prompt,
        },
      },
      {
        key: 'customise_text_change_tone',
        toggle: {
          key: 'customise_text_change_tone_enabled',
          label: __('Change the tone of the text', 'filter-ai'),
          help: __('Update the way the words come across.', 'filter-ai'),
        },
        prompt: {
          key: 'customise_text_change_tone_prompt',
          label: __('Change tone of text prompt', 'filter-ai'),
          placeholder: ai.prompts.customise_text_change_tone_prompt,
        },
      },
    ],
  },
  {
    header: 'WooCommerce',
    key: 'wc',
    features: [
      {
        key: 'wc_product_description',
        toggle: {
          key: 'wc_product_description_enabled',
          label: __('Product description', 'filter-ai'),
          help: __('Generate the product description.', 'filter-ai'),
        },
        prompt: {
          key: 'wc_product_description_prompt',
          label: __('Product description prompt', 'filter-ai'),
          placeholder: ai.prompts.wc_product_description_prompt,
        },
      },
      {
        key: 'wc_product_excerpt',
        toggle: {
          key: 'wc_product_excerpt_enabled',
          label: __('Product short description', 'filter-ai'),
          help: __('Generate the product short description.', 'filter-ai'),
        },
        prompt: {
          key: 'wc_product_excerpt_prompt',
          label: __('Product short description prompt', 'filter-ai'),
          placeholder: ai.prompts.wc_product_excerpt_prompt,
        },
      },
    ],
  },
];
