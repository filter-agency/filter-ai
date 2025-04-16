import { ai, t } from '@/utils';
import { FilterAISettings } from './useSettings';

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
          label: t('Image alt text'),
          help: t('Generate descriptive text about the selected image for use as the alternative text.'),
        },
        prompt: {
          key: 'image_alt_text_prompt',
          label: t('Image alt text prompt'),
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
          label: t('Post Title'),
          help: t('Generate a page title based on the post content.'),
        },
        prompt: {
          key: 'post_title_prompt',
          label: t('Post Title Prompt'),
          placeholder: ai.prompts.post_title_prompt,
        },
      },
      {
        key: 'post_excerpt',
        toggle: {
          key: 'post_excerpt_enabled',
          label: t('Post Excerpt'),
          help: t('Generate an excerpt based on the post content.'),
        },
        prompt: {
          key: 'post_excerpt_prompt',
          label: t('Post Excerpt Prompt'),
          placeholder: ai.prompts.post_excerpt_prompt,
        },
      },
      {
        key: 'post_tags',
        toggle: {
          key: 'post_tags_enabled',
          label: t('Post Tags'),
          help: t('Generate tags based on the post content.'),
        },
        prompt: {
          key: 'post_tags_prompt',
          label: t('Post Tags Prompt'),
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
          label: t('Rewrite text'),
          help: t('Rewrite the text into a new version.'),
        },
        prompt: {
          key: 'customise_text_rewrite_prompt',
          label: t('Rewrite text prompt'),
          placeholder: ai.prompts.customise_text_rewrite_prompt,
        },
      },
      {
        key: 'customise_text_expand',
        toggle: {
          key: 'customise_text_expand_enabled',
          label: t('Expand text'),
          help: t('Write more of the same.'),
        },
        prompt: {
          key: 'customise_text_expand_prompt',
          label: t('Expand text prompt'),
          placeholder: ai.prompts.customise_text_expand_prompt,
        },
      },
      {
        key: 'customise_text_condense',
        toggle: {
          key: 'customise_text_condense_enabled',
          label: t('Condense text'),
          help: t('Reduce the text into a shorter version.'),
        },
        prompt: {
          key: 'customise_text_condense_prompt',
          label: t('Condense text prompt'),
          placeholder: ai.prompts.customise_text_condense_prompt,
        },
      },
      {
        key: 'customise_text_summarise',
        toggle: {
          key: 'customise_text_summarise_enabled',
          label: t('Summarise text'),
          help: t('Generate a separate summary of the content.'),
        },
        prompt: {
          key: 'customise_text_summarise_prompt',
          label: t('Summarise text prompt'),
          placeholder: ai.prompts.customise_text_summarise_prompt,
        },
      },
      {
        key: 'customise_text_change_tone',
        toggle: {
          key: 'customise_text_change_tone_enabled',
          label: t('Change the tone of the text'),
          help: t('Update the way the words come across.'),
        },
        prompt: {
          key: 'customise_text_change_tone_prompt',
          label: t('Change tone of text prompt'),
          placeholder: ai.prompts.customise_text_change_tone_prompt,
        },
      },
    ],
  },
];
