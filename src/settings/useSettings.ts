import { useDispatch } from '@wordpress/data';

export type FilterAISettings = {
  image_alt_text_enabled?: boolean;
  image_alt_text_prompt?: string;

  post_title_enabled?: boolean;
  post_title_prompt?: string;

  post_excerpt_enabled?: boolean;
  post_excerpt_prompt?: string;
};

const settingsKey = 'filter_ai_settings';

export const useSettings = () => {
  const { record, isResolving } = window.wp.coreData.useEntityRecord('root', 'site');

  const { saveEntityRecord } = useDispatch('core');

  const saveSettings = async (newSettings: FilterAISettings) => {
    if (!newSettings) {
      return;
    }

    return saveEntityRecord('root', 'site', {
      [settingsKey]: newSettings,
    });
  };

  return { settings: record?.[settingsKey], isLoading: isResolving, saveSettings };
};
