import { FilterAISettings } from '../useSettings';
import { __ } from '@wordpress/i18n';

type Toggle = {
  key: keyof FilterAISettings;
  label: string;
  help?: string;
  dependency?: keyof FilterAISettings;
};

type Prompt = {
  key: keyof FilterAISettings;
  label: string;
  defaultValue: string;
  placeholder?: string;
};

type Feature = {
  key: string;
  toggle: Toggle;
  prompt?: Prompt;
  serviceKey?: string;
};

type Section = {
  header: string;
  key: string;
  features: Feature[];
};

const defaultSettings = window?.filter_ai_default_settings || {};

export const sections: Section[] = [
  {
    header: __('Global', 'filter-ai'),
    key: 'global',
    features: [
      {
        key: 'brand_voice',
        toggle: {
          key: 'brand_voice_enabled',
          label: __('Brand voice', 'filter-ai'),
          help: __('Set your global brand voice applied to all AI-generated outputs', 'filter-ai'),
        },
        prompt: {
          key: 'brand_voice_prompt',
          label: __('Brand voice prompt', 'filter-ai'),
          defaultValue: defaultSettings.brand_voice_prompt,
          placeholder: __('Enter your own custom prompt to set your global brand voice.', 'filter-ai'),
        },
      },
      {
        key: 'stop_words',
        toggle: {
          key: 'stop_words_enabled',
          label: __('Stop words', 'filter-ai'),
          help: __(
            'Enter stop words to prevent specific words from appearing in any AI-generated outputs.',
            'filter-ai'
          ),
        },
        prompt: {
          key: 'stop_words_prompt',
          label: __('Stop words prompt', 'filter-ai'),
          defaultValue: defaultSettings.stop_words_prompt,
          placeholder: __(
            'Enter a list of comma-separated words that should not appear in any generated text.',
            'filter-ai'
          ),
        },
      },
    ],
  },
  {
    header: __('Images', 'filter-ai'),
    key: 'image',
    features: [
      {
        key: 'image_alt_text',
        serviceKey: 'image_alt_text_prompt_service',
        toggle: {
          key: 'image_alt_text_enabled',
          label: __('Image alt text', 'filter-ai'),
          help: __('Generate descriptive text about the selected image for use as the alternative text.', 'filter-ai'),
        },
        prompt: {
          key: 'image_alt_text_prompt',
          label: __('Image alt text prompt', 'filter-ai'),
          defaultValue: defaultSettings.image_alt_text_prompt,
        },
      },
      {
        key: 'auto_alt_text',
        toggle: {
          key: 'auto_alt_text_enabled',
          label: __('Auto-generate image alt text', 'filter-ai'),
          help: __('Automatically generate alt text when you upload your file.', 'filter-ai'),
          dependency: 'image_alt_text_enabled',
        },
      },
      {
        key: 'dynamic_add_alt_text',
        toggle: {
          key: 'dynamic_add_alt_text_enabled',
          label: __('Dynamically add missing alt text', 'filter-ai'),
          help: __(
            `Core WordPress doesn't update the alt text in existing content by default when updated via the Media Library.`,
            'filter-ai'
          ),
          dependency: 'image_alt_text_enabled',
        },
      },
      {
        key: 'generate_image',
        serviceKey: 'generate_image_prompt_service',
        toggle: {
          key: 'generate_image_enabled',
          label: __('Generate images', 'filter-ai'),
          help: __('Generate images within the Media Library.', 'filter-ai'),
        },
      },
    ],
  },
  {
    header: __('Post', 'filter-ai'),
    key: 'post',
    features: [
      {
        key: 'post_title',
        serviceKey: 'post_title_prompt_service',
        toggle: {
          key: 'post_title_enabled',
          label: __('Post title', 'filter-ai'),
          help: __('Generate a page title based on the post content.', 'filter-ai'),
        },
        prompt: {
          key: 'post_title_prompt',
          label: __('Post title prompt', 'filter-ai'),
          defaultValue: defaultSettings.post_title_prompt,
        },
      },
      {
        key: 'post_excerpt',
        serviceKey: 'post_excerpt_prompt_service',
        toggle: {
          key: 'post_excerpt_enabled',
          label: __('Post excerpt', 'filter-ai'),
          help: __('Generate an excerpt based on the post content.', 'filter-ai'),
        },
        prompt: {
          key: 'post_excerpt_prompt',
          label: __('Post excerpt prompt', 'filter-ai'),
          defaultValue: defaultSettings.post_excerpt_prompt,
        },
      },
      {
        key: 'post_tags',
        serviceKey: 'post_tags_prompt_service',
        toggle: {
          key: 'post_tags_enabled',
          label: __('Post tags', 'filter-ai'),
          help: __('Generate tags based on the post content.', 'filter-ai'),
        },
        prompt: {
          key: 'post_tags_prompt',
          label: __('Post tags prompt', 'filter-ai'),
          defaultValue: defaultSettings.post_tags_prompt,
        },
      },
    ],
  },
  {
    header: __('Customise Text', 'filter-ai'),
    key: 'customise_text',
    features: [
      {
        key: 'customise_text_rewrite',
        serviceKey: 'customise_text_rewrite_prompt_service',
        toggle: {
          key: 'customise_text_rewrite_enabled',
          label: __('Rewrite text', 'filter-ai'),
          help: __('Rewrite the text into a new version.', 'filter-ai'),
        },
        prompt: {
          key: 'customise_text_rewrite_prompt',
          label: __('Rewrite text prompt', 'filter-ai'),
          defaultValue: defaultSettings.customise_text_rewrite_prompt,
        },
      },
      {
        key: 'customise_text_expand',
        serviceKey: 'customise_text_expand_prompt_service',
        toggle: {
          key: 'customise_text_expand_enabled',
          label: __('Expand text', 'filter-ai'),
          help: __('Write more of the same.', 'filter-ai'),
        },
        prompt: {
          key: 'customise_text_expand_prompt',
          label: __('Expand text prompt', 'filter-ai'),
          defaultValue: defaultSettings.customise_text_expand_prompt,
        },
      },
      {
        key: 'customise_text_condense',
        serviceKey: 'customise_text_condense_prompt_service',
        toggle: {
          key: 'customise_text_condense_enabled',
          label: __('Condense text', 'filter-ai'),
          help: __('Reduce the text into a shorter version.', 'filter-ai'),
        },
        prompt: {
          key: 'customise_text_condense_prompt',
          label: __('Condense text prompt', 'filter-ai'),
          defaultValue: defaultSettings.customise_text_condense_prompt,
        },
      },
      {
        key: 'customise_text_summarise',
        serviceKey: 'customise_text_summarise_prompt_service',
        toggle: {
          key: 'customise_text_summarise_enabled',
          label: __('Summarise text', 'filter-ai'),
          help: __('Generate a separate summary of the content.', 'filter-ai'),
        },
        prompt: {
          key: 'customise_text_summarise_prompt',
          label: __('Summarise text prompt', 'filter-ai'),
          defaultValue: defaultSettings.customise_text_summarise_prompt,
        },
      },
      {
        key: 'customise_text_change_tone',
        serviceKey: 'customise_text_change_tone_prompt_service',
        toggle: {
          key: 'customise_text_change_tone_enabled',
          label: __('Change the tone of the text', 'filter-ai'),
          help: __('Update the way the words come across.', 'filter-ai'),
        },
        prompt: {
          key: 'customise_text_change_tone_prompt',
          label: __('Change tone of text prompt', 'filter-ai'),
          defaultValue: defaultSettings.customise_text_change_tone_prompt,
        },
      },
    ],
  },
  {
    header: __('FAQ', 'filter-ai'),
    key: 'faq',
    features: [
      {
        key: 'generate_faq_section',
        serviceKey: 'generate_faq_section_prompt_service',
        toggle: {
          key: 'generate_faq_section_enabled',
          label: __('Generate FAQ section', 'filter-ai'),
          help: __('Generate a FAQ section based on the post content.', 'filter-ai'),
        },
        prompt: {
          key: 'generate_faq_section_prompt',
          label: __('Generate FAQ section prompt', 'filter-ai'),
          defaultValue: defaultSettings.generate_faq_section_prompt,
        },
      },
    ],
  },
  {
    header: __('WooCommerce', 'filter-ai'),
    key: 'wc',
    features: [
      {
        key: 'wc_product_description',
        serviceKey: 'wc_product_description_prompt_service',
        toggle: {
          key: 'wc_product_description_enabled',
          label: __('Product description', 'filter-ai'),
          help: __('Generate the product description.', 'filter-ai'),
        },
        prompt: {
          key: 'wc_product_description_prompt',
          label: __('Product description prompt', 'filter-ai'),
          defaultValue: defaultSettings.wc_product_description_prompt,
        },
      },
      {
        key: 'wc_product_excerpt',
        serviceKey: 'wc_product_excerpt_prompt_service',
        toggle: {
          key: 'wc_product_excerpt_enabled',
          label: __('Product short description', 'filter-ai'),
          help: __('Generate the product short description.', 'filter-ai'),
        },
        prompt: {
          key: 'wc_product_excerpt_prompt',
          label: __('Product short description prompt', 'filter-ai'),
          defaultValue: defaultSettings.wc_product_excerpt_prompt,
        },
      },
    ],
  },
  {
    header: __('Yoast SEO', 'filter-ai'),
    key: 'yoast_seo',
    features: [
      {
        key: 'yoast_seo_title',
        serviceKey: 'yoast_seo_title_prompt_service',
        toggle: {
          key: 'yoast_seo_title_enabled',
          label: __('Yoast SEO title', 'filter-ai'),
          help: __('Generate the SEO title.', 'filter-ai'),
        },
        prompt: {
          key: 'yoast_seo_title_prompt',
          label: __('Yoast SEO title prompt', 'filter-ai'),
          defaultValue: defaultSettings.yoast_seo_title_prompt,
        },
      },
      {
        key: 'yoast_seo_meta_description',
        serviceKey: 'yoast_seo_meta_description_prompt_service',
        toggle: {
          key: 'yoast_seo_meta_description_enabled',
          label: __('Yoast SEO meta description', 'filter-ai'),
          help: __('Generate the SEO meta description.', 'filter-ai'),
        },
        prompt: {
          key: 'yoast_seo_meta_description_prompt',
          label: __('Yoast SEO meta description prompt', 'filter-ai'),
          defaultValue: defaultSettings.yoast_seo_meta_description_prompt,
        },
      },
    ],
  },
];
