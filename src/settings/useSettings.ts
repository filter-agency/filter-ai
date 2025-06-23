import { useDispatch, useSelect } from '@wordpress/data';

const defaultSettings = {
  auto_alt_text_enabled: true,

  image_alt_text_enabled: true,
  image_alt_text_prompt: '',

  post_title_enabled: true,
  post_title_prompt: '',

  post_excerpt_enabled: true,
  post_excerpt_prompt: '',

  post_tags_enabled: true,
  post_tags_prompt: '',

  customise_text_rewrite_enabled: true,
  customise_text_rewrite_prompt: '',

  customise_text_expand_enabled: true,
  customise_text_expand_prompt: '',

  customise_text_condense_enabled: true,
  customise_text_condense_prompt: '',

  customise_text_summarise_enabled: true,
  customise_text_summarise_prompt: '',

  customise_text_change_tone_enabled: true,
  customise_text_change_tone_prompt: '',

  wc_product_description_enabled: true,
  wc_product_description_prompt: '',

  wc_product_excerpt_enabled: true,
  wc_product_excerpt_prompt: '',

  yoast_seo_title_enabled: true,
  yoast_seo_title_prompt: '',

  yoast_seo_meta_description_enabled: true,
  yoast_seo_meta_description_prompt: '',
};

export type FilterAISettings = Partial<typeof defaultSettings>;

const settingsKey = 'filter_ai_settings';

export const useSettings = () => {
  const { settings } = useSelect((select) => {
    const { getEntityRecord } = select('core');

    // @ts-expect-error Property 'useEntityRecord' does not exist on type '{}'
    const record = getEntityRecord('root', 'site') || {};

    const storedSettings = record?.[settingsKey];

    if (!storedSettings) {
      return {
        settings: undefined,
      };
    }

    return {
      settings: {
        ...defaultSettings,
        ...storedSettings,
      },
    };
  }, []);

  const { saveEntityRecord } = useDispatch('core');

  const saveSettings = async (newSettings: FilterAISettings) => {
    if (!newSettings) {
      return;
    }

    return saveEntityRecord('root', 'site', {
      [settingsKey]: newSettings,
    });
  };

  return { settings, saveSettings };
};
